[indent=4]

uses
    Sqlite
    SqliteUtilities

namespace Khovsgol.Sqlite

    class Libraries: Khovsgol.Libraries
        construct() raises GLib.Error
            _db = new SqliteUtilities.Database("%s/.khovsgol/khovsgol.db".printf(Environment.get_home_dir()), "khovsgol.db")

            // Track table
            _db.execute("CREATE TABLE IF NOT EXISTS track (path TEXT PRIMARY KEY, library TEXT, title TEXT COLLATE NOCASE, title_sort TEXT, artist TEXT COLLATE NOCASE, artist_sort TEXT, album TEXT COLLATE NOCASE, album_sort TEXT, position INTEGER, duration REAL, date INTEGER, type TEXT)")
            _db.execute("CREATE INDEX IF NOT EXISTS track_library_idx ON track (library)")
            _db.execute("CREATE INDEX IF NOT EXISTS track_title_idx ON track (title)")
            _db.execute("CREATE INDEX IF NOT EXISTS track_title_sort_idx ON track (title_sort)")
            _db.execute("CREATE INDEX IF NOT EXISTS track_artist_idx ON track (artist)")
            _db.execute("CREATE INDEX IF NOT EXISTS track_artist_sort_idx ON track (artist_sort)")
            _db.execute("CREATE INDEX IF NOT EXISTS track_album_sort_idx ON track (album_sort)")
            _db.execute("CREATE INDEX IF NOT EXISTS track_date_idx ON track (date)")
            _db.execute("CREATE INDEX IF NOT EXISTS track_type_idx ON track (type)")

            // Track pointers table
            _db.execute("CREATE TABLE IF NOT EXISTS track_pointer (path TEXT, position INTEGER, album TEXT)")
            _db.execute("CREATE INDEX IF NOT EXISTS track_pointer_position_idx ON track_pointer (position)")
            _db.execute("CREATE INDEX IF NOT EXISTS track_pointer_album_idx ON track_pointer (album)")

            // Album table
            _db.execute("CREATE TABLE IF NOT EXISTS album (path TEXT PRIMARY KEY, library TEXT, title TEXT COLLATE NOCASE, title_sort TEXT, artist TEXT COLLATE NOCASE, artist_sort TEXT, date INTEGER, compilation INTEGER, type TEXT)")
            _db.execute("CREATE INDEX IF NOT EXISTS album_library_idx ON album (library)")
            _db.execute("CREATE INDEX IF NOT EXISTS album_title_idx ON album (title)")
            _db.execute("CREATE INDEX IF NOT EXISTS album_title_sort_idx ON album (title_sort)")
            _db.execute("CREATE INDEX IF NOT EXISTS album_artist_idx ON album (artist)")
            _db.execute("CREATE INDEX IF NOT EXISTS album_artist_sort_idx ON album (artist_sort)")
            _db.execute("CREATE INDEX IF NOT EXISTS album_date_idx ON album (date)")
            _db.execute("CREATE INDEX IF NOT EXISTS album_compilation_idx ON album (compilation)")
            _db.execute("CREATE INDEX IF NOT EXISTS album_type_idx ON album (type)")

            // Scanned table
            _db.execute("CREATE TABLE IF NOT EXISTS scanned (path TEXT PRIMARY KEY, timestamp REAL)")
            
            //test()
        
        def test() raises GLib.Error
            var args = new IterateTracksArgs()
            args.title_like = "hello"
            var tracks = iterate_tracks(args)
            while tracks.has_next()
                var track = tracks.get()
                print track.path
                tracks.next()
                
            print "-"
            
            var args2 = new IterateForAlbumArgs()
            args2.album = "/Depot/Music/Rush/Signals"
            args2.sort.add("position")
            tracks = iterate_tracks_in_album(args2)
            while tracks.has_next()
                var track = tracks.get()
                print track.path
                tracks.next()

            print "-"
            
            var args3 = new IterateForArtistArgs()
            args3.artist = "Rush"
            tracks = iterate_tracks_by_artist(args3)
            while tracks.has_next()
                var track = tracks.get()
                print track.path
                tracks.next()
            
            //dump_table("track")
        
        //
        // Tracks
        //
        
        def override get_track(path: string): Track? raises GLib.Error
            statement: Statement
            _db.prepare(out statement, "SELECT library, title, title_sort, artist, artist_sort, album, album_sort, position, duration, date, type FROM track WHERE path=?")
            statement.bind_text(1, path)
            if statement.step() == ROW
                var track = new Track()
                track.path = path
                track.library = statement.column_text(0)
                track.title = statement.column_text(1)
                track.title_sort = statement.column_text(2)
                track.artist = statement.column_text(3)
                track.artist_sort = statement.column_text(4)
                track.album = statement.column_text(5)
                track.album_sort = statement.column_text(6)
                track.position = statement.column_int(7)
                track.duration = statement.column_double(8)
                track.date = statement.column_int(9)
                track.file_type = statement.column_text(10)
                return track
            return null
        
        def override save_track(track: Track) raises GLib.Error
            statement: Statement
            _db.prepare(out statement, "INSERT OR REPLACE INTO track (path, library, title, title_sort, artist, artist_sort, album, album_sort, position, duration, date, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            statement.bind_text(1, track.path)
            statement.bind_text(2, track.title)
            statement.bind_text(3, track.title_sort)
            statement.bind_text(4, track.artist)
            statement.bind_text(5, track.artist_sort)
            statement.bind_text(6, track.album)
            statement.bind_text(7, track.album_sort)
            statement.bind_int(8, track.position)
            statement.bind_double(9, track.duration)
            statement.bind_int(10, track.date)
            statement.bind_text(11, track.file_type)
            _db.assert_done(statement.step())

        def override delete_track(path: string) raises GLib.Error
            statement: Statement
            _db.prepare(out statement, "DELETE FROM track WHERE path=?")
            statement.bind_text(1, path)
            _db.assert_done(statement.step())
            
        //
        // Track pointers
        //
        
        def override get_track_pointer(album: string, position: int): TrackPointer? raises GLib.Error
            statement: Statement
            _db.prepare(out statement, "SELECT path FROM track_pointer WHERE album=? AND position=?")
            statement.bind_text(1, album)
            statement.bind_int(2, position)
            if statement.step() == ROW
                var track_pointer = new TrackPointer()
                track_pointer.path = statement.column_text(0)
                track_pointer.position = position
                track_pointer.album = album
                return track_pointer
            return null

        def override save_track_pointer(track_pointer: TrackPointer) raises GLib.Error
            statement: Statement
            _db.prepare(out statement, "INSERT OR REPLACE INTO track_pointer (path, position, album) VALUES (?, ?, ?)")
            statement.bind_text(1, track_pointer.path)
            statement.bind_int(2, track_pointer.position)
            statement.bind_text(3, track_pointer.album)
            _db.assert_done(statement.step())

        def override delete_track_pointer(album: string, position: int) raises GLib.Error
            // TODO: renumber the rest of the pointers?
            statement: Statement
            _db.prepare(out statement, "DELETE FROM track_pointer WHERE album=? AND position=?")
            statement.bind_text(1, album)
            statement.bind_int(2, position)
            _db.assert_done(statement.step())

        def override delete_track_pointers(album: string) raises GLib.Error
            statement: Statement
            _db.prepare(out statement, "DELETE FROM track_pointer WHERE album=?")
            statement.bind_text(1, album)
            _db.assert_done(statement.step())

        def override move_track_pointers(album: string, delta: int, from_position: int = -1) raises GLib.Error
            statement: Statement
            if from_position == -1
                _db.prepare(out statement, "UPDATE track_pointer SET position=position+? WHERE album=?")
                statement.bind_int(1, delta)
                statement.bind_text(2, album)
            else
                _db.prepare(out statement, "UPDATE track_pointer SET position=position+? WHERE album=? AND position>=?")
                statement.bind_int(1, delta)
                statement.bind_text(2, album)
                statement.bind_int(3, from_position)
            _db.assert_done(statement.step())

        //
        // Albums
        //
        
        def override get_album(path: string): Album? raises GLib.Error
            statement: Statement
            _db.prepare(out statement, "SELECT library, title, title_sort, artist, artist_sort, date, compilation, type FROM album WHERE path=?")
            statement.bind_text(1, path)
            if statement.step() == ROW
                var album = new Album()
                album.path = path
                album.library = statement.column_text(0)
                album.title = statement.column_text(1)
                album.title_sort = statement.column_text(2)
                album.artist = statement.column_text(3)
                album.artist_sort = statement.column_text(4)
                album.date = statement.column_int(5)
                album.compilation = statement.column_int(6) == 1
                album.file_type = statement.column_text(7)
                return album
            return null
        
        def override save_album(album: Album) raises GLib.Error
            statement: Statement
            _db.prepare(out statement, "INSERT OR REPLACE INTO album (path, library, title, title_sort, artist, artist_sort, date, compilation, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            statement.bind_text(1, album.path)
            statement.bind_text(2, album.library)
            statement.bind_text(3, album.title)
            statement.bind_text(4, album.title_sort)
            statement.bind_text(5, album.artist)
            statement.bind_text(6, album.artist_sort)
            statement.bind_int(7, album.date)
            statement.bind_int(8, album.compilation ? 1 : 0)
            statement.bind_text(9, album.file_type)
            _db.assert_done(statement.step())

        def override delete_album(path: string) raises GLib.Error
            statement: Statement
            
            // Delete track pointers
            _db.prepare(out statement, "DELETE FROM track_pointer WHERE album=?")
            statement.bind_text(1, path)
            _db.assert_done(statement.step())

            // Delete tracks
            _db.prepare(out statement, "DELETE FROM track WHERE path LIKE ? ESCAPE \"\\\"")
            statement.bind_text(1, escape_like(path + SEPARATOR) + "%")
            _db.assert_done(statement.step())

            // Delete album
            _db.prepare(out statement, "DELETE FROM album WHERE path=?")
            statement.bind_text(1, path)
            _db.assert_done(statement.step())
        
        //
        // Iterate tracks
        //
        
        def override iterate_tracks(args: IterateTracksArgs): Khovsgol.TrackIterator raises GLib.Error
            var q = new Query()
            q.table = "track"
            q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "album", "album_sort", "position", "duration", "date", "type")
            q.sort.add_all(args.sort)
            parse_libraries(q, "", args.libraries)

            // All the LIKE requirements are OR-ed
            var likes = new list of string
            if args.title_like is not null
                likes.add("title LIKE ? ESCAPE \"\\\"")
                q.bindings.add(args.title_like)
            if args.artist_like is not null
                likes.add("artist LIKE ? ESCAPE \"\\\"")
                q.bindings.add(args.artist_like)
            if args.album_like is not null
                likes.add("album LIKE ? ESCAPE \"\\\"")
                q.bindings.add(args.album_like)
            if !likes.is_empty
                q.requirements.add("(" + join(" OR ", likes) + ")")

            return new TrackIterator(q.execute(_db))

        def override iterate_tracks_in_album(args: IterateForAlbumArgs): Khovsgol.TrackIterator raises GLib.Error
            var q = new Query()
            q.table = "track"
            q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "album", "album_sort", "position", "duration", "date", "type")
            q.sort.add_all(args.sort)
            q.requirements.add("path LIKE ? ESCAPE \"\\\"")
            q.bindings.add(escape_like(args.album + SEPARATOR) + "%")

            return new TrackIterator(q.execute(_db))
        
        def override iterate_tracks_by_artist(args: IterateForArtistArgs): Khovsgol.TrackIterator raises GLib.Error
            var q = new Query()
            q.table = "track"
            q.sort.add_all(args.sort)
            parse_libraries(q, "", args.libraries)
                
            if args.like
                q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "album", "album_sort", "position", "duration", "date", "type")
                q.requirements.add("artist LIKE ? ESCAPE \"\\\"")
            else
                // Optimized handling using a constant in case of strict equality
                q.add_fields("path", "library", "title", "title_sort", "artist_sort", "album", "album_sort", "position", "duration", "date", "type")
                q.requirements.add("artist=?")
                q.constants["artist"] = args.artist
            q.bindings.add(args.artist)

            return new TrackIterator(q.execute(_db))
        
        def override iterate_track_paths(path: string): Khovsgol.StringIterator raises GLib.Error
            var q = new Query()
            q.table = "track"
            q.fields.add("path")
            q.requirements.add("path LIKE ? ESCAPE \"\\\"")
            q.bindings.add(escape_like(path + SEPARATOR) + "%")
            return new StringIterator(q.execute(_db), "path")
        
        //
        // Iterate track pointers
        //
        
        def override iterate_raw_track_pointers_in_album(args: IterateForAlbumArgs): Khovsgol.TrackPointerIterator raises GLib.Error
            var q = new Query()
            q.table = "track_pointer"
            q.add_fields("path", "position")
            q.sort.add_all(args.sort)
            q.requirements.add("album=?")
            q.bindings.add(args.album)
            q.constants["album"] = args.album
            return new TrackPointerIterator(q.execute(_db))

        def override iterate_track_pointers_in_album(args: IterateForAlbumArgs): Khovsgol.TrackIterator raises GLib.Error
            var q = new Query()
            q.table = "track_pointer LEFT JOIN track ON track_pointer.path=track.path INNER JOIN album ON track_pointer.album=album.path"
            q.add_fields("track.path", "track.library", "track.title", "track.title_sort", "track.artist", "track.artist_sort", "album.title AS album", "album.title_sort AS album_sort", "track_pointer.position", "track.duration", "track.date", "track.type")
            q.requirements.add("track_pointer.album=?")
            q.bindings.add(args.album)
            
            // Fix sort
            var fixed_sort = new list of string
            for s in args.sort
                if s == "position"
                    s = "track_pointer.position"
                else if s == "album"
                    s = "track_pointer.album"
                fixed_sort.add(s)
            q.sort.add_all(fixed_sort)
            
            return new TrackIterator(q.execute(_db))

        def override iterate_track_pointers(args: IterateTracksArgs): Khovsgol.TrackIterator raises GLib.Error
            var q = new Query()
            q.table = "track_pointer LEFT JOIN track ON track_pointer.path=track.path INNER JOIN album ON track_pointer.album=album.path"
            q.add_fields("track.path", "track.library", "track.title", "track.title_sort", "track.artist", "track.artist_sort", "album.title AS album", "album.title_sort AS album_sort", "track_pointer.position", "track.duration", "track.date", "track.type", "track_pointer.album AS album_path")
            q.sort.add_all(args.sort)
            parse_libraries(q, "track.", args.libraries)

            // All the LIKE requirements are OR-ed
            var likes = new list of string
            if args.title_like is not null
                likes.add("track.title LIKE ? ESCAPE \"\\\"")
                q.bindings.add(args.title_like)
            if args.artist_like is not null
                likes.add("track.artist LIKE ? ESCAPE \"\\\"")
                q.bindings.add(args.artist_like)
            if args.album_like is not null
                likes.add("track_pointer.album LIKE ? ESCAPE \"\\\"")
                q.bindings.add(args.album_like)
            if !likes.is_empty
                q.requirements.add("(" + join(" OR ", likes) + ")")

            // Fix sort
            var fixed_sort = new list of string
            for s in args.sort
                if s == "position"
                    s = "track_pointer.position"
                else
                    s = "track." + s
                fixed_sort.add(s)
            q.sort.add_all(fixed_sort)

            return new TrackIterator(q.execute(_db), true)
        
        //
        // Iterate albums
        //
        
        def override iterate_albums(args: IterateAlbumsArgs): Khovsgol.AlbumIterator raises GLib.Error
            var q = new Query()
            q.table = "album"
            q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "date", "compilation", "type")
            q.sort.add_all(args.sort)
            parse_libraries(q, "", args.libraries)
            
            // Compilation type
            if args.compilation_type > -1
                q.requirements.add("compilation=?")
                q.bindings.add(args.compilation_type.to_string())
                
            return new AlbumIterator(q.execute(_db))

        def override iterate_album_paths(path: string): Khovsgol.StringIterator raises GLib.Error
            var q = new Query()
            q.table = "album"
            q.fields.add("path")
            q.requirements.add("path LIKE ? ESCAPE \"\\\"")
            q.bindings.add(escape_like(path + SEPARATOR) + "%")
            return new StringIterator(q.execute(_db), "path")
        
        def override iterate_albums_with_artist(args: IterateForArtistArgs): Khovsgol.AlbumIterator raises GLib.Error
            var q = new Query()
            q.table = "album INNER JOIN track ON album.title=track.album"
            q.add_fields("album.path", "album.library", "album.title", "album.title_sort", "album.artist", "album.artist_sort", "album.date", "album.compilation", "album.type")
            q.sort.add_all(args.sort)
            q.constraint = "DISTINCT"
            parse_libraries(q, "album.", args.libraries)
            
            if args.like
                q.requirements.add("track.artist LIKE ? ESCAPE \"\\\"")
            else
                q.requirements.add("track.artist=?")
            q.bindings.add(args.artist)

            return new AlbumIterator(q.execute(_db))

        def override iterate_albums_by_artist(args: IterateForArtistArgs): Khovsgol.AlbumIterator raises GLib.Error
            var q = new Query()
            q.table = "album"
            q.sort.add_all(args.sort)
            parse_libraries(q, "", args.libraries)
            
            if args.like
                q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "date", "compilation", "type")
                q.requirements.add("artist LIKE ? ESCAPE \"\\\"")
            else
                // Optimized handling using a constant in case of strict equality
                q.add_fields("path", "library", "title", "title_sort", "artist_sort", "date", "compilation", "type")
                q.requirements.add("artist=?")
                q.constants["artist"] = args.artist
            q.bindings.add(args.artist)
            
            return new AlbumIterator(q.execute(_db))
        
        def override iterate_albums_at(args: IterateForDateArgs): Khovsgol.AlbumIterator raises GLib.Error
            var q = new Query()
            q.table = "album"
            q.sort.add_all(args.sort)
            parse_libraries(q, "", args.libraries)
            
            if args.like
                q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "date", "compilation", "type")
                q.requirements.add("date LIKE ? ESCAPE \"\\\"")
            else
                // Optimized handling using a constant in case of strict equality
                q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "compilation", "type")
                q.requirements.add("date=?")
                q.constants["date"] = args.date.to_string()
            q.bindings.add(args.date.to_string())

            return new AlbumIterator(q.execute(_db))
        
        //
        // Iterate artists
        //
        
        def override iterate_artists(args: IterateByAlbumsOrTracksArgs): Khovsgol.ArtistIterator raises GLib.Error
            var q = new Query()
            q.table = args.album_artist ? "album" : "track"
            q.add_fields("artist", "artist_sort")
            q.sort.add_all(args.sort)
            q.requirements.add("artist IS NOT NULL")
            q.constraint = "DISTINCT"
            parse_libraries(q, "", args.libraries)

            return new ArtistIterator(q.execute(_db))
            
        //
        // Iterate dates
        //
        
        def override iterate_dates(args: IterateByAlbumsOrTracksArgs): Khovsgol.IntIterator raises GLib.Error
            var q = new Query()
            q.table = args.album_artist ? "album" : "track"
            q.add_fields("date")
            q.sort.add_all(args.sort)
            q.requirements.add("date IS NOT NULL")
            q.constraint = "DISTINCT"
            parse_libraries(q, "", args.libraries)

            return new IntIterator(q.execute(_db), "date")
            
        //
        // Timestamps
        //
        
        def override get_timestamp(path: string): double raises GLib.Error
            statement: Statement
            _db.prepare(out statement, "SELECT timestamp FROM scanned WHERE path=?")
            statement.bind_text(1, path)
            if statement.step() == ROW
                return statement.column_double(0)
            return 0

        def override set_timestamp(path: string, timestamp: double) raises GLib.Error
            statement: Statement
            _db.prepare(out statement, "INSERT OR REPLACE INTO scanned (path, timestamp) VALUES (?, ?)")
            statement.bind_text(1, path)
            statement.bind_double(1, timestamp)
            _db.assert_done(statement.step())

        //
        // Private
        //
    
        _db: SqliteUtilities.Database

        def private parse_libraries(q: Query, prefix: string, libraries: list of string)
            if !libraries.is_empty
                q.requirements.add("%slibrary IN (%s)".printf(prefix, join_same(",", "?", libraries.size)))
                q.bindings.add_all(libraries)
            else
                q.requirements.add("%slibrary IS NOT NULL".printf(prefix))

        class private TrackIterator: Khovsgol.TrackIterator
            construct(iterator: Iterator, album_path: bool = false)
                _iterator = iterator
                if album_path
                    get_album_path = get_album_path_from_row

            def override has_next(): bool
                return _iterator.has_next()
                
            def override next(): bool
                return _iterator.next()
                
            def override get(): Track
                var row = _iterator.get()
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
                return track

            def private get_album_path_from_row(track: Track): string
                var row = _iterator.get()
                return row.get_text("album_path")
                
            _iterator: Iterator

        class private TrackPointerIterator: Khovsgol.TrackPointerIterator
            construct(iterator: Iterator)
                _iterator = iterator
        
            def override has_next(): bool
                return _iterator.has_next()
                
            def override next(): bool
                return _iterator.next()
                
            def override get(): TrackPointer
                var row = _iterator.get()
                var track_pointer = new TrackPointer()
                track_pointer.path = row.get_text("path")
                track_pointer.position = row.get_int("position")
                track_pointer.album = row.get_text("album")
                return track_pointer
                
            _iterator: Iterator

        class private AlbumIterator: Khovsgol.AlbumIterator
            construct(iterator: Iterator)
                _iterator = iterator
        
            def override has_next(): bool
                return _iterator.has_next()
                
            def override next(): bool
                return _iterator.next()
                
            def override get(): Album
                var row = _iterator.get()
                var album = new Album()
                album.path = row.get_text("path")
                album.library = row.get_text("library")
                album.title = row.get_text("title")
                album.title_sort = row.get_text("title_sort")
                album.artist = row.get_text("artist")
                album.artist_sort = row.get_text("artist_sort")
                album.date = row.get_int("date")
                album.compilation = row.get_int("compilation") == 1
                album.file_type = row.get_text("type")
                return album
                
            _iterator: Iterator

        class private ArtistIterator: Khovsgol.ArtistIterator
            construct(iterator: Iterator)
                _iterator = iterator
        
            def override has_next(): bool
                return _iterator.has_next()
                
            def override next(): bool
                return _iterator.next()
                
            def override get(): Artist
                var row = _iterator.get()
                var artist = new Artist()
                artist.artist = row.get_text("artist")
                artist.artist_sort = row.get_text("artist_sort")
                return artist
                
            _iterator: Iterator

        class private StringIterator: Khovsgol.StringIterator
            construct(iterator: Iterator, name: string)
                _iterator = iterator
                _name = name
        
            def override has_next(): bool
                return _iterator.has_next()
                
            def override next(): bool
                return _iterator.next()
                
            def override get(): string
                var row = _iterator.get()
                return row.get_text(_name)
                
            _iterator: Iterator
            _name: string

        class private IntIterator: Khovsgol.IntIterator
            construct(iterator: Iterator, name: string)
                _iterator = iterator
                _name = name
        
            def override has_next(): bool
                return _iterator.has_next()
                
            def override next(): bool
                return _iterator.next()
                
            def override get(): int
                var row = _iterator.get()
                return row.get_int(_name)
                
            _iterator: Iterator
            _name: string
