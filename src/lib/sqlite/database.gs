[indent=4]

uses
    Sqlite
    
namespace SqliteUtil

    def enable_multithreaded(): bool
        return config(Config.MULTITHREAD) != OK
    
    /*
     * A wrapper for Sqlite.Database with useful utilities.
     */
    class Database: Object
        construct(path: string) raises SqliteUtil.Error
            assert_ok(Sqlite.Database.open_v2(path, out _db, OPEN_READWRITE|OPEN_CREATE))
            _logger.messagef("Opened %s", path)
    
        prop readonly db: Sqlite.Database
        
        def prepare(out statement: Statement, sql: string) raises SqliteUtil.Error
            assert_ok(_db.prepare_v2(sql, -1, out statement))
        
        def execute(sql: string) raises SqliteUtil.Error
            statement: Statement
            assert_ok(_db.prepare_v2(sql, -1, out statement))
            assert_done(statement.step())
        
        def assert_ok(result: int) raises SqliteUtil.Error
            if result != OK
                _logger.warningf("%d: %s", result, _db.errmsg())
                raise new SqliteUtil.Error.ERRMSG("Sqlite %d: %s", result, _db.errmsg())

        def assert_done(result: int) raises SqliteUtil.Error
            if result != DONE
                _logger.warningf("%d: %s", result, _db.errmsg())
                raise new SqliteUtil.Error.ERRMSG("Sqlite %d: %s", result, _db.errmsg())
                
        def dump_table(name: string) raises SqliteUtil.Error
            statement: Statement
            assert_ok(_db.prepare_v2("SELECT * FROM %s LIMIT 1".printf(name), -1, out statement))
            var columns = statement.column_count()
            var last = columns - 1
            var result = statement.step()
            while result == ROW
                for var c = 0 to last
                    var txt = statement.column_text(c)
                    stdout.printf("%s = %s\n", statement.column_name(c), txt)
                result = statement.step()

        init
            _logger = Logging.get_logger("sqlite")
            _logger.messagef("Initialized Sqlite %s", Sqlite.libversion())

    _logger: Logging.Logger
