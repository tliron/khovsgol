[indent=4]

uses
    Sqlite
    
namespace Khovsgol

    class DB
        construct()
            var db_file = "%s/.khovsgol/khovsgol.db".printf(Environment.get_home_dir())
            Database.open_v2(db_file, out _db, OPEN_READWRITE|OPEN_CREATE)
            test()
            
        def test()
            statement: Statement
            var result = _db.prepare_v2("SELECT * from album LIMIT 1", -1, out statement)
            if result != ERROR
                var cols = statement.column_count()
                result = statement.step()
                while result == ROW
                    for var c = 0 to (cols - 1)
                        var txt = statement.column_text(c)
                        stdout.printf("%s = %s\n", statement.column_name(c), txt)
                    result = statement.step()
            else
                stdout.printf("SQL error: %d, %s\n", result, _db.errmsg())
        
        _db: Database
