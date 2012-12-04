[indent=4]

uses
    Sqlite
    SqliteUtil

namespace Khovsgol.Server._Sqlite

    def private static parse_libraries(q: Query, prefix: string, libraries: list of string)
        if !libraries.is_empty
            q.requirements.add("%slibrary IN (%s)".printf(prefix, join_same(",", "?", libraries.size)))
            q.bindings.add_all(libraries)
        else
            q.requirements.add("%slibrary IS NOT NULL".printf(prefix))

    class SqlTracks: IterableOfTrack
        construct(iterator: RowIterator, album_path: bool = false)
            _iterator = new SqlTrackIterator(iterator, album_path)
        
        prop override readonly element_type: Type
            get
                return typeof(Track)
                
        def override iterator(): Gee.Iterator of Track
            return _iterator
        
        def override to_json(): Json.Array
            var json = new Json.Array()
            for var track in self
                json.add_object_element(track.to_json())
            return json
            
        _iterator: SqlTrackIterator

    class SqlTrackIterator: Object implements Gee.Iterator of Track
        construct(iterator: RowIterator, album_path: bool = false)
            _iterator = iterator
            _album_path = album_path
            
        def next(): bool
            return _iterator.next()
            
        def new @get(): Track
            var row = _iterator.@get()
            var track = new Track()
            track.path = row.get_text("path")
            track.library = row.get_text("library")
            track.title = row.get_text("title")
            track.title_sort = row.get_text("title_sort")
            track.artist = row.get_text("artist")
            track.artist_sort = row.get_text("artist_sort")
            track.album = row.get_text("album")
            track.album_sort = row.get_text("album_sort")
            track.position = row.get_int("position")
            track.duration = row.get_double("duration")
            track.date = row.get_int("date")
            track.file_type = row.get_text("type")
            if _album_path
                track.album_path = row.get_text("album_path")
            return track
        
        def first(): bool
            return _iterator.first()

        def has_next(): bool
            return _iterator.has_next()
            
        def remove()
            _iterator.remove()
            
        _iterator: RowIterator
        _album_path: bool

    class SqlTrackPointers: IterableOfTrackPointer
        construct(iterator: RowIterator)
            _iterator = new SqlTrackPointerIterator(iterator)
        
        prop override readonly element_type: Type
            get
                return typeof(TrackPointer)
                
        def override iterator(): Gee.Iterator of TrackPointer
            return _iterator
        
        def override to_json(): Json.Array
            var json = new Json.Array()
            for var track_pointer in self
                json.add_object_element(track_pointer.to_json())
            return json
            
        _iterator: SqlTrackPointerIterator

    class SqlTrackPointerIterator: Object implements Gee.Iterator of TrackPointer
        construct(iterator: RowIterator)
            _iterator = iterator
            
        def next(): bool
            return _iterator.next()
            
        def new @get(): TrackPointer
            var row = _iterator.@get()
            var track_pointer = new TrackPointer()
            track_pointer.path = row.get_text("path")
            track_pointer.position = row.get_int("position")
            track_pointer.album = row.get_text("album")
            return track_pointer
        
        def first(): bool
            return _iterator.first()

        def has_next(): bool
            return _iterator.has_next()
            
        def remove()
            _iterator.remove()
            
        _iterator: RowIterator

    class SqlAlbums: IterableOfAlbum
        construct(iterator: RowIterator)
            _iterator = new SqlAlbumIterator(iterator)
        
        prop override readonly element_type: Type
            get
                return typeof(Album)
                
        def override iterator(): Gee.Iterator of Album
            return _iterator
        
        def override to_json(): Json.Array
            var json = new Json.Array()
            for var album in self
                json.add_object_element(album.to_json())
            return json
            
        _iterator: SqlAlbumIterator

    class SqlAlbumIterator: Object implements Gee.Iterator of Album
        construct(iterator: RowIterator)
            _iterator = iterator
            
        def next(): bool
            return _iterator.next()
            
        def new @get(): Album
            var row = _iterator.@get()
            var album = new Album()
            album.path = row.get_text("path")
            album.library = row.get_text("library")
            album.title = row.get_text("title")
            album.title_sort = row.get_text("title_sort")
            album.artist = row.get_text("artist")
            album.artist_sort = row.get_text("artist_sort")
            album.date = row.get_int("date")
            album.compilation_type = (CompilationType) row.get_int("compilation")
            album.file_type = row.get_text("type")
            return album
        
        def first(): bool
            return _iterator.first()

        def has_next(): bool
            return _iterator.has_next()
            
        def remove()
            _iterator.remove()
            
        _iterator: RowIterator

    class SqlArtists: IterableOfArtist
        construct(iterator: RowIterator)
            _iterator = new SqlArtistIterator(iterator)
        
        prop override readonly element_type: Type
            get
                return typeof(Artist)
                
        def override iterator(): Gee.Iterator of Artist
            return _iterator
        
        def override to_json(): Json.Array
            var json = new Json.Array()
            for var artist in self
                json.add_object_element(artist.to_json())
            return json
            
        _iterator: SqlArtistIterator

    class SqlArtistIterator: Object implements Gee.Iterator of Artist
        construct(iterator: RowIterator)
            _iterator = iterator
            
        def next(): bool
            return _iterator.next()
            
        def new @get(): Artist
            var row = _iterator.@get()
            var artist = new Artist()
            artist.name = row.get_text("artist")
            artist.sort = row.get_text("artist_sort")
            return artist
        
        def first(): bool
            return _iterator.first()

        def has_next(): bool
            return _iterator.has_next()
            
        def remove()
            _iterator.remove()
            
        _iterator: RowIterator

    class SqlStrings: IterableOfString
        construct(iterator: RowIterator, name: string)
            _iterator = new SqlStringIterator(iterator, name)
        
        prop override readonly element_type: Type
            get
                return typeof(string)
                
        def override iterator(): Gee.Iterator of string?
            return _iterator
        
        def override to_json(): Json.Array
            var json = new Json.Array()
            for var s in self
                json.add_string_element(s)
            return json
            
        _iterator: SqlStringIterator

    class private SqlStringIterator: Object implements Gee.Iterator of string?
        construct(iterator: RowIterator, name: string)
            _iterator = iterator
            _name = name
    
        def next(): bool
            return _iterator.next()

        def new @get(): string?
            var row = _iterator.get()
            return row.get_text(_name)

        def first(): bool
            return _iterator.first()

        def has_next(): bool
            return _iterator.has_next()
            
        def remove()
            _iterator.remove()
            
        _iterator: RowIterator
        _name: string

    class SqlInts: IterableOfInt
        construct(iterator: RowIterator, name: string)
            _iterator = new SqlIntIterator(iterator, name)
        
        prop override readonly element_type: Type
            get
                return typeof(string)
                
        def override iterator(): Gee.Iterator of int
            return _iterator
        
        def override to_json(): Json.Array
            var json = new Json.Array()
            for var i in self
                json.add_int_element(i)
            return json
            
        _iterator: SqlIntIterator

    class private SqlIntIterator: Object implements Gee.Iterator of int
        construct(iterator: RowIterator, name: string)
            _iterator = iterator
            _name = name
    
        def next(): bool
            return _iterator.next()

        def new @get(): int
            var row = _iterator.get()
            return row.get_int(_name)

        def first(): bool
            return _iterator.first()

        def has_next(): bool
            return _iterator.has_next()
            
        def remove()
            _iterator.remove()
            
        _iterator: RowIterator
        _name: string
