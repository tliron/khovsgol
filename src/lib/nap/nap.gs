[indent=4]

uses
    Soup
    Json

namespace Nap

    /*
     * The base class for all RESTful conversation handlers.
     */
    class abstract Handler: GLib.Object
        prop thread_pool: ThreadPool
        
        def virtual handle(conversation: Conversation)
            pass

        def soup_handle(server: Soup.Server, message: Message, path: string, query: HashTable?, client: ClientContext)
            var conversation = new Conversation(server, message, path, query)
            if _thread_pool is null
                if Server.delay > 0
                    Thread.usleep(Server.delay)
                handle(conversation)
                conversation.commit()
            else
                _thread_pool.handle(self, conversation)

    delegate HandlerDelegate(conversation: Conversation)

    /*
     * A RESTful conversation.
     */
    class Conversation: GLib.Object
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
            var data = buffer.get_as_bytes().get_data()*/
            var str = (string) _soup_message.request_body.data // warning: "assignment discards `const' qualifer"
            return str //.dup()
        
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
    class Server: GLib.Object
        construct(port: int, context: MainContext)
            _soup_server = new Soup.Server(SERVER_PORT, port, SERVER_ASYNC_CONTEXT, context)
            _soup_server.request_started.connect(on_request_started)
            
        prop root_handler: Handler
            set
                add_route(null, value)
        
        def add_route(path: string?, handler: Handler)
            _soup_server.add_handler(path, handler.soup_handle)
        
        def start()
            _soup_server.run_async()
        
        def on_request_started(message: Message, client: ClientContext)
            pass
            
        prop static delay: ulong = 0

        _soup_server: Soup.Server
