[indent=4]

namespace Nap.Connector._Soup

    /*
     * Soup implementation of a Nap server conversation.
     */
    class ServerConversation: Object implements Nap.Conversation
        construct(server: Soup.Server, message: Soup.Message, path: string, query: HashTable?, client: Soup.ClientContext)
            _soup_server = server
            _soup_message = message
            _soup_client = client
            _method = _soup_message.method
            _path = path
            _query = new dict of string, string
            _variables = new dict of string, string
            if query is not null
                var query_ss = (HashTable of string, string) query
                for key in query_ss.get_keys()
                    _query[key] = query_ss.get(key)

        prop method: string
        prop path: string
        prop readonly query: dict of string, string = new dict of string, string
        prop readonly variables: dict of string, string = new dict of string, string

        prop request_media_type: string?
        prop request_text: string?
        prop request_json_object: Json.Object?
        prop request_json_array: Json.Array?
        
        prop status_code: uint = StatusCode.OK
        prop response_media_type: string?
        prop response_text: string?
        prop response_json_object: Json.Object?
        prop response_json_array: Json.Array?
            
        def get_entity(): string?
            /*var body = _soup_message.request_body
            var buffer = body.flatten()
            return (string) buffer.get_as_bytes().get_data()*/
            return (string) _soup_message.request_body.data // warning: "assignment discards `const' qualifer"
        
        def commit()
            response_json_to_text(self)

            _soup_message.set_status(_status_code)
            
            if _response_text is not null
                if _response_media_type is null
                    _response_media_type = "text/plain"
                _soup_message.set_response(_response_media_type, Soup.MemoryUse.COPY, _response_text.data)
            
            log()
                
        def pause()
            _soup_server.pause_message(_soup_message)

        def unpause()
            _soup_server.unpause_message(_soup_message)

        def private log()
            var entry = new NcsaCommonLogEntry()
            entry.address = _soup_client.get_address().get_physical()
            entry.user_identifier = _soup_client.get_auth_user()
            entry.method = _soup_message.method
            var query = _soup_message.get_uri().get_query()
            if (query is not null) && (query.length > 0)
                entry.path = "%s?%s".printf(_path, query)
            else
                entry.path = _path
            entry.protocol = _soup_message.get_http_version() == Soup.HTTPVersion.1_1 ? "HTTP/1.1" : "HTTP/1.0"
            entry.status_code = _soup_message.status_code
            if _response_text is not null
                entry.size = _response_text.data.length
            Logging.get_logger("nap.web").info(entry.to_string())

        _soup_server: Soup.Server
        _soup_message: Soup.Message
        _soup_client: Soup.ClientContext

    /*
     * Soup implementation of a Nap client conversation.
     */
    class ClientConversation: Object implements Nap.Conversation
        construct(soup_session: Soup.Session, base_url: string)
            _soup_session = soup_session
            _base_url = base_url
        
        prop method: string
        prop path: string
        prop readonly query: dict of string, string = new dict of string, string
        prop readonly variables: dict of string, string = new dict of string, string

        prop request_media_type: string?
        prop request_text: string?
        prop request_json_object: Json.Object?
        prop request_json_array: Json.Array?
        
        prop status_code: uint
        prop response_media_type: string?
        prop response_text: string?
        prop response_json_object: Json.Object?
        prop response_json_array: Json.Array?
        
        def get_entity(): string?
            if _soup_message is not null
                return (string) _soup_message.response_body.data
            else
                return null
        
        def commit()
            request_json_to_text(self)
            
            // If we have variables, render as template
            var p = _path
            if !_variables.is_empty
                p = Template.renderd(_path, _variables)
            
            var uri = new StringBuilder(_base_url)
            uri.append(p)

            // Add query to URI
            if !_query.is_empty
                uri.append("?")
                var i = _query.keys.iterator()
                while i.has_next()
                    var key = i.get()
                    uri.append(key)
                    uri.append("=")
                    uri.append(Soup.URI.encode(_query[key], null))
                    if i.has_next()
                        uri.append("&")
                    i.next()
            
            _soup_message = new Soup.Message(_method, uri.str)
            if _request_text is not null
                _soup_message.set_request(_request_media_type, Soup.MemoryUse.COPY, _request_text.data)
            _status_code = _soup_session.send_message(_soup_message)

        def pause()
            pass

        def unpause()
            pass
                
        _soup_session: Soup.Session
        _soup_message: Soup.Message
        _base_url: string

    /*
     * An HTTP server using Soup. Accepts conversations coming in
     * through a specified port.
     */
    class Server: Object implements Nap.Server
        prop static delay: ulong = 0

        construct(port: int, context: MainContext) raises Nap.Error
            _soup_server = new Soup.Server(Soup.SERVER_PORT, port, Soup.SERVER_ASYNC_CONTEXT, context)
            if _soup_server is null
                raise new Nap.Error.CONNECTOR("Could not create HTTP server at port %d, is the port already in use?".printf(port))
            
            _soup_server.add_handler(null, _handle)
            
        prop thread_pool: ThreadPool?

        def get_handler(): unowned Handler?
            return _handler
            
        def set_handler(handler: Handler?)
            _handler = handler
        
        def get_error_handler(): unowned ErrorHandler?
            return _error_handler
            
        def set_error_handler(handler: ErrorHandler?)
            _error_handler = handler

        def start()
            _soup_server.run_async()
        
        def _handle(server: Soup.Server, message: Soup.Message, path: string, query: HashTable?, client: Soup.ClientContext)
            if _handler is not null
                var conversation = new ServerConversation(server, message, path, query, client)
                if _thread_pool is not null
                    _thread_pool.submit(_handler, _error_handler, conversation)
                else
                    if delay > 0
                        Thread.usleep(delay)
                    try
                        _handler(conversation)
                    except e: GLib.Error
                        if _error_handler is not null
                            _error_handler(conversation, e)
                    conversation.commit()

        _soup_server: Soup.Server
        _handler: unowned Handler?
        _error_handler: unowned ErrorHandler? = default_error_handler

    /*
     * An HTTP client using Soup.
     */
    class Client: Object implements Nap.Client
        construct(base_url: string)
            _base_url = base_url
            _soup_session = new Soup.SessionSync()
            
        prop base_url: string

        def create_conversation(): Nap.Conversation raises GLib.Error
            return new ClientConversation(_soup_session, _base_url)

        _soup_session: Soup.Session
