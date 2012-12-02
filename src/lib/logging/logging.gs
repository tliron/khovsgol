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
            if (appender is not null) && ((appender.levels & levels) != 0)
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
            if (_file is not null) && !_file.query_exists()
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
            var info = _file.query_info(FileAttribute.STANDARD_SIZE + "," + FileAttribute.STANDARD_NAME, FileQueryInfoFlags.NONE)
            
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
                        if (name.length != prefix.length) && name.has_prefix(prefix)
                            var suffix = name.slice(prefix.length, name.length)
                            var older = int.parse(suffix)
                            // Make sure that this file follows the naming rules
                            if (older > 0) && (name == prefix + older.to_string())
                                olders.add(older)
                        info = enumerator.next_file()
                    
                    new_older: int = 1
                    
                    if !olders.is_empty
                        olders.sort()
                        start: int = 0
                        
                        // Too many older files?
                        if olders.size > _max_older_files - 1
                            // Delete first older file
                            var file = directory.get_child(prefix + olders.first().to_string())
                            file.delete()
                            start = 1

                            // Delete the extra older files
                            for var p = _max_older_files to (olders.size - 1)
                                var older = olders[p]
                                file = directory.get_child(prefix + older.to_string())
                                file.delete()
                        
                        // Rename the older files in order
                        position: int = 1
                        for var p = start to min(_max_older_files - 1, olders.size - 1)
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

        def private static min(a: int, b: int): int
            return a < b ? a : b

    /*
     * Renders a log message to string.
     */
    class abstract Renderer
        def abstract render(domain: string?, levels: LogLevelFlags, message: string): string?

    /*
     * Renders a log message as is.
     */
    class SimpleRenderer: Renderer
        def override render(domain: string?, levels: LogLevelFlags, message: string): string?
            return message
    
    /*
     * Renders a log message using formats.
     */
    class FormatRenderer: Renderer
        prop format: string = "%s,%.3d: %8s [%s] %s"
        prop date_time_format: string = "%Y-%m-%d %H:%M:%S"

        def override render(domain: string?, levels: LogLevelFlags, message: string): string?
            var now = new DateTime.now_local()
            return format.printf(now.format(_date_time_format), now.get_microsecond() / 1000, get_log_level_name(levels), domain, message)

    /*
     * Renders a log message using formats and console colors.
     */
    class ColorFormatRenderer: FormatRenderer
        def override render(domain: string?, levels: LogLevelFlags, message: string): string?
            var r = super.render(domain, levels, message)
            
            color: Console.Color = Console.Color.WHITE
            if (levels & LogLevelFlags.LEVEL_ERROR) != 0
                color = Console.Color.RED
            else if (levels & LogLevelFlags.LEVEL_CRITICAL) != 0
                color = Console.Color.RED
            else if (levels & LogLevelFlags.LEVEL_WARNING) != 0
                color = Console.Color.YELLOW
            else if (levels & LogLevelFlags.LEVEL_MESSAGE) != 0
                color = Console.Color.GREEN
            else if (levels & LogLevelFlags.LEVEL_INFO) != 0
                color = Console.Color.BLUE
            else if (levels & LogLevelFlags.LEVEL_DEBUG) != 0
                color = Console.Color.CYAN
                
            return Console.foreground(color) + r + Console.reset()

    _loggers: dict of string, Logger

/*
 * Unfortunately, the Vala binding for GLib.log has a [Diagnostics]
 * annotation that forces the source code file and line number to be
 * prepended. In order to override that, we need to call the C function
 * directly. Note that GLib.logv does not have this annotation.
 */
def extern g_log(domain: string?, levels: LogLevelFlags, format: string, ...)
