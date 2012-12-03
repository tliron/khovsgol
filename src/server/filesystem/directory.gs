[indent=4]

namespace Khovsgol.Filesystem
    
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
            try
                enumerator = File.new_for_path(path).enumerate_children(FileAttribute.STANDARD_NAME + "," + FileAttribute.TIME_MODIFIED, FileQueryInfoFlags.NONE)
                _logger.debugf("Switched to: %s", enumerator.get_container().get_path())
                
                while enumerator is not null
                    info = enumerator.next_file()
                    
                    if info is null
                        enumerator = enumerators.poll_tail()
                        if enumerator is not null
                            _logger.debugf("Moved out: %s", enumerator.get_container().get_path())
                        continue

                    var file = enumerator.get_container().resolve_relative_path(info.get_name())
                    var path = file.get_path()
                    
                    if info.get_file_type() == FileType.DIRECTORY
                        enumerators.offer_tail(enumerator)
                        enumerator = file.enumerate_children(FileAttribute.STANDARD_NAME + "," + FileAttribute.TIME_MODIFIED, FileQueryInfoFlags.NONE)
                        _logger.debugf("Moved in: %s", enumerator.get_container().get_path())
                        continue

                    if was_modified(path, info)
                        update_timestamp(path, info)
                        
                        var taglib_file = new TagLib.File(path)
                        if (taglib_file is not null) && taglib_file.is_valid()
                            tag: unowned TagLib.Tag = taglib_file.tag
                            
                            var album = new Album()
                            album.path = file.get_path()
                            album.title = tag.album
                            
                            var track = new Track()
                            track.title = tag.title
                            track.artist = tag.artist
                            track.date = (int) tag.year
                            track.position = (int) tag.track

                    // Should we stop scanning?
                    if AtomicInt.get(ref _is_scan_stopping) == 1
                        _logger.messagef("Scanning aborted: %s", path)
                        break
                        
            except e: GLib.Error
                _logger.warning(e.message)
            finally
                // Close remaining enumerators
                if enumerator is not null
                    try
                        enumerator.close()
                    except e: GLib.Error
                        pass
                for var e in enumerators
                    try
                        e.close()
                    except e: GLib.Error
                        pass

            _logger.messagef("Scanning ended: %s", path)
            
            // We've stopped scanning
            AtomicInt.set(ref _is_scanning, 0)
            AtomicInt.set(ref _is_scan_stopping, 0)
            return true
        
        def private was_modified(path: string, info: FileInfo): bool raises GLib.Error
            var current = new DateTime.from_timeval_utc(info.get_modification_time()).to_unix()
            var stored = crucible.libraries.get_timestamp(path)
            return current > stored

        def private update_timestamp(path: string, info: FileInfo) raises GLib.Error
            var current = new DateTime.from_timeval_utc(info.get_modification_time()).to_unix()
            crucible.libraries.set_timestamp(path, current)
            _logger.debugf("Updated timestamp: %s, %lld", path, current)

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.directory")
