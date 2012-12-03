[indent=4]

namespace Logging

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
