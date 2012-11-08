[indent=4]

namespace Nap

    class Routes: GLib.Object
        construct()
            _exact = new dict of string, Handler
            _prefix = new dict of string, Handler
    
        def add(route: string, handler: Handler)
            if route.has_suffix("*")
                var prefix = route.slice(0, route.length - 1)
                _prefix.set(prefix, handler)
            else
                _exact.set(route, handler)

        def new get(route: string): Handler?
            var handler = _exact[route]
            if handler is null
                for prefix in ((Gee.AbstractMap of string, Handler) _prefix).keys
                    if route.has_prefix(prefix)
                        return _prefix[prefix]
            return handler

        _exact: dict of string, Handler
        _prefix: dict of string, Handler

    class Router: GLib.Object implements Handler
        construct()
            _routes = new Routes

        prop readonly routes: Routes
        
        def handle(conversation: Conversation)
            var handler = routes.get(conversation.path)
            if handler is not null
                handler.handle(conversation)
            else
                conversation.status_code = StatusCode.NOT_FOUND

