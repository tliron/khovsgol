[indent=4]

uses
    Sqlite
    SqliteUtil

namespace Khovsgol.Server._Sqlite

    /*
     * An implementation of Libraries over Sqlite.
     * 
     * Sqlite offers stunning performance, but at the cost of limited
     * multi-threaded behavior. While it is thread-safe and allows for
     * several concurrent connections, only one connection can have
     * write access. Furthmore, only one transaction can be active at
     * a time.
     * 
     * There are many ways to work around these limitations: using
     * connection pools for reads, while queuing all write operations
     * as messages to be handled by a single thread reading the queue.
     * The overhead and complexity of such solutions is considerable:
     * you improve concurrency at the cost of performance.
     * 
     * For this application, very high write concurrency is not a
     * priority. Performance is more important. Thus, we've decided that
     * a single shared connection makes the most sense. We enforce
     * transaction atomicity via a mutex.
     * 
     * To improve performance, we re-use prepared statements, again
     * guarding them with mutexes.
     */
    class Libraries: Khovsgol.Server.Libraries
        def override initialize() raises GLib.Error
            super.initialize()
        
            if _write_db is not null
                return
            
            var file = "%s/.khovsgol/khovsgol.db".printf(Environment.get_home_dir())
            _write_db = new SqliteUtil.Database(file, true)
            _read_db = _write_db
            
            // Memory use (100MB)
            _write_db.execute("PRAGMA page_size = 4096")
            _write_db.execute("PRAGMA cache_size = 25600")
            
            // Features
            _write_db.execute("PRAGMA synchronous = OFF")
            _write_db.execute("PRAGMA read_uncommitted = TRUE")
            _write_db.execute("PRAGMA journal_mode = WAL")
            
            // Track table
            _write_db.execute("CREATE TABLE IF NOT EXISTS track (path TEXT PRIMARY KEY, library TEXT, title TEXT COLLATE NOCASE, title_sort TEXT, artist TEXT COLLATE NOCASE, artist_sort TEXT, album TEXT COLLATE NOCASE, album_sort TEXT, album_type INTEGER(1), position INTEGER, duration REAL, date INTEGER, file_type TEXT)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS track_library_idx ON track (library)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS track_title_sort_idx ON track (title_sort)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS track_artist_idx ON track (artist)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS track_artist_sort_idx ON track (artist_sort)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS track_album_sort_idx ON track (album_sort)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS track_album_type_idx ON track (album_type)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS track_position_idx ON track (position)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS track_date_idx ON track (date)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS track_file_type_idx ON track (file_type)")

            // Track pointers table
            _write_db.execute("CREATE TABLE IF NOT EXISTS track_pointer (path TEXT, position INTEGER, album TEXT)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS track_pointer_position_idx ON track_pointer (position)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS track_pointer_album_idx ON track_pointer (album)")

            // Album table
            _write_db.execute("CREATE TABLE IF NOT EXISTS album (path TEXT PRIMARY KEY, library TEXT, title TEXT COLLATE NOCASE, title_sort TEXT, artist TEXT COLLATE NOCASE, artist_sort TEXT, date INTEGER(8), album_type INTEGER(1), file_type TEXT)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS album_library_idx ON album (library)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS album_title_sort_idx ON album (title_sort)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS album_artist_idx ON album (artist)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS album_artist_sort_idx ON album (artist_sort)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS album_date_idx ON album (date)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS album_album_type_idx ON album (album_type)")
            _write_db.execute("CREATE INDEX IF NOT EXISTS album_file_type_idx ON album (file_type)")

            // Scanned table
            _write_db.execute("CREATE TABLE IF NOT EXISTS scanned (path TEXT PRIMARY KEY, timestamp INTEGER(8))")
            
        def override write_begin() raises GLib.Error
            _write_mutex.lock()
            if not _writing
                _write_db.execute("BEGIN")
                _writing = true

        def override write_commit() raises GLib.Error
            try
                if _writing
                    _write_db.execute("COMMIT")
                    _writing = false
            except e: GLib.Error
                if _writing
                    _write_db.execute("ROLLBACK")
                    _writing = false
                raise e
            finally
                _write_mutex.unlock()

        def override write_rollback() raises GLib.Error
            try
                if _writing
                    _write_db.execute("ROLLBACK")
                    _writing = false
            finally
                _write_mutex.unlock()
            
        //
        // Tracks
        //
        
        def override get_track(path: string): Track? raises GLib.Error
            _get_track_mutex.lock()
            try
                if _get_track is null
                    _read_db.prepare(out _get_track, "SELECT library, title, title_sort, artist, artist_sort, album, album_sort, album_type, position, duration, date, file_type FROM track WHERE path=?")
                else
                    _get_track.reset()
                _get_track.bind_text(1, path)
                if _get_track.step() == ROW
                    var track = new Track()
                    track.path = path
                    track.library = _get_track.column_text(0)
                    track.title = _get_track.column_text(1)
                    track.title_sort = _get_track.column_text(2)
                    track.artist = _get_track.column_text(3)
                    track.artist_sort = _get_track.column_text(4)
                    track.album = _get_track.column_text(5)
                    track.album_sort = _get_track.column_text(6)
                    track.album_type = (AlbumType) _get_track.column_int(7)
                    track.position_in_album = _get_track.column_int(8)
                    track.duration = _get_track.column_double(9)
                    track.date = _get_track.column_int(10)
                    track.file_type = _get_track.column_text(11)
                    return track
                return null
            finally
                _get_track_mutex.unlock()
        
        def override save_track(track: Track) raises GLib.Error
            if _save_track is null
                _write_db.prepare(out _save_track, "INSERT OR REPLACE INTO track (path, library, title, title_sort, artist, artist_sort, album, album_sort, album_type, position, duration, date, file_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            else
                _save_track.reset()
            _save_track.bind_text(1, track.path)
            _save_track.bind_text(2, track.library)
            _save_track.bind_text(3, track.title)
            _save_track.bind_text(4, track.title_sort)
            _save_track.bind_text(5, track.artist)
            _save_track.bind_text(6, track.artist_sort)
            _save_track.bind_text(7, track.album)
            _save_track.bind_text(8, track.album_sort)
            _save_track.bind_int(9, track.album_type)
            _save_track.bind_int(10, track.position_in_album)
            _save_track.bind_double(11, track.duration)
            _save_track.bind_int(12, (int) track.date)
            _save_track.bind_text(13, track.file_type)
            _write_db.assert_done(_save_track.step())

        def override delete_track(path: string) raises GLib.Error
            if _delete_track1 is null
                _write_db.prepare(out _delete_track1, "DELETE FROM track WHERE path=?")
            else
                _delete_track1.reset()
            _delete_track1.bind_text(1, path)
            _write_db.assert_done(_delete_track1.step())

            // Delete track pointers
            // TODO: move positions in playlist?
            if _delete_track2 is null
                _write_db.prepare(out _delete_track2, "DELETE FROM track_pointer WHERE path=?")
            else
                _delete_track2.reset()
            _delete_track2.bind_text(1, path)
            _write_db.assert_done(_delete_track2.step())
            
            delete_timestamp(path)
            
        //
        // Track pointers
        //
        
        def override get_track_pointer(album: string, position: int): TrackPointer? raises GLib.Error
            _get_track_pointer_mutex.lock()
            try
                if _get_track_pointer is null
                    _read_db.prepare(out _get_track_pointer, "SELECT path FROM track_pointer WHERE album=? AND position=?")
                else
                    _get_track_pointer.reset()
                _get_track_pointer.bind_text(1, album)
                _get_track_pointer.bind_int(2, position)
                if _get_track_pointer.step() == ROW
                    var track_pointer = new TrackPointer()
                    track_pointer.path = _get_track_pointer.column_text(0)
                    track_pointer.position = position
                    track_pointer.album = album
                    return track_pointer
                return null
            finally
                _get_track_pointer_mutex.unlock()

        def override save_track_pointer(track_pointer: TrackPointer) raises GLib.Error
            if _save_track_pointer is null
                _write_db.prepare(out _save_track_pointer, "INSERT OR REPLACE INTO track_pointer (path, position, album) VALUES (?, ?, ?)")
            else
                _save_track_pointer.reset()
            _save_track_pointer.bind_text(1, track_pointer.path)
            _save_track_pointer.bind_int(2, track_pointer.position)
            _save_track_pointer.bind_text(3, track_pointer.album)
            _write_db.assert_done(_save_track_pointer.step())

        def override delete_track_pointer(album: string, position: int) raises GLib.Error
            // TODO: renumber the rest of the pointers?
            if _delete_track_pointer is null
                _write_db.prepare(out _delete_track_pointer, "DELETE FROM track_pointer WHERE album=? AND position=?")
            else
                _delete_track_pointer.reset()
            _delete_track_pointer.bind_text(1, album)
            _delete_track_pointer.bind_int(2, position)
            _write_db.assert_done(_delete_track_pointer.step())

        def override delete_track_pointers(album: string) raises GLib.Error
            if _delete_track_pointers is null
                _write_db.prepare(out _delete_track_pointers, "DELETE FROM track_pointer WHERE album=?")
            else
                _delete_track_pointers.reset()
            _delete_track_pointers.bind_text(1, album)
            _write_db.assert_done(_delete_track_pointers.step())

        def override move_track_pointers(album: string, delta: int, from_position: int = int.MIN) raises GLib.Error
            if from_position == int.MIN
                if _move_track_pointers1 is null
                    _write_db.prepare(out _move_track_pointers1, "UPDATE track_pointer SET position=position+? WHERE album=?")
                else
                    _move_track_pointers1.reset()
                _move_track_pointers1.bind_int(1, delta)
                _move_track_pointers1.bind_text(2, album)
                _write_db.assert_done(_move_track_pointers1.step())
            else
                if _move_track_pointers2 is null
                    _write_db.prepare(out _move_track_pointers2, "UPDATE track_pointer SET position=position+? WHERE album=? AND position>=?")
                else
                    _move_track_pointers2.reset()
                _move_track_pointers2.bind_int(1, delta)
                _move_track_pointers2.bind_text(2, album)
                _move_track_pointers2.bind_int(3, from_position)
                _write_db.assert_done(_move_track_pointers2.step())

        //
        // Albums
        //
        
        def override get_album(path: string): Album? raises GLib.Error
            _get_album_mutex.lock()
            try
                if _get_album is null
                    _read_db.prepare(out _get_album, "SELECT library, title, title_sort, artist, artist_sort, date, album_type, file_type FROM album WHERE path=?")
                else
                    _get_album.reset()
                _get_album.bind_text(1, path)
                if _get_album.step() == ROW
                    var album = new Album()
                    album.path = path
                    album.library = _get_album.column_text(0)
                    album.title = _get_album.column_text(1)
                    album.title_sort = _get_album.column_text(2)
                    album.artist = _get_album.column_text(3)
                    album.artist_sort = _get_album.column_text(4)
                    album.date = _get_album.column_int64(5)
                    album.album_type = (AlbumType) _get_album.column_int(6)
                    album.file_type = _get_album.column_text(7)
                    return album
                return null
            finally
                _get_album_mutex.unlock()
        
        def override save_album(album: Album) raises GLib.Error
            if _save_album is null
                _write_db.prepare(out _save_album, "INSERT OR REPLACE INTO album (path, library, title, title_sort, artist, artist_sort, date, album_type, file_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            else
                _save_album.reset()
            _save_album.bind_text(1, album.path)
            _save_album.bind_text(2, album.library)
            _save_album.bind_text(3, album.title)
            _save_album.bind_text(4, album.title_sort)
            _save_album.bind_text(5, album.artist)
            _save_album.bind_text(6, album.artist_sort)
            _save_album.bind_int64(7, (int64) album.date)
            _save_album.bind_int(8, album.album_type)
            _save_album.bind_text(9, album.file_type)
            _write_db.assert_done(_save_album.step())

        def override delete_album(path: string) raises GLib.Error
            // Delete track pointers
            if _delete_album1 is null
                _write_db.prepare(out _delete_album1, "DELETE FROM track_pointer WHERE album=? OR path LIKE ? ESCAPE \"\\\"")
            else
                _delete_album1.reset()
            _delete_album1.bind_text(1, path)
            _delete_album1.bind_text(2, escape_like(path + SEPARATOR) + "%")
            _write_db.assert_done(_delete_album1.step())

            // Delete tracks
            if _delete_album2 is null
                _write_db.prepare(out _delete_album2, "DELETE FROM track WHERE path LIKE ? ESCAPE \"\\\"")
            else
                _delete_album2.reset()
            _delete_album2.bind_text(1, escape_like(path + SEPARATOR) + "%")
            _write_db.assert_done(_delete_album2.step())

            // Delete album
            if _delete_album3 is null
                _write_db.prepare(out _delete_album3, "DELETE FROM album WHERE path=?")
            else
                _delete_album3.reset()
            _delete_album3.bind_text(1, path)
            _write_db.assert_done(_delete_album3.step())

            // Delete timestamps for tracks
            if _delete_album4 is null
                _write_db.prepare(out _delete_album4, "DELETE FROM scanned WHERE path LIKE ? ESCAPE \"\\\"")
            else
                _delete_album4.reset()
            _delete_album4.bind_text(1, escape_like(path + SEPARATOR) + "%")
            _write_db.assert_done(_delete_album4.step())

            delete_timestamp(path)
        
        //
        // Iterate tracks
        //
        
        def override iterate_tracks(args: IterateTracksArgs): IterableOfTrack raises GLib.Error
            var q = new QueryBuilder()
            q.table = "track"
            q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "album", "album_sort", "album_type", "position", "duration", "date", "file_type")
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
            if not likes.is_empty
                q.requirements.add("(" + join(" OR ", likes) + ")")

            return new SqlTracks(q.execute(_read_db, _statement_cache))

        def override iterate_tracks_in_album(args: IterateForAlbumArgs): IterableOfTrack raises GLib.Error
            var q = new QueryBuilder()
            q.table = "track"
            q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "album", "album_sort", "album_type", "position", "duration", "date", "file_type")
            q.sort.add_all(args.sort)
            q.requirements.add("path LIKE ? ESCAPE \"\\\"")
            q.bindings.add(escape_like(args.album + SEPARATOR) + "%")

            return new SqlTracks(q.execute(_read_db, _statement_cache))
        
        def override iterate_tracks_by_artist(args: IterateForArtistArgs): IterableOfTrack raises GLib.Error
            var q = new QueryBuilder()
            q.table = "track"
            q.sort.add_all(args.sort)
            parse_libraries(q, "", args.libraries)
                
            if (args.artist is null) or (args.artist.length == 0)
                // Tracks by unknown artist
                q.add_fields("path", "library", "title", "title_sort", "album", "album_sort", "album_type", "position", "duration", "date", "file_type")
                q.requirements.add("artist IS NULL OR artist=''")
            else
                if args.like
                    q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "album", "album_sort", "album_type", "position", "duration", "date", "file_type")
                    q.requirements.add("artist LIKE ? ESCAPE \"\\\"")
                else
                    // Optimized handling using a constant in case of strict equality
                    q.add_fields("path", "library", "title", "title_sort", "artist_sort", "album", "album_sort", "album_type", "position", "duration", "date", "file_type")
                    q.requirements.add("artist=?")
                    q.constants["artist"] = args.artist
                q.bindings.add(args.artist)

            return new SqlTracks(q.execute(_read_db, _statement_cache))
        
        def override iterate_track_paths(path: string): IterableOfString raises GLib.Error
            var q = new QueryBuilder.with_sql("SELECT path FROM track WHERE path LIKE ? ESCAPE \"\\\" ORDER BY path")
            q.bindings.add(escape_like(path + SEPARATOR) + "%")

            return new SqlStrings(q.execute(_read_db, _statement_cache), "path")
        
        //
        // Iterate track pointers
        //
        
        def override iterate_raw_track_pointers_in_album(args: IterateForAlbumArgs): IterableOfTrackPointer raises GLib.Error
            var q = new QueryBuilder()
            q.table = "track_pointer"
            q.add_fields("path", "position")
            q.sort.add_all(args.sort)
            q.requirements.add("album=?")
            q.bindings.add(args.album)
            q.constants["album"] = args.album

            return new SqlTrackPointers(q.execute(_read_db, _statement_cache))

        def override iterate_track_pointers_in_album(args: IterateForAlbumArgs): IterableOfTrack raises GLib.Error
            var q = new QueryBuilder()
            q.table = "track_pointer LEFT JOIN track ON track_pointer.path=track.path INNER JOIN album ON track_pointer.album=album.path"
            q.add_fields("track_pointer.path", "track.library", "track.title", "track.title_sort", "track.artist", "track.artist_sort", "album.title AS album", "album.title_sort AS album_sort", "track.album_type", "track_pointer.position", "track.duration", "track.date", "track.file_type")
            q.requirements.add("track_pointer.album=?")
            q.bindings.add(args.album)
            
            // Fix sort
            var fixed_sort = new list of string
            for s in args.sort
                if (s == "position") or (s == "album") or (s == "path")
                    s = "track_pointer." + s
                else
                    s = "track." + s
                fixed_sort.add(s)
            q.sort.add_all(fixed_sort)

            return new SqlTracks(q.execute(_read_db, _statement_cache))

        def override iterate_track_pointers(args: IterateTracksArgs): IterableOfTrack raises GLib.Error
            var q = new QueryBuilder()
            q.table = "track_pointer LEFT JOIN track ON track_pointer.path=track.path INNER JOIN album ON track_pointer.album=album.path"
            q.add_fields("track_pointer.path", "track.library", "track.title", "track.title_sort", "track.artist", "track.artist_sort", "album.title AS album", "album.title_sort AS album_sort", "track.album_type", "track_pointer.position", "track.duration", "track.date", "track.file_type", "track_pointer.album AS album_path")
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
                likes.add("track_pointer.album LIKE ? ESCAPE \"\\\"") // TODO: really? from track_pointer?
                q.bindings.add(args.album_like)
            if not likes.is_empty
                q.requirements.add("(" + join(" OR ", likes) + ")")

            // Fix sort
            var fixed_sort = new list of string
            for s in args.sort
                if (s == "position") or (s == "path")
                    s = "track_pointer." + s
                else
                    s = "track." + s
                fixed_sort.add(s)
            q.sort.add_all(fixed_sort)

            return new SqlTracks(q.execute(_read_db, _statement_cache))
        
        //
        // Iterate albums
        //
        
        def override iterate_albums(args: IterateAlbumsArgs): IterableOfAlbum raises GLib.Error
            var q = new QueryBuilder()
            q.table = "album"
            q.sort.add_all(args.sort)
            parse_libraries(q, "", args.libraries)
            
            // Album type
            if args.album_type != AlbumType.ANY
                q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "date", "file_type")
                q.requirements.add("album_type=?")
                q.bindings.add((int) args.album_type)
                q.constants["album_type"] = (int) args.album_type
            else
                q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "date", "album_type", "file_type")

            return new SqlAlbums(q.execute(_read_db, _statement_cache))

        def override iterate_album_paths(path: string): IterableOfString raises GLib.Error
            var q = new QueryBuilder()
            q.table = "album"
            q.fields.add("path")
            q.requirements.add("path LIKE ? ESCAPE \"\\\"")
            q.bindings.add(escape_like(path + SEPARATOR) + "%")

            return new SqlStrings(q.execute(_read_db, _statement_cache), "path")
        
        def override iterate_albums_with_artist(args: IterateForArtistArgs): IterableOfAlbum raises GLib.Error
            var q = new QueryBuilder()
            q.table = "album INNER JOIN track ON album.title=track.album"
            q.add_fields("album.path", "album.library", "album.title", "album.title_sort", "album.artist", "album.artist_sort", "album.date", "album.album_type", "album.file_type")
            q.sort.add_all(args.sort)
            q.constraint = "DISTINCT"
            parse_libraries(q, "album.", args.libraries)
            
            if args.like
                q.requirements.add("track.artist LIKE ? ESCAPE \"\\\"")
            else
                q.requirements.add("track.artist=?")
            q.bindings.add(args.artist)

            return new SqlAlbums(q.execute(_read_db, _statement_cache))

        def override iterate_albums_by_artist(args: IterateForArtistArgs): IterableOfAlbum raises GLib.Error
            var q = new QueryBuilder()
            q.table = "album"
            q.sort.add_all(args.sort)
            parse_libraries(q, "", args.libraries)
            
            if (args.artist is null) or (args.artist.length == 0)
                // Albums with unknown artist
                q.add_fields("path", "library", "title", "title_sort", "date", "file_type")
                q.requirements.add("artist IS NULL OR artist=''")
                q.requirements.add("album_type=?")
                q.bindings.add((int) AlbumType.ARTIST)
                q.constants["album_type"] = (int) AlbumType.ARTIST
            else
                if args.like
                    q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "date", "album_type", "file_type")
                    q.requirements.add("artist LIKE ? ESCAPE \"\\\"")
                else
                    // Optimized handling using a constant in case of strict equality
                    q.add_fields("path", "library", "title", "title_sort", "artist_sort", "date", "album_type", "file_type")
                    q.requirements.add("artist=?")
                    q.constants["artist"] = args.artist
                q.bindings.add(args.artist)
            
            return new SqlAlbums(q.execute(_read_db, _statement_cache))
        
        def override iterate_albums_at(args: IterateForDateArgs): IterableOfAlbum raises GLib.Error
            var q = new QueryBuilder()
            q.table = "album"
            q.sort.add_all(args.sort)
            parse_libraries(q, "", args.libraries)
            
            if (args.date == int.MIN) or (args.date == 0)
                q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "album_type", "file_type")
                q.requirements.add("date IS NULL OR date=0")
                q.constants["date"] = int64.MIN
            else
                if args.like
                    q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "date", "album_type", "file_type")
                    q.requirements.add("date LIKE ? ESCAPE \"\\\"")
                else
                    // Optimized handling using a constant in case of strict equality
                    q.add_fields("path", "library", "title", "title_sort", "artist", "artist_sort", "album_type", "file_type")
                    q.requirements.add("date=?")
                    q.constants["date"] = (int64) args.date
                q.bindings.add(args.date.to_string())

            return new SqlAlbums(q.execute(_read_db, _statement_cache))
        
        //
        // Iterate artists
        //
        
        def override iterate_artists(args: IterateByAlbumsOrTracksArgs): IterableOfArtist raises GLib.Error
            var q = new QueryBuilder()
            q.table = args.album_artist ? "album" : "track"
            q.add_fields("artist", "artist_sort")
            q.sort.add_all(args.sort)
            q.requirements.add("artist IS NOT NULL")
            q.constraint = "DISTINCT"
            parse_libraries(q, "", args.libraries)

            return new SqlArtists(q.execute(_read_db, _statement_cache))
            
        //
        // Iterate dates
        //
        
        def override iterate_dates(args: IterateByAlbumsOrTracksArgs): IterableOfInt raises GLib.Error
            var q = new QueryBuilder()
            q.table = args.album_artist ? "album" : "track"
            q.add_fields("date")
            q.sort.add_all(args.sort)
            q.requirements.add("date IS NOT NULL and date != 0")
            q.constraint = "DISTINCT"
            parse_libraries(q, "", args.libraries)

            return new SqlInts(q.execute(_read_db, _statement_cache), "date")
            
        //
        // Timestamps
        //
        
        def override get_timestamp(path: string): int64 raises GLib.Error
            _get_timestamp_mutex.lock()
            try
                if _get_timestamp is null
                    _read_db.prepare(out _get_timestamp, "SELECT timestamp FROM scanned WHERE path=?")
                else
                    _get_timestamp.reset()
                _get_timestamp.bind_text(1, path)
                if _get_timestamp.step() == ROW
                    return _get_timestamp.column_int64(0)
                return int64.MIN
            finally
                _get_timestamp_mutex.unlock()

        def override set_timestamp(path: string, timestamp: int64) raises GLib.Error
            if _set_timestamp is null
                _write_db.prepare(out _set_timestamp, "INSERT OR REPLACE INTO scanned (path, timestamp) VALUES (?, ?)")
            else
                _set_timestamp.reset()
            _set_timestamp.bind_text(1, path)
            _set_timestamp.bind_int64(2, timestamp)
            _write_db.assert_done(_set_timestamp.step())

        def override delete_timestamp(path: string) raises GLib.Error
            if _delete_timestamp is null
                _write_db.prepare(out _delete_timestamp, "DELETE FROM scanned WHERE path=?")
            else
                _delete_timestamp.reset()
            _delete_timestamp.bind_text(1, path)
            _write_db.assert_done(_delete_timestamp.step())

        _write_db: SqliteUtil.Database
        _read_db: SqliteUtil.Database
        
        _write_mutex: GLib.RecMutex = GLib.RecMutex()
        _writing: bool = false
        
        _get_track: Statement
        _get_track_mutex: GLib.Mutex = GLib.Mutex()
        _save_track: Statement
        _delete_track1: Statement
        _delete_track2: Statement
        _get_track_pointer: Statement
        _get_track_pointer_mutex: GLib.Mutex = GLib.Mutex()
        _save_track_pointer: Statement
        _delete_track_pointer: Statement
        _delete_track_pointers: Statement
        _move_track_pointers1: Statement
        _move_track_pointers2: Statement
        _get_album: Statement
        _get_album_mutex: GLib.Mutex = GLib.Mutex()
        _save_album: Statement
        _delete_album1: Statement
        _delete_album2: Statement
        _delete_album3: Statement
        _delete_album4: Statement
        _get_timestamp: Statement
        _get_timestamp_mutex: GLib.Mutex = GLib.Mutex()
        _set_timestamp: Statement
        _delete_timestamp: Statement
        _statement_cache: StatementCache = new StatementCache()
