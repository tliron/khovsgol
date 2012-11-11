[indent=4]

namespace Nap

    /*
     * A RESTful handler that forwards to other handlers by matching
     * the conversation path against templates.
     */
    class Router: GLib.Object implements Node
        def handle(conversation: Conversation) raises GLib.Error
            handler: unowned Handler = null
            var trivial_route = _trivial_routes[conversation.path]
            if trivial_route is not null
                handler = trivial_route.handler
            else
                for template_route in _template_routes
                    if template_route.template.matches(conversation)
                        handler = template_route.handler
                        break
            if handler is not null
                handler(conversation)
            else
                conversation.status_code = StatusCode.NOT_FOUND

        def add_node(pattern: string, node: Node)
            _ownerships.add(node)
            add_handler(pattern, node.handle)

        def add_handler(pattern: string, handler: Handler)
            if Template.is_trivial(pattern)
                _trivial_routes.set(pattern, new TrivialRoute(handler))
            else
                try
                    _template_routes.add(new TemplateRoute(new Template(pattern), handler))
                except e: RegexError
                    // This should never happen!
                    _trivial_routes.set(pattern, new TrivialRoute(handler))
                
        def add_regex_node(regex: Regex, node: Node) raises RegexError
            _ownerships.add(node)
            add_regex_handler(regex, node.handle)

        def add_regex_handler(regex: Regex, handler: Handler) raises RegexError
            _template_routes.add(new TemplateRoute(new Template.raw(regex), handler))
        
        _trivial_routes: dict of string, TrivialRoute = new dict of string, TrivialRoute
        _template_routes: list of TemplateRoute = new list of TemplateRoute
        _ownerships: Ownerships = new Ownerships

        class static private TrivialRoute
            construct(handler: Handler)
                _handler = handler
        
            prop readonly handler: unowned Handler
        
        class static private TemplateRoute
            construct(template: Template, handler: Handler)
                _template = template
                _handler = handler
        
            prop readonly template: Template
            prop readonly handler: unowned Handler

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
                
            _regex = new Regex(regex.str)

        construct raw(regex: Regex)
            _regex = regex
    
        prop readonly regex: Regex
        prop readonly variables: list of string = new list of string
        
        /*
         * Checks if the conversation path matches the template. Note
         * that if template has variables, they will be extracted into
         * the conversation (and URI-decoded).
         */
        def matches(conversation: Conversation): bool
            info: MatchInfo
            if _regex.match(conversation.path, 0, out info)
                for variable in _variables
                    conversation.variables[variable] = Soup.URI.decode(info.fetch_named(variable))
                return true
            else
                return false
