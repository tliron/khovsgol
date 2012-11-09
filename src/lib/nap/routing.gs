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
            _prefix = new dict of string, Handler
    
        def add(pattern: string, handler: Handler)
            if pattern.has_suffix("*")
                var prefix = pattern.slice(0, pattern.length - 1)
                _prefix.set(prefix, handler)
            else
                _exact.set(pattern, handler)

        def new get(route: string): Handler?
            var handler = _exact[route]
            if handler is null
                for prefix in ((Gee.AbstractMap of string, Handler) _prefix).keys
                    if route.has_prefix(prefix)
                        return _prefix[prefix]
            return handler

        _exact: dict of string, Handler
        _prefix: dict of string, Handler

    /*
     * A RESTful handler that forwards to other handlers according to
     * a routing map.
     */
    class Router: GLib.Object implements Handler
        construct()
            _map = new Map

        prop readonly map: Map
        
        def handle(conversation: Conversation)
            var handler = _map.get(conversation.path)
            if handler is not null
                handler.handle(conversation)
            else
                conversation.status_code = StatusCode.NOT_FOUND
