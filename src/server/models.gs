[indent=4]

namespace Khovsgol

    const SEPARATOR: string = "/"

    class Track: Object
        prop path: string
        prop library: string
        prop title: string
        prop title_sort: string
        prop artist: string
        prop artist_sort: string
        prop album: string
        prop album_sort: string
        prop position: int
        prop duration: double
        prop date: int
        prop file_type: string

        def to_json(): Json.Object
            var json = new Json.Object()
            JSON.set_string_not_null(json, "path", _path)
            JSON.set_string_not_null(json, "library", _library)
            JSON.set_string_not_null(json, "title", _title)
            JSON.set_string_not_null(json, "title_sort", _title_sort)
            JSON.set_string_not_null(json, "artist", _artist)
            JSON.set_string_not_null(json, "artist_sort", _artist_sort)
            JSON.set_string_not_null(json, "album", _album)
            JSON.set_string_not_null(json, "album_sort", _album_sort)
            json.set_int_member("position", _position)
            json.set_double_member("duration", _duration)
            json.set_int_member("date", _date)
            JSON.set_string_not_null(json, "type", _file_type)
            return json
    
    class abstract TrackIterator
        def abstract has_next(): bool
        def abstract next(): bool
        def abstract get(): Track
        
        prop get_album_path: unowned GetAlbumPath?
        
        def to_json(): Json.Array
            var json = new Json.Array()
            while has_next()
                var track = get()
                var obj = track.to_json()
                if get_album_path is not null
                    JSON.set_string_not_null(obj, "album_path", _get_album_path(track))
                json.add_object_element(obj)
                next()
            return json

        delegate GetAlbumPath(track: Track): string

    class TrackPointer: Object
        prop path: string
        prop position: int
        prop album: string

        def to_json(): Json.Object
            var json = new Json.Object()
            JSON.set_string_not_null(json, "path", _path)
            json.set_int_member("position", _position)
            JSON.set_string_not_null(json, "album", _album)
            return json

    class abstract TrackPointerIterator
        def abstract has_next(): bool
        def abstract next(): bool
        def abstract get(): TrackPointer
        
        def to_json(): Json.Array
            var json = new Json.Array()
            while has_next()
                json.add_object_element(get().to_json())
                next()
            return json

    class Album: Object
        prop path: string
        prop library: string
        prop title: string
        prop title_sort: string
        prop artist: string
        prop artist_sort: string
        prop date: int
        prop compilation: bool
        prop file_type: string
        
        def to_json(): Json.Object
            var json = new Json.Object()
            JSON.set_string_not_null(json, "path", _path)
            JSON.set_string_not_null(json, "library", _library)
            JSON.set_string_not_null(json, "title", _title)
            JSON.set_string_not_null(json, "title_sort", _title_sort)
            JSON.set_string_not_null(json, "artist", _artist)
            JSON.set_string_not_null(json, "artist_sort", _artist_sort)
            json.set_int_member("date", _date)
            json.set_boolean_member("compilation", _compilation)
            JSON.set_string_not_null(json, "type", _file_type)
            return json

    class abstract AlbumIterator
        def abstract has_next(): bool
        def abstract next(): bool
        def abstract get(): Album
        
        def to_json(): Json.Array
            var json = new Json.Array()
            while has_next()
                json.add_object_element(get().to_json())
                next()
            return json    
    
    class Artist
        prop artist: string
        prop artist_sort: string
        
        def to_json(): Json.Array
            var json = new Json.Array()
            json.add_string_element(_artist)
            json.add_string_element(_artist_sort)
            return json

    class abstract ArtistIterator
        def abstract has_next(): bool
        def abstract next(): bool
        def abstract get(): Artist
        
        def to_json(): Json.Array
            var json = new Json.Array()
            while has_next()
                json.add_array_element(get().to_json())
                next()
            return json

    class abstract StringIterator
        def abstract has_next(): bool
        def abstract next(): bool
        def abstract get(): string

        def to_json(): Json.Array
            var json = new Json.Array()
            while has_next()
                json.add_string_element(get())
                next()
            return json

    class abstract IntIterator
        def abstract has_next(): bool
        def abstract next(): bool
        def abstract get(): int

        def to_json(): Json.Array
            var json = new Json.Array()
            while has_next()
                json.add_int_element(get())
                next()
            return json
