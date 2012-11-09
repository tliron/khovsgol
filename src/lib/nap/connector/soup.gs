[indent=4]

namespace Nap.Connector._Soup

    class Handler: Object
        construct(handler: Nap.Handler)
            _handler = handler

        prop readonly handler: Nap.Handler
        prop thread_pool: Nap.ThreadPool
    
        def handle(server: Soup.Server, message: Soup.Message, path: string, query: HashTable?, client: Soup.ClientContext)
            var conversation = new Conversation(server, message, path, query)
            if _thread_pool is null
                if Server.delay > 0
                    Thread.usleep(Server.delay)
                _handler.handle(conversation)
                conversation.commit()
            else
                _thread_pool.handle(_handler, conversation)
    
    class Conversation: Object implements Nap.Conversation
        construct(server: Soup.Server, message: Soup.Message, path: string, query: HashTable?)
            _soup_server = server
            _soup_message = message
            _path = path
            _query = new dict of string, string
            _variables = new dict of string, string
            if query is not null
                var query_ss = (HashTable of string, string) query
                for key in query_ss.get_keys()
                    _query[key] = query_ss.get(key)
            
        prop readonly path: string
        prop readonly query: dict of string, string
        prop readonly variables: dict of string, string
        prop status_code: int = StatusCode.OK
        prop media_type: string?
        prop response_text: string?
        prop response_json: Json.Object?
        
        def get_method(): string
            return _soup_message.method
            
        def get_entity(): string
            /*var body = _soup_message.request_body
            var buffer = body.flatten()
            return (string) buffer.get_as_bytes().get_data()*/
            return (string) _soup_message.request_body.data // warning: "assignment discards `const' qualifer"
        
        def commit()
            json_to_text(self)

            _soup_message.set_status(_status_code)
            
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

    /**
     * An HTTP server base on Soup. Accepts conversations coming in
     * through a specified port.
     */
    class Server: Object implements Nap.Server
        prop static delay: ulong = 0

        construct(port: int, context: MainContext) raises Nap.Error
            _soup_server = new Soup.Server(Soup.SERVER_PORT, port, Soup.SERVER_ASYNC_CONTEXT, context)
            if _soup_server is null
                raise new Nap.Error.CONNECTOR("Could not create Soup server, is the port already in use?")
            _soup_server.request_started.connect(on_request_started)
            
        prop handler: Nap.Handler
            get
                return _handler
            set
                _handler = value
                if value is not null
                    _soup_handler = new Handler(value)
                    _soup_server.add_handler(null, _soup_handler.handle)
        
        prop thread_pool: ThreadPool
            get
                return _soup_handler.thread_pool
            set
                _soup_handler.thread_pool = value
        
        def start()
            _soup_server.run_async()
        
        def private static on_request_started(message: Soup.Message, client: Soup.ClientContext)
            pass
            
        _handler: Nap.Handler
        _soup_server: Soup.Server
        _soup_handler: Handler
