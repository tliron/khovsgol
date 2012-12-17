[indent=4]

namespace Logging

    /*
     * Delegates to the parent logger's appender.
     */
    class DefaultAppender: Appender
        construct(logger: Logger)
            _parent = logger.get_parent()
            deepest_level = LogLevelFlags.LEVEL_DEBUG
        
        def override can(level: LogLevelFlags): bool
            var appender = _parent.appender
            if appender is not null
                return appender.can(level)
            else
                return false

        def override handle(domain: string?, levels: LogLevelFlags, message: string)
            // Note: GLib does not allow us to call log functions from within handlers,
            // so we must call the parent handler directly
            var appender = _parent.appender
            if (appender is not null) and ((appender.levels & levels) != 0)
                appender.handle(domain, levels, message)
        
        _parent: Logger

    /*
     * Renders log messages into lines of text and appends them to a
     * stream.
     */
    class StreamAppender: Appender
        prop stream: unowned FileStream = stdout
        prop renderer: Renderer? = new ColorFormatRenderer()

        def override handle(domain: string?, levels: LogLevelFlags, message: string)
            if renderer is not null
                var rendered = renderer.render(domain, levels, message)
                if rendered is not null
                    if _stream is not null
                        _stream.puts(rendered)
                        _stream.putc('\n')
                        _stream.flush()
    
    /*
     * Renders log messages into lines of text and appends them to a
     * stream.
     */
    class OutputStreamAppender: Appender
        prop stream: OutputStream
        prop renderer: Renderer? = new FormatRenderer()

        def override handle(domain: string?, levels: LogLevelFlags, message: string)
            if renderer is not null
                var rendered = renderer.render(domain, levels, message)
                if rendered is not null
                    try
                        if _stream is not null
                            _stream.write(rendered.data)
                            _stream.write(NEWLINE)
                            _stream.flush()
                    except e: Error
                        stderr.printf("Error writing log message to stream: %s\n", e.message)
        
        const NEWLINE: array of uint8 = {'\n'}

    /*
     * A file stream appender that handles automatic rolling of log
     * files.
     */
    class FileAppender: OutputStreamAppender
        prop max_file_size: int = 1000000 // 1MB
        prop max_older_files: int = 10
        prop readonly file: File

        def set_file(file: File?) raises Error
            _file = file
            stream = null
            if _file is not null
                stream = _file.append_to(FileCreateFlags.NONE)
        
        def set_path(path: string) raises Error
            set_file(File.new_for_path(path))

        def override handle(domain: string?, levels: LogLevelFlags, message: string)
            // If the file has moved away, make sure to reopen the
            // stream
            if (_file is not null) and not _file.query_exists()
                try
                    set_file(_file)
                except e: Error
                    stderr.printf("Error reopening log file: %s\n", e.message)
                    
            super.handle(domain, levels, message)
            
            try
                if _file is not null
                    roll()
            except e: Error
                stderr.printf("Error rolling log file: %s\n", e.message)
                
        def roll() raises Error
            var info = _file.query_info(FILE_ATTRIBUTES, FileQueryInfoFlags.NONE)
            
            // Is our file too big?
            var size = info.get_size()
            if size > _max_file_size
                // Enumerate the current older files
                var directory = _file.get_parent()
                if directory is not null
                    var prefix = info.get_name() + "."
                    var enumerator = directory.enumerate_children(FileAttribute.STANDARD_NAME, FileQueryInfoFlags.NONE)
                    info = enumerator.next_file()
                    var olders = new list of int
                    while info is not null
                        var name = info.get_name()
                        // Does this file have our prefix?
                        if (name.length != prefix.length) and name.has_prefix(prefix)
                            var suffix = name.slice(prefix.length, name.length)
                            var older = int.parse(suffix)
                            // Make sure that this file follows the naming rules
                            if (older > 0) and (name == prefix + older.to_string())
                                olders.add(older)
                        info = enumerator.next_file()
                    
                    new_older: int = 1
                    
                    if not olders.is_empty
                        olders.sort()
                        start: int = 0
                        
                        // Too many older files?
                        if olders.size > _max_older_files - 1
                            // Delete first older file
                            var file = directory.get_child(prefix + olders.first().to_string())
                            file.delete()
                            start = 1

                            // Delete the extra older files
                            var last = olders.size - 1
                            for var p = _max_older_files to last
                                var older = olders[p]
                                file = directory.get_child(prefix + older.to_string())
                                file.delete()
                        
                        // Rename the older files in order
                        position: int = 1
                        var last = min(_max_older_files - 1, olders.size - 1)
                        for var p = start to last
                            var older = olders[p]
                            if older != position
                                var file = directory.get_child(prefix + older.to_string())
                                var new_file = directory.get_child(prefix + position.to_string())
                                file.move(new_file, FileCopyFlags.OVERWRITE)
                            position++
                            
                        new_older = position
                    
                    // Make sure stream is closed    
                    stream.close()
                    stream = null
                    
                    // Rename current file to be next older file
                    var new_file = directory.get_child(prefix + new_older.to_string())
                    _file.move(new_file, FileCopyFlags.NONE)
                    
                    // Re-open stream
                    set_file(_file)

        const private FILE_ATTRIBUTES: string = FileAttribute.STANDARD_SIZE + "," + FileAttribute.STANDARD_NAME

        def private static min(a: int, b: int): int
            return a < b ? a : b
