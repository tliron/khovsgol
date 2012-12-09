[indent=4]

namespace Khovsgol.Server.Filesystem

    class Directory: Khovsgol.Server.Directory
        prop override readonly is_scanning: bool
            get
                return AtomicInt.get(ref _is_scanning) == 1

        def override scan()
            AtomicInt.set(ref _is_scan_stopping, 0)
            AtomicInt.set(ref _is_scanning, 1)
            _scan_thread = new Thread of bool("DirectoryScan:%s".printf(path), do_scan)
        
        def override abort(block: bool = false)
            AtomicInt.set(ref _is_scan_stopping, 1)
            if block
                _scan_thread.join()

        _scan_thread: Thread of bool

        // The following should only be accessed atomically
        _is_scan_stopping: int
        _is_scanning: int
        
        def private do_scan(): bool
            _logger.messagef("Started scanning: %s", path)

            var libraries = crucible.libraries
            var sortables = new Sortables()
            count: uint = 0
            var timer = new Timer()

            // Phase 1: Add tracks and albums
            _logger.infof("Phase 1: Add tracks and albums: %s", path)
            
            var enumerators = new Gee.LinkedList of FileEnumerator
            var tracks = new list of Track 
            enumerator: FileEnumerator? = null
            info: FileInfo? = null
            album: Album? = null
            try
                libraries.begin()
                
                enumerator = File.new_for_path(path).enumerate_children(FILE_ATTRIBUTES, FileQueryInfoFlags.NONE)
                _logger.debugf("Switched to: %s", enumerator.get_container().get_path())

                while enumerator is not null
                    // Should we stop scanning?
                    if AtomicInt.get(ref _is_scan_stopping) == 1
                        _logger.messagef("Scanning aborted: %s", path)
                        break
                    
                    info = enumerator.next_file()
                    if info is null
                        if album is not null
                            libraries.save_album(album)
                            batch(libraries, ref count)
                            if _logger.can(LogLevelFlags.LEVEL_INFO)
                                _logger.infof("Added album: %s", album.path)

                            var album_type = album.album_type
                            for track in tracks
                                track.album_type = album_type
                                libraries.save_track(track)
                                batch(libraries, ref count)
                                if _logger.can(LogLevelFlags.LEVEL_INFO)
                                    _logger.infof("Added track: %s", track.path)
                            
                            album = null
                            tracks.clear()

                        enumerator = enumerators.poll_tail()
                        if (enumerator is not null) && _logger.can(LogLevelFlags.LEVEL_DEBUG)
                            _logger.debugf("Moved out: %s", enumerator.get_container().get_path())
                        continue
                        
                    // TODO: ignore hidden files

                    var file = enumerator.get_container().resolve_relative_path(info.get_name())
                    var file_path = file.get_path()
                    var timestamp = new DateTime.from_timeval_utc(info.get_modification_time()).to_unix()
                    var stored_timestamp = libraries.get_timestamp(file_path)
                    
                    if timestamp > stored_timestamp
                        libraries.set_timestamp(file_path, timestamp)

                        if info.get_file_type() == FileType.DIRECTORY
                            album = new Album()
                            album.path = file_path
                            album.library = library.name
                            album.album_type = AlbumType.ARTIST

                            enumerators.offer_tail(enumerator)
                            enumerator = file.enumerate_children(FILE_ATTRIBUTES, FileQueryInfoFlags.NONE)
                            if _logger.can(LogLevelFlags.LEVEL_DEBUG)
                                _logger.debugf("Moved in: %s", enumerator.get_container().get_path())
                            continue
                        
                        var taglib_file = new TagLib.File(file_path)
                        if (taglib_file is not null) && taglib_file.is_valid()
                            tag: unowned TagLib.Tag = taglib_file.tag
                            
                            var track = new Track()
                            track.path = file_path
                            track.library = library.name
                            track.title = tag.title
                            track.title_sort = sortables.@get(track.title)
                            track.artist = tag.artist
                            track.artist_sort = sortables.@get(track.artist)
                            track.album = tag.album
                            track.album_sort = sortables.@get(track.album)
                            track.position = (int) tag.track
                            track.duration = (double) taglib_file.audioproperties.length
                            track.date = (int) tag.year
                            var last_dot = file_path.last_index_of_char('.')
                            if last_dot != -1
                                file_path.get_next_char(ref last_dot, null)
                                track.file_type = file_path.substring(last_dot)
                                
                            tracks.add(track)

                            if album is not null
                                album.title = track.album
                                album.title_sort = track.album_sort
                                if album.artist != track.artist
                                    if (album.album_type == AlbumType.ARTIST) && (album.artist is null)
                                        album.artist = track.artist
                                        album.artist_sort = track.artist_sort
                                    else
                                        album.album_type = AlbumType.COMPILATION
                                        album.artist = null
                                        album.artist_sort = null
                                album.date = track.date
                                album.file_type = track.file_type
            except e: GLib.Error
                _logger.exception(e)
            finally
                if libraries is not null
                    try
                        libraries.commit()
                    except e: GLib.Error
                        _logger.exception(e)
                
                // Close remaining enumerators
                if enumerator is not null
                    try
                        enumerator.close()
                    except e: GLib.Error
                        _logger.exception(e)
                for var e in enumerators
                    try
                        e.close()
                    except e: GLib.Error
                        _logger.exception(e)
            
            try
                libraries.begin()

                // Phase 2: Delete missing albums
                _logger.infof("Phase 2: Prune missing albums: %s", path)

                for var album_path in libraries.iterate_album_paths(path)
                    // Should we stop scanning?
                    if AtomicInt.get(ref _is_scan_stopping) == 1
                        _logger.messagef("Scanning aborted: %s", path)
                        break

                    if !File.new_for_path(album_path).query_exists()
                        libraries.delete_album(album_path)
                        batch(libraries, ref count)
                        _logger.infof("Pruned album: %s", album_path)

                // Phase 3: Delete missing tracks
                _logger.infof("Phase 3: Prune missing tracks: %s", path)

                for var track_path in libraries.iterate_track_paths(path)
                    // Should we stop scanning?
                    if AtomicInt.get(ref _is_scan_stopping) == 1
                        _logger.messagef("Scanning aborted: %s", path)
                        break

                    if !File.new_for_path(track_path).query_exists()
                        libraries.delete_track(track_path)
                        batch(libraries, ref count)
                        _logger.infof("Pruned track: %s", track_path)
                
                pass
            except e: GLib.Error
                _logger.exception(e)
            finally
                try
                    libraries.commit()
                except e: GLib.Error
                    _logger.exception(e)

            timer.stop()
            var seconds = timer.elapsed()
            _logger.messagef("Scanning ended: %s (%.2f seconds, %u operations)", path, seconds, count)
            
            // We've stopped scanning
            AtomicInt.set(ref _is_scanning, 0)
            AtomicInt.set(ref _is_scan_stopping, 0)
            return true

        const private FILE_ATTRIBUTES: string = FileAttribute.STANDARD_NAME + "," + FileAttribute.TIME_MODIFIED
        const private BATCH_SIZE: uint = 200

        _logger: static Logging.Logger

        def private static batch(libraries: Libraries, ref count: uint) raises GLib.Error
            if ++count % BATCH_SIZE == 0
                libraries.commit()
                _logger.debugf("Batch commit: %u", count)
                Thread.usleep(1)
                libraries.begin()
    
        init
            _logger = Logging.get_logger("khovsgol.directory")
