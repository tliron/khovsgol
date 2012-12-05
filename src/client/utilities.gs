[indent=4]

namespace Khovsgol.Client

    /*
     * Finds a cover image file in the directory.
     */
    def find_cover(dir: File): File?
        if _covers is null
            _covers = new list of string
            _covers.add("Cover.png")
            _covers.add("Cover.gif")
            _covers.add("Cover.jpg")
            _covers.add("Cover.jpeg")
            _covers.add("Cover.bmp")
            _covers.add("cover.png")
            _covers.add("cover.gif")
            _covers.add("cover.jpg")
            _covers.add("cover.jpeg")
            _covers.add("cover.bmp")
        
        for cover in _covers
            var file = dir.get_child(cover)
            if file.query_exists()
                return file

        return null

    /*
     * String join for Gee.Iterable.
     */
    def join(sep: string, items: Gee.Iterable of string): string
        var str = new StringBuilder()
        var i = items.iterator()
        while i.next()
            str.append(i.get())
            if i.has_next()
                str.append(sep)
        return str.str

    /*
     * True if the file type is known to be lossless.
     */
    def is_lossless(file_type: string): bool
        return (file_type == "flac") || (file_type == "ape") || (file_type == "wav") || (file_type == "wv") || (file_type == "tta")
    
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
            return seconds.to_string()

    /*
     * Adds markup for a washed-out effect.
     */
    def format_washed_out(text: string): string
        return "<span color=\"#888888\">%s</span>".printf(text)

    /*
     * Adds markup for bracketed annotations.
     */
    def format_annotation(text: string): string
        if text.has_suffix("]")
            var open = text.last_index_of_char('[')
            if open != -1
                return "%s<span size=\"smaller\">%s</span>".printf(text.substring(0, open), text.substring(open))
        return text
    
    /*
     * Converts the first character to uppercase.
     */
    def first_upper(text: string): string
        if text.length > 0
            var first = text.get_char(0)
            var second = 0
            if text.get_next_char(ref second, null)
                return first.toupper().to_string() + text.substring(second)
        return text

    _covers: private list of string
