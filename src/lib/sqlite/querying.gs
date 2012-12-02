[indent=4]

uses
    Sqlite
    
namespace SqliteUtil

    /*
     * String join for Gee.Iterable.
     */
    def static join(sep: string, items: Gee.Iterable of string): string
        var str = new StringBuilder()
        var i = items.iterator()
        while i.has_next()
            i.next()
            str.append(i.get())
            if i.has_next()
                str.append(sep)
        return str.str
    
    /*
     * String join for multiples of a string.
     */
    def static join_same(sep: string, item: string, num: int): string
        var str = new StringBuilder()
        num--
        for var i = 0 to num
            str.append(item)
            if i < num
                str.append(sep)
        return str.str

    /*
     * Escapes a string for use in SQL's LIKE, where '\' is the escape
     * character.
     */
    def static escape_like(text: string): string
        return text.replace("%", "\\%").replace("_", "\\_")

    /*
     * Wrapper for Sqlite.Statement rows, allowing fetching of column
     * values by name.
     */
    class Row
        construct(iterator: Iterator, columns: int)
            _iterator = iterator
            for var c = 0 to (columns - 1)
                _column_names[iterator.statement.column_name(c)] = c
        
        def get_text(name: string): string
            var value = _iterator.query.constants[name]
            if value is null
                value = _iterator.statement.column_text(_column_names[name])
            return value

        def get_int(name: string): int
            return _iterator.statement.column_int(_column_names[name])

        def get_double(name: string): double
            return _iterator.statement.column_double(_column_names[name])
    
        _iterator: Iterator
        _column_names: dict of string, int = new dict of string, int
    
    /*
     * Row iterator for Sqlite.Statement.
     */
    class Iterator
        construct(db: Database, query: Query) raises SqliteUtil.Error
            db.prepare(out _statement, query.as_sql)
            var index = 1
            for var binding in query.bindings
                if binding.holds(typeof(string))
                    _statement.bind_text(index++, (string) binding)
                else if binding.holds(typeof(int))
                    _statement.bind_int(index++, (int) binding)

            _done = false
            _columns = _statement.column_count()
            _query = query
            
        prop readonly statement: Statement
        prop readonly query: Query

        def get(): Row
            return new Row(self, _columns)
        
        def has_next(): bool
            if !_done
                _result = _statement.step()
                _done = true
            return _result == ROW
        
        def next(): bool
            _done = false
            return _result == ROW
            
        _columns: int
        _result: int
        _done: bool
    
    /*
     * SQL query builder.
     */
    class Query
        prop table: string
        prop readonly fields: list of string = new list of string
        prop readonly constants: dict of string, string = new dict of string, string
        prop readonly requirements: list of string = new list of string
        prop readonly bindings: list of GLib.Value? = new list of GLib.Value?
        prop readonly sort: list of string = new list of string
        prop constraint: string? = null
        
        prop readonly as_sql: string
            owned get
                var query = new StringBuilder()
                query.append("SELECT ")
                if (constraint is not null) && (constraint.length > 0)
                    query.append(constraint)
                    query.append(" ")
                query.append(join(",", fields))
                query.append(" FROM ")
                query.append(table)
                if !requirements.is_empty
                    query.append(" WHERE ")
                    query.append(join(" AND ", requirements))
                if !sort.is_empty
                    query.append(" ORDER BY ")
                    query.append(join(",", sort))

                return query.str
        
        def add_fields(first: string, ...)
            _fields.add(first)
            var args = va_list()
            arg: string? = args.arg()
            while arg is not null
                _fields.add(arg)
                arg = args.arg()
        
        def execute(db: Database): Iterator raises SqliteUtil.Error
            return new Iterator(db, self)
