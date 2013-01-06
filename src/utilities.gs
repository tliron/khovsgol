[indent=4]

namespace Khovsgol

    /*
     * Formats a duration in seconds as "hh:mm:ss".
     */
    def format_duration(duration: double): string
        var seconds = (int) Math.round(duration)
        var minutes = seconds / 60
        var hours = seconds / 3600
        seconds -= minutes * 60
        minutes -= hours * 60
        if hours > 0
            return "%d:%02d:%02d".printf(hours, minutes, seconds)
        else if minutes > 0
            return "%d:%02d".printf(minutes, seconds)
        else
            return "%d".printf(seconds)
