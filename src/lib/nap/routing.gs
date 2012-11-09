[indent=4]

namespace Nap

    /*
     * Maps route patterns to handlers.
     * 
     * Patterns ending with a "*" will match any routes with that prefix.
     */
    class Map: GLib.Object
        construct()
            _exact = new dict of string, Handler
            _template = new dict of Template, Handler
    
        def add(pattern: string, handler: Handler)
            if needs_regex(pattern)
                try
                    _template.set(new Template(pattern), handler)
                except e: RegexError
                    pass
            else
                _exact.set(pattern, handler)
                
        def add_regex(regex: Regex, handler: Handler) raises RegexError
            _template.set(new Template.raw(regex), handler)
        
        def get_route(path: string, out handler: Handler, out variables: dict of string, string?)
            handler = _exact[path]
            variables = null
            if handler is null
                for template in ((Gee.AbstractMap of Template, Handler) _template).keys
                    info: MatchInfo
                    if template.regex.match(path, 0, out info)
                        variables = new dict of string, string
                        for variable in template.variables
                            variables[variable] = info.fetch_named(variable)
                        handler = _template[template]
                        break

        _exact: dict of string, Handler
        _template: dict of Template, Handler

        def private static needs_regex(pattern: string): bool
            return pattern.has_suffix("*") || ((pattern.index_of_char('{') >= 0) && (pattern.index_of_char('}') >= 0))
    
    class Template
        construct(original: string) raises RegexError
            _variables = new list of string
        
            var pattern = original
            var regex = new StringBuilder("^")
            
            wildcard: bool = false
            if pattern.has_suffix("*")
                pattern = pattern.slice(0, pattern.length - 1)
                wildcard = true
                
            var start = pattern.index_of_char('{')
            if start < 0
                regex.append(Regex.escape_string(pattern))
            else
                var last = 0
                while start >= 0
                    var end = pattern.index_of_char('}', start + 1)
                    if end >= 0
                        regex.append(Regex.escape_string(pattern.slice(last, start)))
                        regex.append("(?<")
                        var variable = pattern.slice(start + 1, end)
                        _variables.add(variable)
                        regex.append(variable)
                        regex.append(">[^/]*)")
                        last = end + 1
                        start = pattern.index_of_char('{', last)
                    else
                        break
                if last < pattern.length
                    regex.append(Regex.escape_string(pattern.slice(last, pattern.length)))
            
            if !wildcard
                regex.append("$")
            
            //print original
            //print regex.str
                
            _regex = new Regex(regex.str)

        construct raw(regex: Regex)
            _regex = regex
            _variables = new list of string
    
        prop readonly regex: Regex
        prop readonly variables: list of string

    /*
     * A RESTful handler that forwards to other handlers according to
     * a routing map.
     */
    class Router: GLib.Object implements Handler
        construct()
            _map = new Map

        prop readonly map: Map
        
        def handle(conversation: Conversation)
            handler: Handler
            variables: dict of string, string
            _map.get_route(conversation.path, out handler, out variables)
            if variables is not null
                conversation.variables.set_all(variables)
            if handler is not null
                handler.handle(conversation)
            else
                conversation.status_code = StatusCode.NOT_FOUND
