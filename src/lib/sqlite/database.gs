[indent=4]

uses
    Sqlite
    
namespace SqliteUtil

    /*
     * A wrapper for Sqlite.Database with useful utilities.
     */
    class Database
        construct(path: string, logger: string) raises SqliteUtil.Error
            _logger = Logging.get_logger("khovsgol.db")
            assert_ok(Sqlite.Database.open_v2(path, out _db, OPEN_READWRITE|OPEN_CREATE))
    
        prop readonly db: Sqlite.Database
        prop readonly logger: Logging.Logger
        
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
            var cols = statement.column_count()
            var result = statement.step()
            while result == ROW
                for var c = 0 to (cols - 1)
                    var txt = statement.column_text(c)
                    stdout.printf("%s = %s\n", statement.column_name(c), txt)
                result = statement.step()
