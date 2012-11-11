[indent=4]

uses
    Sqlite
    
namespace SQLite

    class Row
        construct(iterator: Iterator, columns: int)
            _iterator = iterator
            for var c = 0 to (columns - 1)
                _column_names[iterator.statement.column_name(c)] = c
        
        def get_text(name: string): string
            var value = _iterator.constants[name]
            if value is null
                value = _iterator.statement.column_text(_column_names[name])
            return value

        def get_int(name: string): int
            return _iterator.statement.column_int(_column_names[name])

        def get_double(name: string): double
            return _iterator.statement.column_double(_column_names[name])
    
        _iterator: Iterator
        _column_names: dict of string, int = new dict of string, int
    
    class Iterator
        construct(db: Database, query: Query) raises SQLite.Error
            db.prepare(out _statement, query.to_sql())
            var index = 1
            for var binding in query.bindings
                _statement.bind_text(index++, binding)

            _result = _statement.step()
            _columns = _statement.column_count()
            _constants = query.constants
            
        prop readonly statement: Statement
        prop readonly constants: dict of string, string

        def get(): Row
            return new Row(self, _columns)
        
        def has_next(): bool
            return _result == ROW
        
        def next(): bool
            _result = _statement.step()
            return _result == ROW
            
        _columns: int
        _result: int = ERROR
    
    class Query
        prop table: string
        prop readonly fields: list of string = new list of string
        prop readonly constants: dict of string, string = new dict of string, string
        prop readonly requirements: list of string = new list of string
        prop readonly bindings: list of string = new list of string
        prop readonly sort: list of string = new list of string
        prop constraint: string = ""
        
        def add_fields(first: string, ...)
            _fields.add(first)
            var args = va_list()
            arg: string? = args.arg()
            while arg is not null
                _fields.add(arg)
                arg = args.arg()
        
        def to_sql(): string
            var query = new StringBuilder()
            query.append("SELECT ")
            if constraint.length > 0
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
        
        def execute(db: Database): Iterator raises SQLite.Error
            return new Iterator(db, self)
