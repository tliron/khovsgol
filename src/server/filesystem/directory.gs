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
        
        class Node
            construct(enumerator: FileEnumerator, album: Album, tracks: list of Track)
                self.enumerator = enumerator
                self.album = album
                self.tracks = tracks
        
            enumerator: FileEnumerator?
            album: Album
            tracks: list of Track
        
        def private do_scan(): bool
            _logger.messagef("Started scanning: %s", path)
            
            var libraries = crucible.libraries
            var library_name = library.name
            var sortables = new Sortables()
            count: uint = 0
            var timer = new Timer()

            
            try
                libraries.begin()

                _logger.messagef("Phase 1: Pruning deleted albums: %s", path)

                for var album_path in libraries.iterate_album_paths(path)
                    // Should we stop scanning?
                    if AtomicInt.get(ref _is_scan_stopping) == 1
                        _logger.messagef("Scanning aborted: %s", path)
                        break

                    if not File.new_for_path(album_path).query_exists()
                        // Note: this will also delete all associated tracks and track pointers
                        libraries.delete_album(album_path)
                        _logger.infof("Pruned album: %s", album_path)

                    batch(libraries, ref count)

                _logger.messagef("Phase 2: Pruning deleted tracks: %s", path)

                for var track_path in libraries.iterate_track_paths(path)
                    // Should we stop scanning?
                    if AtomicInt.get(ref _is_scan_stopping) == 1
                        _logger.messagef("Scanning aborted: %s", path)
                        break

                    var file = File.new_for_path(track_path)
                    if not file.query_exists()
                        // Note: this will also delete associated track pointers
                        libraries.delete_track(track_path)
                        _logger.infof("Pruned track: %s", track_path)
                        
                        // Renaming a file will *not* change the timestamp of the containing directory,
                        // but we want to make sure that we rescan it in phase 3, so we need to reset
                        // all stored timestamps for the directory hierarchy
                        var parent = file.get_parent()
                        while parent is not null
                            libraries.delete_timestamp(parent.get_path())
                            parent = parent.get_parent()

                    batch(libraries, ref count)

                pass
            except e: GLib.Error
                _logger.exception(e)
            finally
                try
                    libraries.commit()
                except e: GLib.Error
                    _logger.exception(e)

            _logger.messagef("Phase 3: Adding tracks and albums: %s", path)

            enumerator: FileEnumerator? = null
            info: FileInfo? = null

            var album = new Album()
            album.path = path
            album.library = library_name
            album.album_type = AlbumType.ARTIST

            var tracks = new list of Track

            var stack = new Gee.LinkedList of Node

            try
                libraries.begin()
                
                enumerator = File.new_for_path(path).enumerate_children(FILE_ATTRIBUTES, FileQueryInfoFlags.NONE)
                _logger.debugf("Switched to: %s", enumerator.get_container().get_path())

                while true
                    // Should we stop scanning?
                    if AtomicInt.get(ref _is_scan_stopping) == 1
                        _logger.messagef("Scanning aborted: %s", path)
                        break

                    info = enumerator.next_file()
                    
                    // Have we finished enumerating files in this directory?
                    if info is null
                        // Make sure the album has tracks
                        if (album is not null) and not tracks.is_empty
                            // Ensure that artist albums have an artist
                            if album.album_type == AlbumType.ARTIST
                                var artist = album.artist
                                if (artist is null) || (artist.length == 0)
                                    album.album_type = AlbumType.COMPILATION

                            // Save album
                            libraries.save_album(album)
                            if _logger.can(LogLevelFlags.LEVEL_INFO)
                                _logger.infof("Added album: %s", album.path)

                            // Save tracks
                            var album_type = album.album_type
                            for track in tracks
                                track.album_type = album_type
                                libraries.save_track(track)
                                if _logger.can(LogLevelFlags.LEVEL_INFO)
                                    _logger.infof("Added track: %s", track.path)
                            
                        // Go back to previous node in stack
                        var node = stack.poll_tail()
                        if node is not null
                            enumerator = node.enumerator
                            album = node.album
                            tracks = node.tracks
                            if _logger.can(LogLevelFlags.LEVEL_DEBUG)
                                _logger.debugf("Moved out: %s", enumerator.get_container().get_path())
                            continue
                        else
                            break
                        
                    // Ignore hidden and unreadable files
                    if info.get_is_hidden() or not info.get_attribute_boolean(FileAttribute.ACCESS_CAN_READ)
                        continue

                    var file = enumerator.get_container().resolve_relative_path(info.get_name())
                    var file_path = file.get_path()
                    var timestamp = new DateTime.from_timeval_utc(info.get_modification_time()).to_unix()
                    var stored_timestamp = libraries.get_timestamp(file_path)

                    if timestamp > stored_timestamp
                        libraries.set_timestamp(file_path, timestamp)

                        if info.get_file_type() == FileType.DIRECTORY
                            // Put current node on stack
                            var node = new Node(enumerator, album, tracks)
                            stack.offer_tail(node)
                            
                            // New directory means new album
                            enumerator = file.enumerate_children(FILE_ATTRIBUTES, FileQueryInfoFlags.NONE)
                            album = new Album()
                            album.path = file_path
                            album.library = library_name
                            album.album_type = AlbumType.ARTIST
                            tracks = new list of Track
                            
                            if _logger.can(LogLevelFlags.LEVEL_DEBUG)
                                _logger.debugf("Moved in: %s", enumerator.get_container().get_path())
                            continue
                        
                        var taglib_file = new TagLib.File(file_path)
                        if (taglib_file is not null) and taglib_file.is_valid()
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
                            track.position_in_album = (int) tag.track
                            track.duration = (double) taglib_file.audioproperties.length
                            track.date = (int) tag.year
                            var last_dot = file_path.last_index_of_char('.')
                            if last_dot != -1
                                file_path.get_next_char(ref last_dot, null)
                                track.file_type = file_path.substring(last_dot)
                                
                            tracks.add(track)

                            if album is not null
                                if album.title is null
                                    album.title = track.album
                                    album.title_sort = track.album_sort
                                    album.date = track.date
                                    album.file_type = track.file_type
                                
                                // If an album has tracks by more than one artist, it is a compilation
                                if album.artist != track.artist
                                    if (album.album_type == AlbumType.ARTIST) and (album.artist is null)
                                        album.artist = track.artist
                                        album.artist_sort = track.artist_sort
                                    else
                                        album.album_type = AlbumType.COMPILATION
                                        album.artist = null
                                        album.artist_sort = null

                    batch(libraries, ref count)

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
                for var node in stack
                    try
                        node.enumerator.close()
                    except e: GLib.Error
                        _logger.exception(e)

            timer.stop()
            var seconds = timer.elapsed()
            _logger.messagef("Scanning ended: %s (%.2f seconds, %u operations)", path, seconds, count)

            // We've stopped scanning
            AtomicInt.set(ref _is_scanning, 0)
            AtomicInt.set(ref _is_scan_stopping, 0)
            return true

        const private FILE_ATTRIBUTES: string = FileAttribute.STANDARD_NAME + "," + FileAttribute.STANDARD_TYPE + "," + FileAttribute.STANDARD_IS_HIDDEN + "," + FileAttribute.ACCESS_CAN_READ + "," + FileAttribute.TIME_MODIFIED
        const private BATCH_SIZE: uint = 200

        _logger: static Logging.Logger

        def private static batch(libraries: Libraries, ref count: uint) raises GLib.Error
            if ++count % BATCH_SIZE == 0
                libraries.commit()
                _logger.debugf("Batch commit: %u", count)
                
                // This gives an opportunity for other threads to access the database
                Thread.usleep(1)
                
                libraries.begin()
    
        init
            _logger = Logging.get_logger("khovsgol.directory")
