[indent=4]

uses
    Sqlite
    
namespace SqliteUtil

    /*
     * String join for Gee.Iterable.
     */
    def join(sep: string, items: Gee.Iterable of string): string
        var str = new StringBuilder()
        var i = items.iterator()
        while i.next()
            str.append(i.get())
            if i.has_next()
                str.append(sep)
        return str.str
    
    /*
     * String join for multiples of a string.
     */
    def join_same(sep: string, item: string, num: int): string
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
    def escape_like(text: string): string
        return text.replace("%", "\\%").replace("_", "\\_")
        
    /*
     * Wrapper for Sqlite.Statement rows, allowing fetching of column
     * values by name.
     */
    class Row
        construct(iterator: RowIterator)
            _iterator = iterator
        
        def get_text(name: string): string?
            var value = _iterator.builder.constants[name]
            if value is null
                if _iterator.column_names.has_key(name)
                    return _iterator.statement->column_text(_iterator.column_names[name])
                else
                    return null
            else
                return (string) value

        def get_int64(name: string): int64
            var value = _iterator.builder.constants[name]
            if value is null
                if _iterator.column_names.has_key(name)
                    return _iterator.statement->column_int64(_iterator.column_names[name])
                else
                    return int64.MIN
            else
                return (int64) value

        def get_int64_or_min(name: string): int64
            var value = get_int64(name)
            return value != 0 ? value : int64.MIN

        def get_int(name: string): int
            var value = _iterator.builder.constants[name]
            if value is null
                if _iterator.column_names.has_key(name)
                    return _iterator.statement->column_int(_iterator.column_names[name])
                else
                    return int.MIN
            else
                return (int) value

        def get_int_or_min(name: string): int
            var value = get_int(name)
            return value != 0 ? value : int.MIN

        def get_double(name: string): double
            var value = _iterator.builder.constants[name]
            if value is null
                if _iterator.column_names.has_key(name)
                    return _iterator.statement->column_double(_iterator.column_names[name])
                else
                    return double.MIN
            else
                return (double) value

        def get_double_or_min(name: string): double
            var value = get_double(name)
            return value != 0 ? value : double.MIN
    
        _iterator: RowIterator
    
    /*
     * Row iterator for Sqlite.Statement.
     */
    class RowIterator: Object implements Gee.Iterator of Row
        construct(statement: Statement*, delete_statement: bool, unlock_mutex: GLib.Mutex*, builder: QueryBuilder)
            _statement = statement
            _unlock_mutex = unlock_mutex
            _delete_statement = delete_statement
            _builder = builder

            var index = 1
            for var binding in builder.bindings
                if binding.holds(typeof(string))
                    _statement->bind_text(index++, (string) binding)
                else if binding.holds(typeof(int64))
                    _statement->bind_int64(index++, (int64) binding)
                else if binding.holds(typeof(int))
                    _statement->bind_int(index++, (int) binding)
                else if binding.holds(typeof(double))
                    _statement->bind_double(index++, (double) binding)

            var columns = _statement->column_count()
            var last = columns - 1
            for var c = 0 to last
                _column_names[_statement->column_name(c)] = c
        
        final
            if _unlock_mutex is not null
                _unlock_mutex->unlock()
            if _delete_statement
                delete _statement
            
        prop readonly statement: Statement*
        prop readonly builder: QueryBuilder
        prop readonly column_names: dict of string, int = new dict of string, int
        
        def next(): bool
            _first = false
            _result = _statement->step()
            return _result == ROW
        
        def new @get(): Row
            return new Row(self)
        
        def first(): bool
            return _first

        def has_next(): bool
            return true // TODO
        
        def remove()
            pass
            
        _unlock_mutex: GLib.Mutex*
        _delete_statement: bool
        _first: bool = true
        _result: int
    
    /*
     * SQL query builder.
     */
    class QueryBuilder
        construct with_sql(sql: string)
            _sql = sql
    
        prop table: string
        prop readonly fields: list of string = new list of string
        prop readonly constants: dict of string, GLib.Value? = new dict of string, GLib.Value?
        prop readonly requirements: list of string = new list of string
        prop readonly bindings: list of GLib.Value? = new list of GLib.Value?
        prop readonly sort: list of string = new list of string
        prop constraint: string? = null
        
        prop readonly sql: string
            get
                if _sql is null
                    var query = new StringBuilder()
                    query.append("SELECT ")
                    if (constraint is not null) and (constraint.length > 0)
                        query.append(constraint)
                        query.append(" ")
                    query.append(join(",", fields))
                    query.append(" FROM ")
                    query.append(table)
                    var size = requirements.size
                    if size == 1
                        query.append(" WHERE %s".printf(requirements.@get(0)))
                    else if size > 1
                        query.append(" WHERE (")
                        query.append(join(") AND (", requirements))
                        query.append(")")
                    if not sort.is_empty
                        query.append(" ORDER BY ")
                        query.append(join(",", sort))

                    _sql = query.str
                return _sql
        
        def add_fields(first: string, ...)
            _fields.add(first)
            var args = va_list()
            arg: string? = args.arg()
            while arg is not null
                _fields.add(arg)
                arg = args.arg()
        
        def execute(db: Database, cache: StatementCache): RowIterator raises SqliteUtil.Error
            var mutex = cache.get_mutex(sql)
            mutex->lock()
            try
                statement: Statement*
                statement = cache.get_or_prepare_statement(sql, db)
                return new RowIterator(statement, false, mutex, self)
            except e: SqliteUtil.Error
                mutex->unlock()
                raise e
        
        _sql: string

    /*
     * Thread-safe cache of reusable prepared statements.
     */
    class StatementCache
        final
            for var key in _mutexes.keys
                g_mutex_free(_mutexes[key])

            for var key in _statements.keys
                var value = _statements[key]
                if value is not null
                    delete value
    
        def get_mutex(sql: string): GLib.Mutex*
            _mutex.lock()
            try
                var mutex = _mutexes[sql]
                if mutex is null
                    mutex = g_mutex_new()
                    _mutexes[sql] = mutex
                return mutex
            finally
                _mutex.unlock()
        
        def get_or_prepare_statement(sql: string, db: Database): Statement* raises SqliteUtil.Error
            _mutex.lock()
            try
                var statement = _statements[sql]
                if statement is null
                    db.prepare(out statement, sql)
                    _statements[sql] = statement
                else
                    statement->reset()
                return statement
            finally
                _mutex.unlock()
        
        _mutex: GLib.Mutex = GLib.Mutex()
        _mutexes: dict of string, GLib.Mutex* = new dict of string, GLib.Mutex*
        _statements: dict of string, Statement* = new dict of string, Statement*

def extern g_mutex_new(): GLib.Mutex*
def extern g_mutex_free(mutex: GLib.Mutex*)
