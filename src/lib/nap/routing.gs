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
