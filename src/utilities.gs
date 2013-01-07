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

    /*
     * True if the file type is known to be audio.
     */
    def is_audio(file_type: string?): bool
        if file_type is null
            return false

        if _audio_types is null
            _audio_types = new list of string
            _audio_types.add("flac")
            _audio_types.add("ape")
            _audio_types.add("wav")
            _audio_types.add("wv")
            _audio_types.add("tta")
            _audio_types.add("mp3")
            _audio_types.add("ogg")
            _audio_types.add("m4a")
            _audio_types.add("m4p")
            _audio_types.add("aac")

        for t in _audio_types
            if file_type == t
                return true
        return false

    /*
     * True if the file type is known to be lossless.
     */
    def is_lossless(file_type: string?): bool
        if file_type is null
            return false
    
        if _lossless_types is null
            _lossless_types = new list of string
            _lossless_types.add("flac")
            _lossless_types.add("ape")
            _lossless_types.add("wav")
            _lossless_types.add("wv")
            _lossless_types.add("tta")
        
        for t in _lossless_types
            if file_type == t
                return true
        return false
    
    _audio_types: private list of string
    _lossless_types: private list of string
