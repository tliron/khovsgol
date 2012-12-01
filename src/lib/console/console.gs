[indent=4]

namespace Console

    // See: http://www.linuxgazette.net/issue65/padala.html

    enum Effect
        RESET     = 0
        BRIGHT    = 1
        DIM       = 2
        UNDERLINE = 3
        BLINK     = 4
        REVERSE   = 7
        HIDDEN    = 8

    enum Color
        BLACK     = 0
        RED       = 1
        GREEN     = 2
        YELLOW    = 3
        BLUE      = 4
        MAGENTA   = 5
        CYAN      = 6
        WHITE     = 7

    def reset(): string
        return effect(Effect.RESET)

    def effect(effect: Effect): string
        return "\033[%dm".printf(effect)

    def foreground(color: Color): string
        return "\033[%dm".printf(color + 30)

    def background(color: Color): string
        return "\033[%dm".printf(color + 40)

    def style(effect: Effect, foreground: Color, background: Color): string
        return "\033[%d;%d;%dm".printf(effect, foreground + 30, background + 40)
