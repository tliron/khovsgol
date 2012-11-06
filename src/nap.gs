[indent=4]

uses
    Soup // apt-get install libsoup-2.4-dev, valac --pkg libsoup-2.4
    Json // apt-get install libjson-glib-dev, valac --pkg json-glib-1.0

namespace Nap

    class abstract Handler: GLib.Object
        prop thread_pool: ThreadPool
        
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

        prop readonly routes: dict of string, Handler
        
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
            var entity = conversation.get_entity()
            try
                var obj = JSON.from(entity)
                if obj is not null
                    conversation.response_json = post_json(conversation, obj)
                else
                    bad_request(conversation, "No entity")
            except e: JSON.Error
                bad_request(conversation, e.message)

        def virtual get_json(conversation: Conversation): Json.Object?
            return new Json.Object()

        def virtual post_json(conversation: Conversation, entity: Json.Object): Json.Object?
            return new Json.Object()
        
        def static bad_request(conversation: Conversation, message: string)
            var json = new Json.Object()
            json.set_string_member("error", message)
            conversation.response_json = json
            conversation.status_code = Soup.KnownStatusCode.BAD_REQUEST

    class Conversation: GLib.Object
        construct(server: Soup.Server, message: Soup.Message, path: string, query: GLib.HashTable?)
            _soup_server = server
            _soup_message = message
            _path = path
            _query = new dict of string, string
            if query is not null
                var query_ss = (GLib.HashTable of string, string) query
                for key in query_ss.get_keys()
                    _query[key] = query_ss.get(key)
            
        prop readonly path: string
        prop readonly query: dict of string, string
        prop status_code: int = Soup.KnownStatusCode.OK
        prop media_type: string?
        prop response_text: string?
        prop response_json: Json.Object?
        
        def get_method(): string
            return _soup_message.method
            
        def get_entity(): string
            var body = _soup_message.request_body
            var buffer = body.flatten()
            var data = buffer.get_as_bytes().get_data()
            return ((string) data).dup()
        
        def commit()
            // Status code
            _soup_message.set_status(_status_code)
            
            // Special handling for JSON
            if _response_json is not null
                var human = _query["human"] == "true"
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
