[indent=4]

uses
    Soup // apt-get install libsoup-2.4-dev, valac --pkg libsoup-2.4
    Json // apt-get install libjson-glib-dev, valac --pkg json-glib-1.0

namespace Nap

    class abstract Handler: GLib.Object
        prop thread_pool: ThreadPool# // must be owned by us!
        
        def soup_handle(server: Soup.Server, message: Soup.Message, path: string, query: GLib.HashTable?, client: Soup.ClientContext)
            var conversation = new Conversation(server, message, path, query)
            if _thread_pool is null
                handle(conversation)
                conversation.commit()
            else
                _thread_pool.handle(self, conversation)
                    
        def virtual handle(conversation: Conversation)
            pass

    class Router: Handler
        construct()
            _routes = new dict of string, Handler

        prop readonly routes: dict of string, Handler#
        
        def override handle(conversation: Conversation)
            var handler = routes[conversation.path]
            if handler is not null
                handler.handle(conversation)
            else
                conversation.status_code = Soup.KnownStatusCode.NOT_FOUND

    class Resource: Handler
        def override handle(conversation: Conversation)
            var method = conversation.get_method()
            if method == "GET"
                get(conversation)
            else if method == "POST"
                post(conversation)
            else if method == "PUT"
                put(conversation)
            else if method == "DELETE"
                self.delete(conversation)
            
        def virtual new get(conversation: Conversation)
            conversation.status_code = Soup.KnownStatusCode.METHOD_NOT_ALLOWED

        def virtual post(conversation: Conversation)
            conversation.status_code = Soup.KnownStatusCode.METHOD_NOT_ALLOWED

        def virtual put(conversation: Conversation)
            conversation.status_code = Soup.KnownStatusCode.METHOD_NOT_ALLOWED

        def virtual delete(conversation: Conversation)
            conversation.status_code = Soup.KnownStatusCode.METHOD_NOT_ALLOWED
    
    class DocumentResource: Resource
        def override get(conversation: Conversation)
            conversation.response_json = get_json(conversation)

        def override post(conversation: Conversation)
            print conversation.get_entity()

        def virtual get_json(conversation: Conversation): Json.Object
            return new Json.Object()

    class Conversation: GLib.Object
        construct(server: Soup.Server, message: Soup.Message, path: string, query: GLib.HashTable?)
            _soup_server = server
            _soup_message = message
            _path = path
            if query is null
                _query = new GLib.HashTable of string, string(null, null)
            else
                _query = query
                
            _soup_server.ref()
            _soup_message.ref()
            
        final
            _soup_server.unref()
            _soup_message.unref()
            
        prop readonly path: string
        prop readonly query: GLib.HashTable of string, string#
        prop status_code: int = Soup.KnownStatusCode.OK
        prop media_type: string#
        prop response_text: string#
        prop response_json: Json.Object#
        
        def get_method(): string
            return _soup_message.method
            
        def get_entity(): string
            var body = _soup_message.request_body
            var buffer = body.flatten()
            buffer.get_as_bytes()
            return "as"
        
        def commit()
            // Status code
            _soup_message.set_status(_status_code)
            
            // Special handling for JSON
            if _response_json is not null
                var human = _query.get("human") == "true"
                _response_text = JSON.to(_response_json, human)
                if _media_type is null
                    _media_type = "application/json"
                    
            // Textual response
            if _response_text is not null
                if _media_type is null
                    _media_type = "text/plain"
                _soup_message.set_response(_media_type, Soup.MemoryUse.COPY, _response_text.data)
                
        def pause()
            _soup_server.pause_message(_soup_message)

        def unpause()
            _soup_server.unpause_message(_soup_message)

        _soup_server: Soup.Server
        _soup_message: Soup.Message
        
    class Server: GLib.Object
        construct(port: int, context: MainContext)
            _soup_server = new Soup.Server(Soup.SERVER_PORT, port, Soup.SERVER_ASYNC_CONTEXT, context)
            
        prop handler: Handler
            set
                add_route(null, value)
        
        def add_route(path: string?, handler: Handler)
            _soup_server.add_handler(path, handler.soup_handle)
        
        def start()
            _soup_server.run_async()

        _soup_server: Soup.Server

    class ThreadPool: GLib.Object
        construct(max_threads: int) raises ThreadError
            _thread_pool = new GLib.ThreadPool of Context((Func) _handle, max_threads, true)
        
        prop readonly max_threads: int
            get
                return _thread_pool.get_max_threads()

        def handle(handler: Handler, conversation: Conversation)
            try
                conversation.pause()
                var context = new Context(handler, conversation)
                context.ref() // ThreadPool does not own the context!
                _thread_pool.push(context)
            except e: ThreadError
                print e.message
    
        _thread_pool: GLib.ThreadPool of Context

        def static _handle(context: Context)
            context.handler.handle(context.conversation)
            context.conversation.commit()
            context.conversation.unpause()
            context.unref()

        class private static Context: GLib.Object
            construct(handler: Handler, conversation: Conversation)
                _handler = handler
                _conversation = conversation
                
                _handler.ref()
                _conversation.ref()

            final
                _handler.unref()
                _conversation.unref()

            prop readonly handler: Handler
            prop readonly conversation: Conversation
