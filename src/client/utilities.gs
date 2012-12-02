[indent=4]

uses
    JsonUtil

namespace Khovsgol

    //
    // Track
    //
    
    class JsonTracks: IterableOfTrack
        construct(json: Json.Array? = null)
            _json = json
        
        prop override readonly element_type: Type
            get
                return typeof(Track)
            
        def override iterator(): Gee.Iterator of Track
            return new JsonTrackIterator(_json)

        def override to_json(): Json.Array
            return _json
        
        _json: Json.Array?

    class JsonTrackIterator: Object implements Gee.Iterator of Track
        construct(json: Json.Array? = null)
            _json = json
            _length = _json is not null ? _json.get_length() : 0

        def next(): bool
            return ++_index < _length
        
        def new @get(): Track
            var element = get_object_element_or_null(_json, _index)
            return new Track.from_json(element)
        
        def first(): bool
            return _index == 0
        
        def has_next(): bool
            return _index < _length - 1
        
        def remove()
            pass
        
        _json: Json.Array?
        _index: int = -1
        _length: uint

    //
    // TrackPointer
    //

    class JsonTrackPointers: IterableOfTrackPointer
        construct(json: Json.Array? = null)
            _json = json
        
        prop override readonly element_type: Type
            get
                return typeof(Track)
            
        def override iterator(): Gee.Iterator of TrackPointer
            return new JsonTrackPointerIterator(_json)

        def override to_json(): Json.Array
            return _json
        
        _json: Json.Array?

    class JsonTrackPointerIterator: Object implements Gee.Iterator of TrackPointer
        construct(json: Json.Array? = null)
            _json = json
            _length = _json is not null ? _json.get_length() : 0

        def next(): bool
            return ++_index < _length
        
        def new @get(): TrackPointer
            var element = get_object_element_or_null(_json, _index)
            return new TrackPointer.from_json(element)
        
        def first(): bool
            return _index == 0
        
        def has_next(): bool
            return _index < _length - 1
        
        def remove()
            pass
        
        _json: Json.Array?
        _index: int = -1
        _length: uint
            
    //
    // Album
    //
    
    class JsonAlbums: IterableOfAlbum
        construct(json: Json.Array? = null)
            _json = json
        
        prop override readonly element_type: Type
            get
                return typeof(Album)
            
        def override iterator(): Gee.Iterator of Album
            return new JsonAlbumIterator(_json)

        def override to_json(): Json.Array
            return _json
        
        _json: Json.Array?

    class JsonAlbumIterator: Object implements Gee.Iterator of Album
        construct(json: Json.Array? = null)
            _json = json
            _length = _json is not null ? _json.get_length() : 0

        def next(): bool
            return ++_index < _length
        
        def new @get(): Album
            var element = get_object_element_or_null(_json, _index)
            return new Album.from_json(element)
        
        def first(): bool
            return _index == 0
        
        def has_next(): bool
            return _index < _length - 1
        
        def remove()
            pass
        
        _json: Json.Array?
        _index: int = -1
        _length: uint
    
    //
    // Artist
    //
    
    class JsonArtists: IterableOfArtist
        construct(json: Json.Array? = null)
            _json = json
        
        prop override readonly element_type: Type
            get
                return typeof(Artist)
            
        def override iterator(): Gee.Iterator of Artist
            return new JsonArtistIterator(_json)

        def override to_json(): Json.Array
            return _json
        
        _json: Json.Array?

    class JsonArtistIterator: Object implements Gee.Iterator of Artist
        construct(json: Json.Array? = null)
            _json = json
            _length = _json is not null ? _json.get_length() : 0

        def next(): bool
            return ++_index < _length
        
        def new @get(): Artist
            var element = get_object_element_or_null(_json, _index)
            return new Artist.from_json(element)
        
        def first(): bool
            return _index == 0
        
        def has_next(): bool
            return _index < _length - 1
        
        def remove()
            pass
        
        _json: Json.Array?
        _index: int = -1
        _length: uint
