[indent=4]

uses
    Sqlite
    
namespace Khovsgol

    class DB: Object
        construct() raises Khovsgol.Error
            _logger = Logging.get_logger("khovsgol.db")
            
            var db_file = "%s/.khovsgol/khovsgol.db".printf(Environment.get_home_dir())
            assert_ok(Database.open_v2(db_file, out _db, OPEN_READWRITE|OPEN_CREATE))
            
            //dump_table("track")

            // Track table
            execute("CREATE TABLE IF NOT EXISTS track (path TEXT PRIMARY KEY, library TEXT, title TEXT COLLATE NOCASE, title_sort TEXT, artist TEXT COLLATE NOCASE, artist_sort TEXT, album TEXT COLLATE NOCASE, album_sort TEXT, position INTEGER, duration REAL, date INTEGER, type TEXT)")
            execute("CREATE INDEX IF NOT EXISTS track_library_idx ON track (library)")
            execute("CREATE INDEX IF NOT EXISTS track_title_idx ON track (title)")
            execute("CREATE INDEX IF NOT EXISTS track_title_sort_idx ON track (title_sort)")
            execute("CREATE INDEX IF NOT EXISTS track_artist_idx ON track (artist)")
            execute("CREATE INDEX IF NOT EXISTS track_artist_sort_idx ON track (artist_sort)")
            execute("CREATE INDEX IF NOT EXISTS track_album_sort_idx ON track (album_sort)")
            execute("CREATE INDEX IF NOT EXISTS track_date_idx ON track (date)")
            execute("CREATE INDEX IF NOT EXISTS track_type_idx ON track (type)")

            // Track pointers table
            execute("CREATE TABLE IF NOT EXISTS track_pointer (path TEXT, position INTEGER, album TEXT)")
            execute("CREATE INDEX IF NOT EXISTS track_pointer_position_idx ON track_pointer (position)")
            execute("CREATE INDEX IF NOT EXISTS track_pointer_album_idx ON track_pointer (album)")

            // Album table
            execute("CREATE TABLE IF NOT EXISTS album (path TEXT PRIMARY KEY, library TEXT, title TEXT COLLATE NOCASE, title_sort TEXT, artist TEXT COLLATE NOCASE, artist_sort TEXT, date INTEGER, compilation INTEGER, type TEXT)")
            execute("CREATE INDEX IF NOT EXISTS album_library_idx ON album (library)")
            execute("CREATE INDEX IF NOT EXISTS album_title_idx ON album (title)")
            execute("CREATE INDEX IF NOT EXISTS album_title_sort_idx ON album (title_sort)")
            execute("CREATE INDEX IF NOT EXISTS album_artist_idx ON album (artist)")
            execute("CREATE INDEX IF NOT EXISTS album_artist_sort_idx ON album (artist_sort)")
            execute("CREATE INDEX IF NOT EXISTS album_date_idx ON album (date)")
            execute("CREATE INDEX IF NOT EXISTS album_compilation_idx ON album (compilation)")
            execute("CREATE INDEX IF NOT EXISTS album_type_idx ON album (type)")

            // Scanned table
            execute("CREATE TABLE IF NOT EXISTS scanned (path TEXT PRIMARY KEY, timestamp REAL)")
            
        def get_album(path: string): Album? raises Khovsgol.Error
            statement: Statement
            assert_ok(_db.prepare_v2("SELECT library, title, title_sort, artist, artist_sort, date, compilation, type FROM album WHERE path=?", -1, out statement))
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

        def get_track(path: string): Track? raises Khovsgol.Error
            statement: Statement
            assert_ok(_db.prepare_v2("SELECT library, title, title_sort, artist, artist_sort, album, album_sort, position, duration, date, type FROM track WHERE path=?", -1, out statement))
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
        
        def private execute(sql: string) raises Khovsgol.Error
            statement: Statement
            assert_ok(_db.prepare_v2(sql, -1, out statement))
            assert_done(statement.step())
        
        def private assert_ok(result: int) raises Khovsgol.Error
            if result != OK
                _logger.warning("%d: %s", result, _db.errmsg())
                raise new Khovsgol.Error.DATABASE("%d: %s", result, _db.errmsg())

        def private assert_done(result: int) raises Khovsgol.Error
            if result != DONE
                _logger.warning("%d: %s", result, _db.errmsg())
                raise new Khovsgol.Error.DATABASE("%d: %s", result, _db.errmsg())
            
        def dump_table(name: string) raises Khovsgol.Error
            statement: Statement
            assert_ok(_db.prepare_v2("SELECT * FROM %s LIMIT 1".printf(name), -1, out statement))
            var cols = statement.column_count()
            var result = statement.step()
            while result == ROW
                for var c = 0 to (cols - 1)
                    var txt = statement.column_text(c)
                    stdout.printf("%s = %s\n", statement.column_name(c), txt)
                result = statement.step()
        
        _db: Database
        _logger: Logging.Logger
