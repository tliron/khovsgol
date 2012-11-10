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
            if _stream_lock is not null
                _stream_lock.lock()
                try
                    if _stream is not null
                        _stream.flush()
                        _stream.close()
                finally
                    if _stream_lock is not null
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
            if thread_safe
                _stream_lock = new Mutex()
            set_handler(deepest_level, _stream_handler)

        def set_file_handler(deepest_level: LogLevelFlags, path: string, thread_safe: bool = true) raises Error
            set_stream_handler(deepest_level, File.new_for_path(path).append_to(FileCreateFlags.NONE), thread_safe)
        
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
            if _stream_lock is not null
                _stream_lock.lock()
            try
                _stream.write(render(domain, levels, message).data)
                _stream.flush()
            except e: Error
                pass
            finally
                if _stream_lock is not null
                    _stream_lock.unlock()

        _handle: uint = 0
        _handler: LogFunc
        _levels: LogLevelFlags
        _stream: FileOutputStream
        _stream_lock: Mutex
