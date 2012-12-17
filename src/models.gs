[indent=4]

uses
    JsonUtil

namespace Khovsgol

    interface Configuration: Object
        def abstract save(): bool

    //
    // Track
    //
    
    class Track: Object implements HasJsonObject
        construct()
            _json = new Json.Object()
        
        construct from_json(json: Json.Object)
            _json = json
    
        prop path: string
            owned get
                return get_string_member_or_null(_json, "path")
            set
                set_string_member_not_null(_json, "path", value)
        
        prop library: string
            owned get
                return get_string_member_or_null(_json, "library")
            set
                set_string_member_not_null(_json, "library", value)
        
        prop title: string
            owned get
                return get_string_member_or_null(_json, "title")
            set
                set_string_member_not_null(_json, "title", value)
        
        prop title_sort: string
            owned get
                return get_string_member_or_null(_json, "title_sort")
            set
                set_string_member_not_null(_json, "title_sort", value)
        
        prop artist: string
            owned get
                return get_string_member_or_null(_json, "artist")
            set
                set_string_member_not_null(_json, "artist", value)
        
        prop artist_sort: string
            owned get
                return get_string_member_or_null(_json, "artist_sort")
            set
                set_string_member_not_null(_json, "artist_sort", value)
        
        prop album: string
            owned get
                return get_string_member_or_null(_json, "album")
            set
                set_string_member_not_null(_json, "album", value)
        
        prop album_sort: string
            owned get
                return get_string_member_or_null(_json, "album_sort")
            set
                set_string_member_not_null(_json, "album_sort", value)
        
        prop album_path: string
            owned get
                return get_string_member_or_null(_json, "album_path")
            set
                set_string_member_not_null(_json, "album_path", value)
        
        prop album_type: AlbumType
            get
                return (AlbumType) get_int_member_or_min(_json, "album_type")
            set
                set_int_member_not_min(_json, "album_type", value)

        prop position_in_album: int
            get
                return get_int_member_or_min(_json, "position_in_album")
            set
                set_int_member_not_min(_json, "position_in_album", value)

        prop position_in_play_list: int
            get
                return get_int_member_or_min(_json, "position_in_play_list")
            set
                set_int_member_not_min(_json, "position_in_play_list", value)
                
        prop duration: double
            get
                return get_double_member_or_min(_json, "duration")
            set
                set_double_member_not_min(_json, "duration", value)
                
        prop date: int
            get
                return get_int_member_or_min(_json, "date")
            set
                set_int_member_not_min(_json, "date", value)
                
        prop file_type: string
            owned get
                return get_string_member_or_null(_json, "file_type")
            set
                set_string_member_not_null(_json, "file_type", value)
        
        def clone(): Track
            var track = new Track()
            track.path = path
            track.library = library
            track.title = title
            track.title_sort = title_sort
            track.artist = artist
            track.album = album
            track.album_sort = album_sort
            track.album_path = album_path
            track.album_type = album_type
            track.position_in_album = position_in_album
            track.position_in_play_list = position_in_play_list
            track.duration = duration
            track.date = date
            track.file_type = file_type
            return track

        def to_json(): Json.Object
            return _json
        
        _json: Json.Object
        
    class abstract IterableOfTrack: Object implements HasJsonArray, Gee.Iterable of Track
        prop abstract readonly element_type: Type
        def abstract iterator(): Gee.Iterator of Track
        def abstract to_json(): Json.Array
    
    //
    // TrackPointer
    //

    class TrackPointer: Object implements HasJsonObject
        construct()
            _json = new Json.Object()
        
        construct from_json(json: Json.Object)
            _json = json

        prop path: string
            owned get
                return get_string_member_or_null(_json, "path")
            set
                set_string_member_not_null(_json, "path", value)

        prop position: int
            get
                return get_int_member_or_min(_json, "position")
            set
                set_int_member_not_min(_json, "position", value)

        prop album: string
            owned get
                return get_string_member_or_null(_json, "album")
            set
                set_string_member_not_null(_json, "album", value)

        def to_json(): Json.Object
            return _json
            
        _json: Json.Object

    class abstract IterableOfTrackPointer: Object implements HasJsonArray, Gee.Iterable of TrackPointer
        prop abstract readonly element_type: Type
        def abstract iterator(): Gee.Iterator of TrackPointer
        def abstract to_json(): Json.Array
            
    //
    // Album
    //
    
    enum AlbumType
        ANY = -1
        ARTIST = 0
        COMPILATION = 1
        CUSTOM_COMPILATION = 2
        OTHER = 3

    class Album: Object implements HasJsonObject
        construct()
            _json = new Json.Object()
        
        construct from_json(json: Json.Object)
            _json = json

        prop path: string
            owned get
                return get_string_member_or_null(_json, "path")
            set
                set_string_member_not_null(_json, "path", value)

        prop library: string
            owned get
                return get_string_member_or_null(_json, "library")
            set
                set_string_member_not_null(_json, "library", value)

        prop title: string
            owned get
                return get_string_member_or_null(_json, "title")
            set
                set_string_member_not_null(_json, "title", value)

        prop title_sort: string
            owned get
                return get_string_member_or_null(_json, "title_sort")
            set
                set_string_member_not_null(_json, "title_sort", value)

        prop artist: string
            owned get
                return get_string_member_or_null(_json, "artist")
            set
                set_string_member_not_null(_json, "artist", value)

        prop artist_sort: string
            owned get
                return get_string_member_or_null(_json, "artist_sort")
            set
                set_string_member_not_null(_json, "artist_sort", value)

        prop date: int64
            get
                return get_int64_member_or_min(_json, "date")
            set
                set_int64_member_not_min(_json, "date", value)

        prop album_type: AlbumType
            get
                return (AlbumType) get_int_member_or_min(_json, "album_type")
            set
                set_int_member_not_min(_json, "album_type", value)

        prop file_type: string
            owned get
                return get_string_member_or_null(_json, "file_type")
            set
                set_string_member_not_null(_json, "file_type", value)
        
        def to_json(): Json.Object
            return _json
        
        _json: Json.Object

    class abstract IterableOfAlbum: Object implements HasJsonArray, Gee.Iterable of Album
        prop abstract readonly element_type: Type
        def abstract iterator(): Gee.Iterator of Album
        def abstract to_json(): Json.Array
    
    //
    // Artist
    //
    
    class Artist: Object implements HasJsonObject
        construct()
            _json = new Json.Object()
        
        construct from_json(json: Json.Object)
            _json = json

        prop name: string
            owned get
                return get_string_member_or_null(_json, "name")
            set
                set_string_member_not_null(_json, "name", value)
        
        prop sort: string
            owned get
                return get_string_member_or_null(_json, "sort")
            set
                set_string_member_not_null(_json, "sort", value)
        
        def to_json(): Json.Object
            return _json
        
        _json: Json.Object

    class abstract IterableOfArtist: Object implements HasJsonArray, Gee.Iterable of Artist
        prop abstract readonly element_type: Type
        def abstract iterator(): Gee.Iterator of Artist
        def abstract to_json(): Json.Array
   
    //
    // Primitives
    //

    class abstract IterableOfString: Object implements JsonUtil.HasJsonArray, Gee.Iterable of string?
        prop abstract readonly element_type: Type
        def abstract iterator(): Gee.Iterator of string
        def abstract to_json(): Json.Array

    class abstract IterableOfInt: Object implements JsonUtil.HasJsonArray, Gee.Iterable of int
        prop abstract readonly element_type: Type
        def abstract iterator(): Gee.Iterator of int
        def abstract to_json(): Json.Array

    class abstract IterableOfJsonObject: Object implements JsonUtil.HasJsonArray, Gee.Iterable of Json.Object?
        prop abstract readonly element_type: Type
        def abstract iterator(): Gee.Iterator of Json.Object
        def abstract to_json(): Json.Array
