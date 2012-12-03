[indent=4]

namespace Khovsgol.Filesystem

    def to_sortable(text: string): string
        return text
    
    class Directory: Khovsgol.Directory
        prop override readonly is_scanning: bool
            get
                return AtomicInt.get(ref _is_scanning) == 1

        def override scan()
            AtomicInt.set(ref _is_scan_stopping, 0)
            AtomicInt.set(ref _is_scanning, 1)
            _scan_thread = new Thread of bool("DirectoryScan:%s".printf(path), do_scan)
        
        def abort(block: bool = false)
            AtomicInt.set(ref _is_scan_stopping, 1)
            if block
                _scan_thread.join()

        _scan_thread: Thread of bool

        // The following should only be accessed atomically
        _is_scan_stopping: int
        _is_scanning: int

        def private do_scan(): bool
            _logger.messagef("Started scanning: %s", path)
            
            var enumerators = new Gee.LinkedList of FileEnumerator
            enumerator: FileEnumerator? = null
            info: FileInfo? = null
            album: Album? = null
            count: int = 0
            var libraries = crucible.libraries
            var timer = new Timer()
            try
                enumerator = File.new_for_path(path).enumerate_children(FileAttribute.STANDARD_NAME + "," + FileAttribute.TIME_MODIFIED, FileQueryInfoFlags.NONE)
                _logger.debugf("Switched to: %s", enumerator.get_container().get_path())

                libraries.begin()
                
                while enumerator is not null
                    info = enumerator.next_file()
                    
                    if info is null
                        if album is not null
                            crucible.libraries.save_album(album)
                            _logger.infof("Album: %s", album.path)
                            album = null
                    
                        enumerator = enumerators.poll_tail()
                        if enumerator is not null
                            _logger.debugf("Moved out: %s", enumerator.get_container().get_path())
                        continue

                    var file = enumerator.get_container().resolve_relative_path(info.get_name())
                    var path = file.get_path()
                    
                    if info.get_file_type() == FileType.DIRECTORY
                        album = new Album()
                        album.path = path
                        album.library = library.name
                        album.compilation_type = CompilationType.NOT

                        enumerators.offer_tail(enumerator)
                        enumerator = file.enumerate_children(FileAttribute.STANDARD_NAME + "," + FileAttribute.TIME_MODIFIED, FileQueryInfoFlags.NONE)
                        _logger.debugf("Moved in: %s", enumerator.get_container().get_path())
                        continue
                        
                    var timestamp = new DateTime.from_timeval_utc(info.get_modification_time()).to_unix()
                    var stored_timestamp = crucible.libraries.get_timestamp(path)
                    
                    if timestamp > stored_timestamp
                        crucible.libraries.set_timestamp(path, timestamp)
                        
                        var taglib_file = new TagLib.File(path)
                        if (taglib_file is not null) && taglib_file.is_valid()
                            tag: unowned TagLib.Tag = taglib_file.tag
                            
                            var track = new Track()
                            track.path = file.get_path()
                            track.library = library.name
                            track.title = tag.title
                            track.title_sort = to_sortable(track.title)
                            track.artist = tag.artist
                            track.artist_sort = to_sortable(track.artist)
                            track.album = tag.album
                            track.album_sort = to_sortable(track.album)
                            track.position = (int) tag.track
                            track.duration = (double) taglib_file.audioproperties.length
                            track.date = (int) tag.year
                            var last_dot = path.last_index_of_char('.')
                            if last_dot != -1
                                path.get_next_char(ref last_dot, null)
                                track.file_type = path.substring(last_dot)

                            crucible.libraries.save_track(track)
                            _logger.infof("Track: %s", path)

                            if ++count % 500 == 0
                                libraries.commit()
                                libraries.begin()

                            if album is not null
                                album.title = track.album
                                album.title_sort = track.album_sort
                                if album.artist != track.artist
                                    if (album.compilation_type == CompilationType.NOT) && (album.artist is null)
                                        album.artist = track.artist
                                        album.artist_sort = track.artist_sort
                                    else
                                        album.compilation_type = CompilationType.COMPILATION
                                        album.artist = null
                                        album.artist_sort = null
                                album.date = track.date
                                album.file_type = track.file_type

                    // Should we stop scanning?
                    if AtomicInt.get(ref _is_scan_stopping) == 1
                        _logger.messagef("Scanning aborted: %s", path)
                        break
                        
            except e: GLib.Error
                _logger.warning(e.message)
            finally
                try
                    libraries.commit()
                except e: GLib.Error
                    _logger.warning(e.message)
                
                // Close remaining enumerators
                if enumerator is not null
                    try
                        enumerator.close()
                    except e: GLib.Error
                        _logger.warning(e.message)
                for var e in enumerators
                    try
                        e.close()
                    except e: GLib.Error
                        _logger.warning(e.message)

            timer.stop()
            var seconds = timer.elapsed()
            _logger.messagef("Scanning ended: %s (%f seconds)", path, seconds)
            
            // We've stopped scanning
            AtomicInt.set(ref _is_scanning, 0)
            AtomicInt.set(ref _is_scan_stopping, 0)
            return true
        
        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.directory")
