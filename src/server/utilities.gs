[indent=4]

namespace Khovsgol.Server

    ARTICLES: Regex
    WHITESPACE: Regex

    def to_sortable(text: string): string
        // See: http://en.wikipedia.org/wiki/Article_%28grammar%29#Variation_among_languages
        try
            if ARTICLES is null
                ARTICLES = new Regex("^([\\s\\n\\r]*(?:the|a|an) )")
            if WHITESPACE is null
                WHITESPACE = new Regex("[\\s\\n\\r]")
            
            var sortable = text.down()
            sortable = ARTICLES.replace(sortable, sortable.length, 0, "")
            sortable = WHITESPACE.replace(sortable, sortable.length, 0, "")
            return sortable
        except e: RegexError
            Logging.get_logger("khovsgol.directory").warning(e.message)
            return text
            
    def get_album_path_dynamic(obj: Json.Object)
        var track = new Track.from_json(obj)
        track.album_path = File.new_for_path(track.path).get_parent().get_path()

    def tracks_to_full_json(tracks: IterableOfTrack, crucible: Crucible): Json.Array
        var library = crucible.create_library()
        var directory = new Filesystem.Directory()
        directory.crucible = crucible
        directory.library = library
        var sortables = new Sortables()

        var json = new Json.Array()
        for var track in tracks
            if track.title is null
                track = directory.create_track(track.path, sortables)
            json.add_object_element(track.to_json())
        return json

    class AlbumPathConstant
        construct(album_path: string)
            _album_path = album_path
    
        def do_on_json_object(obj: Json.Object)
            var track = new Track.from_json(obj)
            track.album_path = _album_path
            
        _album_path: string

    class Sortables
        def @get(text: string): string
            var sortable = _sortables[text]
            if sortable is null
                sortable = to_sortable(text)
                _sortables[text] = sortable
            return sortable

        _sortables: dict of string, string = new dict of string, string
