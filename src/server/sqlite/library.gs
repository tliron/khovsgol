[indent=4]

uses
    Sqlite
    SqliteUtilities

namespace Khovsgol.Sqlite

    const SEPARATOR: string = "/"
            
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
            
            var args2 = new IterateTracksInAlbumArgs()
            args2.album = "/Depot/Music/Rush/Signals"
            args2.sort.add("position")
            tracks = iterate_tracks_in_album(args2)
            while tracks.has_next()
                var track = tracks.get()
                print track.path
                tracks.next()

            print "-"
            
            var args3 = new IterateTracksByArtistArgs()
            args3.artist = "Rush"
            tracks = iterate_tracks_by_artist(args3)
            while tracks.has_next()
                var track = tracks.get()
                print track.path
                tracks.next()
            
            //dump_table("track")
        
        //
        // Track
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
        // TrackPointer
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
        // Album
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
        // Iterators
        //
        
        def override iterate_tracks(args: IterateTracksArgs): Khovsgol.TrackIterator raises GLib.Error
            var q = new Query()
            q.table = "track"
            q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "album", "album_sort", "position", "duration", "date", "type")
            q.sort.add_all(args.sort)

            // Libraries
            if !args.libraries.is_empty
                q.requirements.add("library IN (%s)".printf(join_same(",", "?", args.libraries.size)))
                q.bindings.add_all(args.libraries)
            else
                q.requirements.add("library IS NOT NULL")

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

        def override iterate_tracks_in_album(args: IterateTracksInAlbumArgs): Khovsgol.TrackIterator raises GLib.Error
            var q = new Query()
            q.table = "track"
            q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "album", "album_sort", "position", "duration", "date", "type")
            q.sort.add_all(args.sort)
            q.requirements.add("path LIKE ? ESCAPE \"\\\"")
            q.bindings.add(escape_like(args.album + SEPARATOR) + "%")

            return new TrackIterator(q.execute(_db))
        
        def override iterate_tracks_by_artist(args: IterateTracksByArtistArgs): Khovsgol.TrackIterator raises GLib.Error
            var q = new Query()
            q.table = "track"
            q.sort.add_all(args.sort)

            // Libraries
            if !args.libraries.is_empty
                q.requirements.add("library IN (%s)".printf(join_same(",", "?", args.libraries.size)))
                q.bindings.add_all(args.libraries)
            else
                q.requirements.add("library IS NOT NULL")
                
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
        
        //
        // Private
        //
    
        _db: SqliteUtilities.Database

        class private TrackIterator: Object implements Khovsgol.TrackIterator
            construct(iterator: Iterator)
                _iterator = iterator
        
            def has_next(): bool
                return _iterator.has_next()
                
            def next(): bool
                return _iterator.next()
                
            def new get(): Track
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
                
            _iterator: Iterator
