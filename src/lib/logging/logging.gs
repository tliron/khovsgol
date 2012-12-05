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

    /*
     * Friendly hierarchical logger implementation based on and
     * compatible with standard GLib logging. The hierarchy is defined
     * by "." in the domain names.
     * 
     * If an appender is not set, will default to delegating to the
     * appender of the parent logger.
     * 
     * You should *not* construct logger instances directly; use
     * get_logger() instead.
     */
    class Logger: Object
        construct(domain: string)
            _domain = domain

            // If we're not the root logger, use a default appender
            if domain.length > 0
                appender = new DefaultAppender(self)
        
        final
            if _handler_id > 0
                Log.remove_handler(_domain, _handler_id)
        
        prop readonly domain: string
        prop appender: Appender?
            get
                return _appender
            set
                if _handler_id > 0
                    Log.remove_handler(_domain, _handler_id)
                _appender = value
                if _appender is not null
                    _handler_id = Log.set_handler(_domain, _appender.levels, _appender.handle)
                else
                    _handler_id = 0
        
        def get_parent(): Logger?
            var dot = _domain.last_index_of_char('.')
            if dot > 0
                return get_logger(_domain.slice(0, dot))
            else
                return get_logger()
        
        def can(level: LogLevelFlags): bool
            if _appender is not null
                return _appender.can(level)
            else
                return false
        
        def log(level: LogLevelFlags, message: string)
            GLib.log(_domain, level, "%s", message)

        def logf(level: LogLevelFlags, message: string, ...)
            GLib.logv(_domain, level, message, va_list())

        def error(message: string)
            g_log(_domain, LogLevelFlags.LEVEL_ERROR, "%s", message)

        def errorf(message: string, ...)
            GLib.logv(_domain, LogLevelFlags.LEVEL_ERROR, message, va_list())

        def critical(message: string)
            g_log(_domain, LogLevelFlags.LEVEL_CRITICAL, "%s", message)

        def criticalf(message: string, ...)
            GLib.logv(_domain, LogLevelFlags.LEVEL_CRITICAL, message, va_list())

        def warning(message: string)
            g_log(_domain, LogLevelFlags.LEVEL_WARNING, "%s", message)

        def warningf(message: string, ...)
            GLib.logv(_domain, LogLevelFlags.LEVEL_WARNING, message, va_list())

        def message(message: string)
            g_log(_domain, LogLevelFlags.LEVEL_MESSAGE, "%s", message)

        def messagef(message: string, ...)
            GLib.logv(_domain, LogLevelFlags.LEVEL_MESSAGE, message, va_list())

        def info(message: string)
            g_log(_domain, LogLevelFlags.LEVEL_INFO, "%s", message)

        def infof(message: string, ...)
            GLib.logv(_domain, LogLevelFlags.LEVEL_INFO, message, va_list())

        def debug(message: string)
            g_log(_domain, LogLevelFlags.LEVEL_DEBUG, "%s", message)
            
        def debugf(message: string, ...)
            GLib.logv(_domain, LogLevelFlags.LEVEL_DEBUG, message, va_list())
        
        def exception(e: Error)
            warning(e.message)
            
        _handler_id: uint = 0
        _appender: Appender?
    
    /*
     * Handles the actual appending of log messages to a log.
     */
    class abstract Appender: Object
        construct()
            deepest_level = LogLevelFlags.LEVEL_DEBUG
    
        prop levels: LogLevelFlags
        prop deepest_level: LogLevelFlags
            set
                _levels = get_deepest_log_level_flags(value)
        
        def virtual can(level: LogLevelFlags): bool
            return (_levels & level) != 0

        def virtual handle(domain: string?, levels: LogLevelFlags, message: string)
            pass
    
    /*
     * Renders a log message to string.
     */
    class abstract Renderer
        def abstract render(domain: string?, levels: LogLevelFlags, message: string): string?

/*
 * Unfortunately, the Vala binding for GLib.log has a [Diagnostics]
 * annotation that forces the source code file and line number to be
 * prepended. In order to override that, we need to call the C function
 * directly. Note that GLib.logv does not have this annotation.
 */
def extern g_log(domain: string?, levels: LogLevelFlags, format: string, ...)
