[indent=4]

namespace Nap

    /*
     * A RESTful handler that forwards to other handlers by matching
     * the conversation path against templates.
     */
    class Router: GLib.Object implements Handler
        construct()
            _trivials = new dict of string, Handler
            _routes = new list of Route
    
        def handle(conversation: Conversation)
            var handler = _trivials[conversation.path]
            if handler is null
                for route in _routes
                    if route.template.matches(conversation)
                        handler = route.handler
                        break
            if handler is not null
                handler.handle(conversation)
            else
                conversation.status_code = StatusCode.NOT_FOUND

        def add(pattern: string, handler: Handler)
            if Template.is_trivial(pattern)
                _trivials.set(pattern, handler)
            else
                try
                    _routes.add(new Route(new Template(pattern), handler))
                except e: RegexError
                    // This should never happen!
                    _trivials.set(pattern, handler)
                
        def add_regex(regex: Regex, handler: Handler) raises RegexError
            _routes.add(new Route(new Template.raw(regex), handler))
        
        _trivials: dict of string, Handler
        _routes: list of Route
        
        class static private Route
            construct(template: Template, handler: Handler)
                _template = template
                _handler = handler
        
            prop readonly template: Template
            prop readonly handler: Handler

    /*
     * Simplified implementation of URI templates:
     * 
     * http://tools.ietf.org/html/rfc6570
     * 
     * Variables can be specified by the "{name}" notation. Patterns
     * ending in a "*" will match any suffix.
     */
    class Template
        def static is_trivial(pattern: string): bool
            return !pattern.has_suffix("*") && (pattern.index_of_char('{') < 0)

        construct(pattern: string) raises RegexError
            _variables = new list of string
        
            var p = pattern
            var regex = new StringBuilder("^")
            
            wildcard: bool = false
            if p.has_suffix("*")
                p = p.slice(0, pattern.length - 1)
                wildcard = true
                
            var start = p.index_of_char('{')
            if start < 0
                regex.append(Regex.escape_string(p))
            else
                var last = 0
                while start >= 0
                    var end = p.index_of_char('}', start + 1)
                    if end >= 0
                        regex.append(Regex.escape_string(p.slice(last, start)))
                        regex.append("(?<")
                        var variable = p.slice(start + 1, end)
                        _variables.add(variable)
                        regex.append(variable)
                        regex.append(">[^/]*)")
                        last = end + 1
                        start = p.index_of_char('{', last)
                    else
                        break
                if last < p.length
                    regex.append(Regex.escape_string(p.slice(last, p.length)))
            
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
         * Checks if the conversation path matches the template. Note
         * that if template has variables, they will be extracted into
         * the conversation.
         */
        def matches(conversation: Conversation): bool
            info: MatchInfo
            if _regex.match(conversation.path, 0, out info)
                for variable in _variables
                    conversation.variables[variable] = info.fetch_named(variable)
                return true
            else
                return false
