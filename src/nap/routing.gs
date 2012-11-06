[indent=4]

uses
    Soup
    Gee

namespace Nap

    class Router: Handler
        construct()
            _routes = new dict of string, Handler

        prop readonly routes: dict of string, Handler
        
        def override handle(conversation: Conversation)
            var handler = routes[conversation.path]
            if handler is null
                for route in ((AbstractMap of string, Handler) routes).keys
                    if route.has_suffix("*")
                        var prefix = route.slice(0, route.length - 1)
                        if conversation.path.has_prefix(prefix)
                            handler = routes[route]
                            break
            if handler is not null
                handler.handle(conversation)
            else
                conversation.status_code = KnownStatusCode.NOT_FOUND

