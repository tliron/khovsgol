[indent=4]

namespace Khovsgol

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
            json.set_string_member("path", _path)
            json.set_string_member("library", _library)
            json.set_string_member("title", _title)
            json.set_string_member("title_sort", _title_sort)
            json.set_string_member("artist", _artist)
            json.set_string_member("artist_sort", _artist_sort)
            json.set_int_member("date", _date)
            json.set_boolean_member("compilation", _compilation)
            json.set_string_member("type", _file_type)
            return json
    
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
            json.set_string_member("path", _path)
            json.set_string_member("library", _library)
            json.set_string_member("title", _title)
            json.set_string_member("title_sort", _title_sort)
            json.set_string_member("artist", _artist)
            json.set_string_member("artist_sort", _artist_sort)
            json.set_string_member("album", _album)
            json.set_string_member("album_sort", _album_sort)
            json.set_int_member("position", _position)
            json.set_double_member("duration", _duration)
            json.set_int_member("date", _date)
            json.set_string_member("type", _file_type)
            return json
    
    interface TrackIterator: Object
        def abstract has_next(): bool
        def abstract next(): bool
        def abstract get(): Track

    class TrackPointer: Object
        prop path: string
        prop position: int
        prop album: string

        def to_json(): Json.Object
            var json = new Json.Object()
            json.set_string_member("path", _path)
            json.set_int_member("position", _position)
            json.set_string_member("album", _album)
            return json

    class IterateTracksArgs
        prop title_like: string? = null
        prop artist_like: string? = null
        prop album_like: string? = null
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string
        
    class IterateTracksInAlbumArgs
        prop album: string? = null
        prop sort: list of string = new list of string

    class IterateTracksByArtistArgs
        prop artist: string? = null
        prop like: bool = false
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string
    
    interface Libraries: Object
        def abstract get_track(path: string): Track? raises GLib.Error
        def abstract save_track(track: Track) raises GLib.Error
        def abstract delete_track(path: string) raises GLib.Error
        
        def abstract get_track_pointer(album: string, position: int): TrackPointer? raises GLib.Error
        def abstract save_track_pointer(track_pointer: TrackPointer) raises GLib.Error
        def abstract delete_track_pointer(album: string, position: int) raises GLib.Error
        def abstract delete_track_pointers(album: string) raises GLib.Error
        def abstract move_track_pointers(album: string, delta: int, from_position: int = -1) raises GLib.Error
        
        def abstract get_album(path: string): Album? raises GLib.Error
        def abstract save_album(album: Album) raises GLib.Error
        def abstract delete_album(path: string) raises GLib.Error

        def abstract iterate_tracks(args: IterateTracksArgs): TrackIterator raises GLib.Error
        def abstract iterate_tracks_in_album(args: IterateTracksInAlbumArgs): TrackIterator raises GLib.Error
        def abstract iterate_tracks_by_artist(args: IterateTracksByArtistArgs): TrackIterator raises GLib.Error
