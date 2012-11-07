[indent=4]

uses
    Soup
    Json

namespace Nap

    class SoupHandler: GLib.Object
        construct(handler: Handler)
            _handler = handler

        prop readonly handler: Handler
        prop thread_pool: ThreadPool
    
        def soup_handle(server: Soup.Server, message: Message, path: string, query: HashTable?, client: ClientContext)
            var conversation = new SoupConversation(server, message, path, query)
            if _thread_pool is null
                if SoupServer.delay > 0
                    Thread.usleep(SoupServer.delay)
                _handler.handle(conversation)
                conversation.commit()
            else
                _thread_pool.handle(_handler, conversation)
    
    class SoupConversation: GLib.Object implements Conversation
        construct(server: Soup.Server, message: Message, path: string, query: HashTable?)
            _soup_server = server
            _soup_message = message
            _path = path
            _query = new dict of string, string
            if query is not null
                var query_ss = (HashTable of string, string) query
                for key in query_ss.get_keys()
                    _query[key] = query_ss.get(key)
            
        prop readonly path: string
        prop readonly query: dict of string, string
        prop status_code: int = KnownStatusCode.OK
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
            // Status code
            _soup_message.set_status(_status_code)
            
            // Special handling for JSON
            if _response_json is not null
                var jsonp = _query["jsonp"]
                var human = jsonp is null && _query["human"] == "true"
                _response_text = JSON.to(_response_json, human)
                if jsonp is not null
                    _response_text = "%s(%s)".printf(jsonp, _response_text)
                if _media_type is null
                    _media_type = "application/json"
                    
            // Textual response
            if _response_text is not null
                if _media_type is null
                    _media_type = "text/plain"
                _soup_message.set_response(_media_type, MemoryUse.COPY, _response_text.data)
                
        def pause()
            _soup_server.pause_message(_soup_message)

        def unpause()
            _soup_server.unpause_message(_soup_message)

        _soup_server: Soup.Server
        _soup_message: Soup.Message

    /*
     * An HTTP server. Accepts conversations coming in through a specified port.
     */
    class SoupServer: GLib.Object implements Server
        construct(port: int, context: MainContext)
            _soup_server = new Soup.Server(SERVER_PORT, port, SERVER_ASYNC_CONTEXT, context)
            _soup_server.request_started.connect(on_request_started)
            
        prop static delay: ulong = 0

        prop handler: Handler
            get
                return _handler
            set
                _handler = value
                if value is not null
                    _soup_handler = new SoupHandler(value)
                    _soup_server.add_handler(null, _soup_handler.soup_handle)
        
        prop thread_pool: ThreadPool
            get
                return _soup_handler.thread_pool
            set
                _soup_handler.thread_pool = value
        
        def start()
            _soup_server.run_async()
        
        def on_request_started(message: Message, client: ClientContext)
            pass
            
        _handler: Handler
        _soup_server: Soup.Server
        _soup_handler: SoupHandler

