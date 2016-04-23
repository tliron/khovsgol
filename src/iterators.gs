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

    class JsonTrackIterator: Object implements Gee.Traversable of (Track), Gee.Iterator of (Track)
        construct(json: Json.Array? = null)
            _json = json
            _length = _json is not null ? _json.get_length() : 0

        prop readonly valid: bool = true
        prop readonly read_only: bool = true

        def next(): bool
            return ++_index < _length
        
        def new @get(): Track
            var element = get_object_element_or_null(_json, _index)
            return new Track.from_json(element)
        
        def has_next(): bool
            return _index < _length - 1
        
        def remove()
            pass

        def @foreach(f: Gee.ForallFunc of Track): bool
            _index--
            while next()
                if not f(@get())
                    return false
            return true
        
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

    class JsonTrackPointerIterator: Object implements Gee.Traversable of (TrackPointer), Gee.Iterator of (TrackPointer)
        construct(json: Json.Array? = null)
            _json = json
            _length = _json is not null ? _json.get_length() : 0

        prop readonly valid: bool = true
        prop readonly read_only: bool = true

        def next(): bool
            return ++_index < _length
        
        def new @get(): TrackPointer
            var element = get_object_element_or_null(_json, _index)
            return new TrackPointer.from_json(element)
        
        def has_next(): bool
            return _index < _length - 1
        
        def remove()
            pass

        def @foreach(f: Gee.ForallFunc of TrackPointer): bool
            _index--
            while next()
                if not f(@get())
                    return false
            return true
        
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

    class JsonAlbumIterator: Object implements Gee.Traversable of (Album), Gee.Iterator of (Album)
        construct(json: Json.Array? = null)
            _json = json
            _length = _json is not null ? _json.get_length() : 0

        prop readonly valid: bool = true
        prop readonly read_only: bool = true

        def next(): bool
            return ++_index < _length
        
        def new @get(): Album
            var element = get_object_element_or_null(_json, _index)
            return new Album.from_json(element)
        
        def has_next(): bool
            return _index < _length - 1
        
        def remove()
            pass

        def @foreach(f: Gee.ForallFunc of Album): bool
            _index--
            while next()
                if not f(@get())
                    return false
            return true
        
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

    class JsonArtistIterator: Object implements Gee.Traversable of (Artist), Gee.Iterator of (Artist)
        construct(json: Json.Array? = null)
            _json = json
            _length = _json is not null ? _json.get_length() : 0

        prop readonly valid: bool = true
        prop readonly read_only: bool = true

        def next(): bool
            return ++_index < _length
        
        def new @get(): Artist
            var element = get_object_element_or_null(_json, _index)
            return new Artist.from_json(element)
        
        def has_next(): bool
            return _index < _length - 1
        
        def remove()
            pass

        def @foreach(f: Gee.ForallFunc of Artist): bool
            _index--
            while next()
                if not f(@get())
                    return false
            return true
        
        _json: Json.Array?
        _index: int = -1
        _length: uint

    //
    // Primitives
    //

    class JsonStrings: IterableOfString
        construct(json: Json.Array? = null)
            _json = json
        
        prop override readonly element_type: Type
            get
                return typeof(string)
            
        def override iterator(): Gee.Iterator of string?
            return new JsonStringIterator(_json)

        def override to_json(): Json.Array
            return _json
        
        _json: Json.Array?

    class JsonStringIterator: Object implements Gee.Traversable of (string?), Gee.Iterator of (string?)
        construct(json: Json.Array? = null)
            _json = json
            _length = _json is not null ? _json.get_length() : 0

        prop readonly valid: bool = true
        prop readonly read_only: bool = true

        def next(): bool
            return ++_index < _length
        
        def new @get(): string?
            return get_string_element_or_null(_json, _index)
        
        def has_next(): bool
            return _index < _length - 1
        
        def remove()
            pass

        def @foreach(f: Gee.ForallFunc of string): bool
            _index--
            while next()
                if not f(@get())
                    return false
            return true
        
        _json: Json.Array?
        _index: int = -1
        _length: uint
    
    class JsonInts: IterableOfInt
        construct(json: Json.Array? = null)
            _json = json
        
        prop override readonly element_type: Type
            get
                return typeof(int)
            
        def override iterator(): Gee.Iterator of int
            return new JsonIntIterator(_json)

        def override to_json(): Json.Array
            return _json
        
        _json: Json.Array?

    class JsonIntIterator: Object implements Gee.Traversable of (int), Gee.Iterator of (int)
        construct(json: Json.Array? = null)
            _json = json
            _length = _json is not null ? _json.get_length() : 0

        prop readonly valid: bool = true
        prop readonly read_only: bool = true

        def next(): bool
            return ++_index < _length
        
        def new @get(): int
            return get_int_element_or_min(_json, _index)
        
        def has_next(): bool
            return _index < _length - 1
        
        def remove()
            pass

        def @foreach(f: Gee.ForallFunc of int): bool
            _index--
            while next()
                if not f(@get())
                    return false
            return true
        
        _json: Json.Array?
        _index: int = -1
        _length: uint

    class JsonObjects: IterableOfJsonObject
        construct(json: Json.Array? = null)
            _json = json
        
        prop override readonly element_type: Type
            get
                return typeof(Json.Object)
            
        def override iterator(): Gee.Iterator of Json.Object?
            return new JsonObjectIterator(_json)

        def override to_json(): Json.Array
            return _json
        
        _json: Json.Array?

    class JsonObjectIterator: Object implements Gee.Traversable of (Json.Object?), Gee.Iterator of (Json.Object?)
        construct(json: Json.Array? = null)
            _json = json
            _length = _json is not null ? _json.get_length() : 0

        prop readonly valid: bool = true
        prop readonly read_only: bool = true
        
        def next(): bool
            return ++_index < _length
        
        def new @get(): Json.Object?
            return get_object_element_or_null(_json, _index)
        
        def has_next(): bool
            return _index < _length - 1
        
        def remove()
            pass

        def @foreach(f: Gee.ForallFunc of Json.Object?): bool
            _index--
            while next()
                if not f(@get())
                    return false
            return true
        
        _json: Json.Array?
        _index: int = -1
        _length: uint
