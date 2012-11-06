[indent=4]

// apt-get install libgee-dev, valac --pkg gee-1.0

uses
    Soup // apt-get install libsoup-2.4-dev, valac --pkg libsoup-2.4

namespace Nap

    class Router: Handler
        construct()
            _routes = new dict of string, Handler

        prop readonly routes: dict of string, Handler
        
        def override handle(conversation: Conversation)
            var handler = routes[conversation.path]
            if handler is null
                for route in ((Gee.AbstractMap of string, Handler) routes).keys
                    if route.has_suffix("*")
                        var prefix = route.slice(0, route.length - 1)
                        if conversation.path.has_prefix(prefix)
                            handler = routes[route]
                            break
            if handler is not null
                handler.handle(conversation)
            else
                conversation.status_code = Soup.KnownStatusCode.NOT_FOUND

