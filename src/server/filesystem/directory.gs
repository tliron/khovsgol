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
            var library_name = library.name
            var sortables = new Sortables()
            var timer = new Timer()

            info: FileInfo? = null
            enumerator: FileEnumerator? = null
            var stack = new Gee.LinkedList of Node
            
            try
                // Note: renaming a file deletes the path, but will *not* change the timestamp of the
                // containing directory; we want to make sure that we rescan it in phase 3, so we need
                // to reset stored timestamps for the directory hierarchy; see reset_parents()

                _logger.messagef("Phase 1: Pruning deleted albums: %s", path)
                
                var files_to_delete = new list of File
                for var album_path in libraries.iterate_album_paths(path)
                    // Should we stop scanning?
                    if AtomicInt.get(ref _is_scan_stopping) == 1
                        _logger.messagef("Scanning aborted: %s", path)
                        break

                    var file = File.new_for_path(album_path)
                    if not file.query_exists()
                        files_to_delete.add(file)
                        _logger.infof("Pruning album: %s", album_path)
                
                // Note: this will also delete all associated tracks and track pointers
                if not files_to_delete.is_empty
                    libraries.write_begin()
                    for var file in files_to_delete
                        // Should we stop scanning?
                        if AtomicInt.get(ref _is_scan_stopping) == 1
                            _logger.messagef("Scanning aborted: %s", path)
                            break

                        libraries.delete_album(file.get_path())
                        reset_parents(file, libraries)
                    libraries.write_commit()

                _logger.messagef("Phase 2: Pruning deleted tracks, updating changed tracks and albums: %s", path)

                files_to_delete = new list of File
                var files_to_update = new list of File
                var timestamps = new list of Timestamp
                current_album_path: string? = null
                for var track_path in libraries.iterate_track_paths(path)
                    // Should we stop scanning?
                    if AtomicInt.get(ref _is_scan_stopping) == 1
                        _logger.messagef("Scanning aborted: %s", path)
                        break

                    var file = File.new_for_path(track_path)
                    if not file.query_exists()
                        // Note: this will also delete associated track pointers
                        files_to_delete.add(file)
                        _logger.infof("Pruning track: %s", track_path)
                    else
                        // Check timestamp
                        info = file.query_info(FileAttribute.TIME_MODIFIED, FileQueryInfoFlags.NONE)
                        var timestamp = new DateTime.from_timeval_utc(info.get_modification_time()).to_unix()
                        var stored_timestamp = libraries.get_timestamp(track_path)
                        if timestamp > stored_timestamp
                            timestamps.add(new Timestamp(track_path, timestamp))
                            files_to_update.add(file)
                            _logger.infof("Updating track: %s", track_path)
                            
                if not files_to_delete.is_empty
                    libraries.write_begin()
                    for var file in files_to_delete
                        // Should we stop scanning?
                        if AtomicInt.get(ref _is_scan_stopping) == 1
                            _logger.messagef("Scanning aborted: %s", path)
                            break

                        libraries.delete_track(file.get_path())
                        reset_parents(file, libraries)
                    libraries.write_commit()

                // Update timestamps
                if not timestamps.is_empty
                    libraries.write_begin()
                    for var timestamp in timestamps
                        // Should we stop scanning?
                        if AtomicInt.get(ref _is_scan_stopping) == 1
                            _logger.messagef("Scanning aborted: %s", path)
                            break

                        libraries.set_timestamp(timestamp.path, timestamp.timestamp)
                    libraries.write_commit()

                if not files_to_update.is_empty
                    libraries.write_begin()
                    for var file in files_to_update
                        var track_path = file.get_path()
                    
                        // Should we stop scanning?
                        if AtomicInt.get(ref _is_scan_stopping) == 1
                            _logger.messagef("Scanning aborted: %s", path)
                            break

                        // Update changed file
                        var track = create_track(track_path, sortables)
                        if track is not null
                            libraries.save_track(track)
                            
                            // Might need to update album, too
                            var album_path = file.get_parent().get_path()
                            if album_path != current_album_path
                                current_album_path = album_path
                                var album = libraries.get_album(current_album_path)
                                if album is not null
                                    if (album.title != track.album) or (album.artist != track.artist) or (album.date != track.date) or (album.file_type != track.file_type)
                                        if (album.album_type == AlbumType.ARTIST) and (album.artist != track.artist)
                                            album.album_type = AlbumType.COMPILATION
                                    
                                        album.title = track.album
                                        album.title_sort = track.album_sort
                                        album.artist = track.artist
                                        album.artist_sort = track.artist_sort
                                        album.date = track.date
                                        album.file_type = track.file_type
                                        libraries.save_album(album)
                                        _logger.infof("Updated album: %s", current_album_path)
                                        
                                        // TODO: a changed album might have become an artist album! we need to somehow verify this
                    libraries.write_commit()
                    
                _logger.messagef("Phase 3: Adding new tracks and albums: %s", path)

                enumerator = File.new_for_path(path).enumerate_children(FILE_ATTRIBUTES, FileQueryInfoFlags.NONE)

                var album = new Album()
                album.path = path
                album.library = library_name
                album.album_type = AlbumType.ARTIST
                var tracks = new list of Track
                timestamps = new list of Timestamp

                _logger.debugf("Switched to: %s", enumerator.get_container().get_path())

                while true
                    // Should we stop scanning?
                    if AtomicInt.get(ref _is_scan_stopping) == 1
                        _logger.messagef("Scanning aborted: %s", path)
                        break

                    info = enumerator.next_file()
                    
                    // Have we finished enumerating files in this directory?
                    if info is null
                        libraries.write_begin()
                        
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

                        // Update timestamps
                        if not timestamps.is_empty
                            for var timestamp in timestamps
                                // Should we stop scanning?
                                if AtomicInt.get(ref _is_scan_stopping) == 1
                                    _logger.messagef("Scanning aborted: %s", path)
                                    break

                                libraries.set_timestamp(timestamp.path, timestamp.timestamp)
                            timestamps = new list of Timestamp

                        libraries.write_commit()
                            
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
                            // Nothing left on stack means we're done
                            break
                        
                    // Ignore hidden and unreadable files
                    if info.get_is_hidden() or not info.get_attribute_boolean(FileAttribute.ACCESS_CAN_READ)
                        continue

                    var file = enumerator.get_container().resolve_relative_path(info.get_name())
                    var file_path = file.get_path()
                    var timestamp = new DateTime.from_timeval_utc(info.get_modification_time()).to_unix()
                    var stored_timestamp = libraries.get_timestamp(file_path)

                    if timestamp > stored_timestamp
                        timestamps.add(new Timestamp(file_path, timestamp))

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
                                _logger.debugf("Moved into: %s", enumerator.get_container().get_path())
                            continue
                            
                        var track = create_track(file_path, sortables)
                        if track is not null
                            tracks.add(track)
                            if album is not null
                                if album.title is null
                                    // The first track we find in the album will decide the album fields
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

            except e: GLib.Error
                _logger.exception(e)
                try
                    libraries.write_commit()
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
            _logger.messagef("Scanning ended: %s (%s)", path, format_duration(seconds))

            // We've stopped scanning
            AtomicInt.set(ref _is_scanning, 0)
            AtomicInt.set(ref _is_scan_stopping, 0)
            return true

        def create_track(file_path: string, sortables: Sortables): Track?
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
                return track
            else
                return null

        class private Node
            construct(enumerator: FileEnumerator, album: Album, tracks: list of Track)
                self.enumerator = enumerator
                self.album = album
                self.tracks = tracks
        
            enumerator: FileEnumerator?
            album: Album
            tracks: list of Track
            
        class private Timestamp
            construct(path: string, timestamp: int64)
                self.path = path
                self.timestamp = timestamp
        
            path: string
            timestamp: int64
        
        const private FILE_ATTRIBUTES: string = FileAttribute.STANDARD_NAME + "," + FileAttribute.STANDARD_TYPE + "," + FileAttribute.STANDARD_IS_HIDDEN + "," + FileAttribute.ACCESS_CAN_READ + "," + FileAttribute.TIME_MODIFIED
        const private BATCH_SIZE: uint = 50

        _logger: static Logging.Logger

        def static reset_parents(file: File, libraries: Libraries) raises GLib.Error
            var parent = file.get_parent()
            while parent is not null
                libraries.delete_timestamp(parent.get_path())
                parent = parent.get_parent()
    
        init
            _logger = Logging.get_logger("khovsgol.directory")
