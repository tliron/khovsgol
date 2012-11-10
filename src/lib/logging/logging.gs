[indent=4]

namespace Logging

    /*
     * Gets a logger, creating it if it doesn't yet exist.
     * 
     * An empty string domain name signifies the root logger.
     */
    def get_logger(domain: string? = ""): Logger
        if domain is null
            domain = ""
        if _loggers is null
            _loggers = new dict of string, Logger
        var logger = _loggers[domain]
        if logger is null
            _loggers[domain] = logger = new Logger(domain)
        return logger

    /*
     * Translates LogLevelFlags to a string representation.
     */
    def get_log_level_name(level: LogLevelFlags): string
        if (level & LogLevelFlags.LEVEL_ERROR) != 0
            return "ERROR"
        else if (level & LogLevelFlags.LEVEL_CRITICAL) != 0
            return "CRITICAL"
        else if (level & LogLevelFlags.LEVEL_WARNING) != 0
            return "WARNING"
        else if (level & LogLevelFlags.LEVEL_MESSAGE) != 0
            return "MESSAGE"
        else if (level & LogLevelFlags.LEVEL_INFO) != 0
            return "INFO"
        else if (level & LogLevelFlags.LEVEL_DEBUG) != 0
            return "DEBUG"
        else
            return "NONE"

    /*
     * Translates a deepest log level to a LogLevelFlags mask including
     * all log levels before it.
     */
    def get_deepest_log_level_flags(deepest_level: LogLevelFlags): LogLevelFlags
        if deepest_level == LogLevelFlags.LEVEL_ERROR
            return LogLevelFlags.FLAG_RECURSION|LogLevelFlags.FLAG_FATAL|LogLevelFlags.LEVEL_ERROR
        else if deepest_level == LogLevelFlags.LEVEL_CRITICAL
            return LogLevelFlags.FLAG_RECURSION|LogLevelFlags.FLAG_FATAL|LogLevelFlags.LEVEL_ERROR|LogLevelFlags.LEVEL_CRITICAL
        else if deepest_level == LogLevelFlags.LEVEL_WARNING
            return LogLevelFlags.FLAG_RECURSION|LogLevelFlags.FLAG_FATAL|LogLevelFlags.LEVEL_ERROR|LogLevelFlags.LEVEL_CRITICAL|LogLevelFlags.LEVEL_WARNING
        else if deepest_level == LogLevelFlags.LEVEL_MESSAGE
            return LogLevelFlags.FLAG_RECURSION|LogLevelFlags.FLAG_FATAL|LogLevelFlags.LEVEL_ERROR|LogLevelFlags.LEVEL_CRITICAL|LogLevelFlags.LEVEL_WARNING|LogLevelFlags.LEVEL_MESSAGE
        else if deepest_level == LogLevelFlags.LEVEL_INFO
            return LogLevelFlags.FLAG_RECURSION|LogLevelFlags.FLAG_FATAL|LogLevelFlags.LEVEL_ERROR|LogLevelFlags.LEVEL_CRITICAL|LogLevelFlags.LEVEL_WARNING|LogLevelFlags.LEVEL_MESSAGE|LogLevelFlags.LEVEL_INFO
        else if deepest_level == LogLevelFlags.LEVEL_DEBUG
            return LogLevelFlags.FLAG_RECURSION|LogLevelFlags.FLAG_FATAL|LogLevelFlags.LEVEL_ERROR|LogLevelFlags.LEVEL_CRITICAL|LogLevelFlags.LEVEL_WARNING|LogLevelFlags.LEVEL_MESSAGE|LogLevelFlags.LEVEL_INFO|LogLevelFlags.LEVEL_DEBUG
        else
            return 0

    _loggers: dict of string, Logger
    
    /*
     * Friendly hierarchical logger implementation. The hierarchy is
     * defined by "." in the domain names.
     * 
     * If a handler is not defined, will default to delegating to the
     * handler of the parent logger.
     * 
     * You should *not* construct logger instances directly; use
     * get_logger() instead.
     */
    class Logger: Object
        construct(domain: string)
            _domain = domain
            _format = "%s,%.3d: %8s [%s] %s\n"
            _date_time_format = "%Y-%m-%d %H:%M:%S"

            // If we're not the root handler, default to parent handler
            if domain.length > 0
                set_parent_handler()
        
        final
            if _handle > 0
                Log.remove_handler(_domain, _handle)
            if _thread_safe
                _stream_lock.lock()
            try
                if _stream is not null
                    _stream.flush()
                    _stream.close()
            finally
                if _thread_safe
                    _stream_lock.unlock()
        
        prop readonly domain: string
        prop format: string
        prop date_time_format: string
        
        def get_parent(): Logger?
            var dot = _domain.last_index_of_char('.')
            if dot > 0
                return get_logger(_domain.slice(0, dot))
            else
                return get_logger()
            
        def log(level: LogLevelFlags, message: string, ...)
            logv(_domain, level, message, va_list())

        def error(message: string, ...)
            logv(_domain, LogLevelFlags.LEVEL_ERROR, message, va_list())

        def critical(message: string, ...)
            logv(_domain, LogLevelFlags.LEVEL_CRITICAL, message, va_list())

        def warning(message: string, ...)
            logv(_domain, LogLevelFlags.LEVEL_WARNING, message, va_list())

        def message(message: string, ...)
            logv(_domain, LogLevelFlags.LEVEL_MESSAGE, message, va_list())

        def info(message: string, ...)
            logv(_domain, LogLevelFlags.LEVEL_INFO, message, va_list())

        def debug(message: string, ...)
            logv(_domain, LogLevelFlags.LEVEL_DEBUG, message, va_list())

        def set_handler(deepest_level: LogLevelFlags, handler: LogFunc)
            _levels = get_deepest_log_level_flags(deepest_level)
            if _handle > 0
                Log.remove_handler(_domain, _handle)
            _handler = handler
            _handle = Log.set_handler(_domain, _levels, handler)
        
        def set_parent_handler()
            set_handler(LogLevelFlags.LEVEL_DEBUG, _parent_handler)
        
        def set_stream_handler(deepest_level: LogLevelFlags, stream: FileOutputStream, thread_safe: bool = true)
            _stream = stream
            _thread_safe = thread_safe
            set_handler(deepest_level, _stream_handler)

        def set_file_handler(deepest_level: LogLevelFlags, file: File, thread_safe: bool = true) raises Error
            _file = file
            set_stream_handler(deepest_level, _file.append_to(FileCreateFlags.NONE), thread_safe)
        
        def render(domain: string?, levels: LogLevelFlags, message: string): string
            var now = new DateTime.now_local()
            return format.printf(now.format(_date_time_format), now.get_microsecond() / 1000, get_log_level_name(levels), domain, message)
        
        def private _parent_handler(domain: string?, levels: LogLevelFlags, message: string)
            // Note: GLib does not allow us to call log functions from within handlers,
            // so we must call the parent handler directly
            var parent = get_parent()
            if (parent._handler is not null) && ((parent._levels & levels) != 0)
                parent._handler(domain, levels, message)
    
        def private _stream_handler(domain: string?, levels: LogLevelFlags, message: string)
            if _thread_safe
                _stream_lock.lock()
            try
                _stream.write(render(domain, levels, message).data)
                _stream.flush()
                if _file is not null
                    roll_file()
            except e: Error
                pass
            finally
                if _thread_safe
                    _stream_lock.unlock()
        
        def private roll_file()
            enumerator: FileEnumerator = null
            try
                var info = _file.query_info(FileAttribute.STANDARD_SIZE + "," + FileAttribute.STANDARD_NAME, FileQueryInfoFlags.NONE)
                
                // Is our file too big?
                var size = info.get_size()
                if size > _max_file_size
                    // Enumerate the current ordinal files
                    var prefix = info.get_name() + "."
                    var directory = _file.get_parent()
                    if directory is not null
                        enumerator = directory.enumerate_children(FileAttribute.STANDARD_NAME, FileQueryInfoFlags.NONE)
                        info = enumerator.next_file()
                        var ordinals = new list of int
                        while info is not null
                            var name = info.get_name()
                            if (name.length != prefix.length) && name.has_prefix(prefix)
                                var suffix = name.slice(prefix.length, name.length)
                                var ordinal = int.parse(suffix)
                                // Make sure that our file follows the rules
                                if ordinal > 0 && (name == prefix + ordinal.to_string())
                                    ordinals.add(ordinal)
                            info = enumerator.next_file()
                        
                        new_ordinal: int = 1
                        
                        if !ordinals.is_empty
                            ordinals.sort()
                            start: int = 0
                            
                            // Too many ordinals?
                            if ordinals.size > _max_files - 1
                                // Delete first ordinal
                                var file = directory.get_child(prefix + ordinals.first().to_string())
                                file.delete()
                                start = 1

                                // Delete the extra ordinals
                                for var p = _max_files to (ordinals.size - 1)
                                    var ordinal = ordinals[p]
                                    file = directory.get_child(prefix + ordinal.to_string())
                                    file.delete()
                            
                            // Rename the ordinals in order
                            position: int = 1
                            for var p = start to min(_max_files - 1, ordinals.size - 1)
                                var ordinal = ordinals[p]
                                if ordinal != position
                                    var file = directory.get_child(prefix + ordinal.to_string())
                                    var new_file = directory.get_child(prefix + position.to_string())
                                    file.move(new_file, FileCopyFlags.OVERWRITE)
                                position++
                                
                            new_ordinal = position
                            
                        // Move current file to new ordinal position
                        _stream.flush()
                        _stream.close()
                        var new_file = directory.get_child(prefix + new_ordinal.to_string())
                        _file.move(new_file, FileCopyFlags.NONE)
                        
                        // Re-open stream
                        _stream = _file.append_to(FileCreateFlags.NONE)
            except e: Error
                print e.message
                if enumerator is not null
                    try
                        enumerator.close()
                    except e: Error
                        pass
                        
        def private static min(a: int, b: int): int
            return a < b ? a : b

        _handle: uint = 0
        _handler: unowned LogFunc
        _levels: LogLevelFlags
        _thread_safe: bool = false
        _stream: FileOutputStream
        _stream_lock: Mutex = Mutex()
        _file: File
        _max_file_size: int = 1000
        _max_files: int = 10
