[indent=4]

uses
    Sqlite
    
namespace SQLite

    def static join(sep: string, items: Gee.Iterable of string): string
        var str = new StringBuilder()
        var i = items.iterator()
        while i.has_next()
            i.next()
            str.append(i.get())
            if i.has_next()
                str.append(sep)
        return str.str
    
    def static join_same(sep: string, item: string, num: int): string
        var str = new StringBuilder()
        num--
        for var i = 0 to num
            str.append(item)
            if i < num
                str.append(sep)
        return str.str

    def static escape_like(text: string): string
        return text.replace("%", "\\%").replace("_", "\\_")

    /*
     * Simplified use of SQLite.
     */
    class Database
        construct(path: string, logger: string) raises SQLite.Error
            _logger = Logging.get_logger("khovsgol.db")
            assert_ok(Sqlite.Database.open_v2(path, out _db, OPEN_READWRITE|OPEN_CREATE))
    
        prop readonly db: Sqlite.Database
        prop readonly logger: Logging.Logger
        
        def prepare(out statement: Statement, sql: string) raises SQLite.Error
            assert_ok(_db.prepare_v2(sql, -1, out statement))
        
        def execute(sql: string) raises SQLite.Error
            statement: Statement
            assert_ok(_db.prepare_v2(sql, -1, out statement))
            assert_done(statement.step())
        
        def assert_ok(result: int) raises SQLite.Error
            if result != OK
                _logger.warning("%d: %s", result, _db.errmsg())
                raise new SQLite.Error.ERRMSG("%d: %s", result, _db.errmsg())

        def assert_done(result: int) raises SQLite.Error
            if result != DONE
                _logger.warning("%d: %s", result, _db.errmsg())
                raise new SQLite.Error.ERRMSG("%d: %s", result, _db.errmsg())
                
        def dump_table(name: string) raises SQLite.Error
            statement: Statement
            assert_ok(_db.prepare_v2("SELECT * FROM %s LIMIT 1".printf(name), -1, out statement))
            var cols = statement.column_count()
            var result = statement.step()
            while result == ROW
                for var c = 0 to (cols - 1)
                    var txt = statement.column_text(c)
                    stdout.printf("%s = %s\n", statement.column_name(c), txt)
                result = statement.step()
