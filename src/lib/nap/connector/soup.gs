[indent=4]

namespace Nap._Soup

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
            owned get
                var entity = (string) _soup_message.request_body.data
                if (entity is not null) and (entity.length > 0)
                    return entity
                return null
            set
                pass
                
        prop request_json_object: Json.Object?
            owned get
                var entity = request_text
                if entity is null
                    return null
                try
                    return JsonUtil.from_object(entity)
                except e: JsonUtil.Error
                    return null
            set
                pass
                
        prop request_json_array: Json.Array?
            owned get
                var entity = request_text
                if entity is null
                    return null
                try
                    return JsonUtil.from_array(entity)
                except e: JsonUtil.Error
                    return null
            set
                pass

        prop readonly request_form: dict of string, string = new dict of string, string
        
        prop status_code: uint = StatusCode.OK
        prop response_media_type: string?
        
        prop response_text: string?
            owned get
                return _response_text
            set
                _response_text = value
                
        prop response_json_object: Json.Object?
            owned get
                return _response_object
            set
                _response_object = value
                if value is not null
                    var jsonp = _query["jsonp"]
                    var human = jsonp is null and _query["human"] == "true"
                    _response_text = JsonUtil.object_to(value, human)
                    if jsonp is not null
                        _response_text = "%s(%s)".printf(jsonp, _response_text)
                    if _response_media_type is null
                        _response_media_type = "application/json"
                
        prop response_json_array: Json.Array?
            owned get
                return _response_array
            set
                _response_array = value
                if value is not null
                    var jsonp = _query["jsonp"]
                    var human = jsonp is null and _query["human"] == "true"
                    _response_text = JsonUtil.array_to(value, human)
                    if jsonp is not null
                        _response_text = "%s(%s)".printf(jsonp, _response_text)
                    if _response_media_type is null
                        _response_media_type = "application/json"

        prop readonly peer: string?
            get
                return _soup_client.get_host() 
        
        def commit(asynchronous: bool = false)
            _soup_message.set_status(_status_code)
            
            if _response_text is not null
                if _response_media_type is null
                    _response_media_type = "text/plain"
                _soup_message.set_response(_response_media_type, Soup.MemoryUse.COPY, _response_text.data)
            
            committed(self)
            log()
                
        def pause()
            _soup_server.pause_message(_soup_message)

        def unpause()
            _soup_server.unpause_message(_soup_message)

        def private log()
            if _logger.can(LogLevelFlags.LEVEL_INFO)
                var entry = new NcsaCommonLogEntry()
                entry.address = _soup_client.get_address().get_physical()
                entry.user_identifier = _soup_client.get_auth_user()
                entry.method = _soup_message.method
                var query = _soup_message.get_uri().get_query()
                if (query is not null) and (query.length > 0)
                    entry.path = "%s?%s".printf(_path, query)
                else
                    entry.path = _path
                entry.protocol = _soup_message.get_http_version() == Soup.HTTPVersion.1_1 ? "HTTP/1.1" : "HTTP/1.0"
                entry.status_code = _soup_message.status_code
                if _response_text is not null
                    entry.size = _response_text.data.length
                _logger.info(entry.as_string)

        _soup_server: Soup.Server
        _soup_message: Soup.Message
        _soup_client: Soup.ClientContext
        _response_text: string?
        _response_object: Json.Object?
        _response_array: Json.Array?

        _logger: static Logging.Logger

        init
            _logger = Logging.get_logger("nap.server.ncsa")

    /*
     * Soup implementation of a Nap client conversation.
     */
    class ClientConversation: Object implements Nap.Conversation
        construct(soup_session: Soup.Session, base_url: string?)
            _soup_session = soup_session
            _base_url = base_url
        
        prop method: string
        prop path: string
        prop readonly query: dict of string, string = new dict of string, string
        prop readonly variables: dict of string, string = new dict of string, string

        prop request_media_type: string?
        
        prop request_text: string?
            owned get
                return _request_text
            set
                _request_text = value
                
        prop request_json_object: Json.Object?
            owned get
                return _request_json_object
            set
                _request_json_object = value
                if value is not null
                    _request_text = JsonUtil.object_to(value)
                    if _request_media_type is null
                        _request_media_type = "application/json"
                
        prop request_json_array: Json.Array?
            owned get
                return _request_json_array
            set
                _request_json_array = value
                if value is not null
                    _request_text = JsonUtil.array_to(value)
                    if _request_media_type is null
                        _request_media_type = "application/json"
        
        prop readonly request_form: dict of string, string = new dict of string, string
        
        prop status_code: uint
        prop response_media_type: string?
        
        prop response_text: string?
            owned get
                if _soup_message is not null
                    var entity = (string) _soup_message.response_body.data
                    if (entity is not null) and (entity.length > 0)
                        return entity
                return null
            set
                pass
                
        prop response_json_object: Json.Object?
            owned get
                var entity = response_text
                if entity is null
                    return null
                try
                    return JsonUtil.from_object(entity)
                except e: JsonUtil.Error
                    return null
            set
                pass
                
        prop response_json_array: Json.Array?
            owned get
                var entity = response_text
                if entity is null
                    return null
                try
                    return JsonUtil.from_array(entity)
                except e: JsonUtil.Error
                    return null
            set
                pass
        
        prop readonly peer: string? = null
        
        def commit(asynchronous: bool = false)
            if _base_url is null
                return
        
            // If we have variables, render as template
            var p = _path
            if not _variables.is_empty
                p = Template.renderd(_path, _variables)
            
            var uri = new StringBuilder(_base_url)
            if p is not null
                uri.append(p)

            // Add query to URI
            if not _query.is_empty
                uri.append("?")
                var i = _query.keys.iterator()
                while i.next()
                    var key = i.get()
                    uri.append(key)
                    uri.append("=")
                    uri.append(Soup.URI.encode(_query[key], "+"))
                    if i.has_next()
                        uri.append("&")
            
            var uri_str = uri.str
            _soup_message = new Soup.Message(_method, uri_str)
            
            if (_request_text is null) and not _request_form.is_empty
                var hash_table = new HashTable of string, string(str_hash, str_equal)
                for var key in _request_form.keys
                    hash_table.@set(key, _request_form[key])
                _request_text = Soup.Form.encode_hash(hash_table)
                _request_media_type = "application/x-www-form-urlencoded"
                
            if _request_text is not null
                _soup_message.set_request(_request_media_type, Soup.MemoryUse.COPY, _request_text.data)
                
            if asynchronous
                ref()
                _soup_session.queue_message(_soup_message, on_message_handled)
            else
                var timer = new Timer()
                _status_code = _soup_session.send_message(_soup_message)
                timer.stop()
                _logger.debugf("%s (%.2f ms)", uri_str, timer.elapsed() * 1000.0)
                committed(self)

        def pause()
            pass

        def unpause()
            pass
        
        _soup_session: Soup.Session
        _soup_message: Soup.Message
        _base_url: string?
        _request_text: string?
        _request_json_object: Json.Object?
        _request_json_array: Json.Array?
        
        def private on_message_handled(session: Soup.Session, message: Soup.Message)
            _status_code = message.status_code
            _logger.debugf("Async done: %s", message.uri.to_string(false))
            committed(self)
            
            // We need to kill our instance *after* this callback returns,
            // otherwise, if we are the only reference to it, the Soup session
            // might be destroyed
            Soup.add_idle(_soup_session.async_context, kill)
        
        def private kill(): bool
            unref()
            return false

        _logger: static Logging.Logger

        init
            _logger = Logging.get_logger("nap.client")

    /*
     * An HTTP server using Soup. Accepts conversations coming in
     * through a specified port.
     */
    class Server: Object implements Nap.Server
        prop static delay: ulong = 0

        construct(port: uint, context: MainContext) raises Nap.Error
            _port = port
            _soup_server = new Soup.Server(Soup.SERVER_PORT, port, Soup.SERVER_ASYNC_CONTEXT, context)
            if _soup_server is null
                raise new Nap.Error.CONNECTOR("Could not create HTTP server at port %u, is the port already in use?", port)
            
            _soup_server.add_handler(null, _handle)
            
        prop thread_pool: ThreadPool?
        prop readonly port: uint
        
        def get_handler(): unowned Handler?
            return _handler
            
        def set_handler(handler: Handler?)
            _handler = handler
        
        def get_error_handler(): unowned ErrorHandler?
            return _error_handler
            
        def set_error_handler(handler: ErrorHandler?)
            _error_handler = handler

        def start()
            if _thread_pool is null
                _logger.messagef("Starting server at port %u (single-threaded)", _port)
            else
                _logger.messagef("Starting server at port %u (%u threads)", _port, _thread_pool.max_threads)
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

        _logger: static Logging.Logger

        init
            _logger = Logging.get_logger("nap.server.soup")

    /*
     * An HTTP client using Soup.
     */
    class Client: Object implements Nap.Client
        construct(context: MainContext? = null)
            if context is not null
                // Note: we are using a SessionSync even for asynchronous calls; those will happen in another thread. 
                // See note at: http://developer.gnome.org/libsoup/stable/libsoup-client-howto.html
                _soup_session = new Soup.SessionSync.with_options(Soup.SESSION_USER_AGENT, "Nap", Soup.SERVER_ASYNC_CONTEXT, context)
            else
                _soup_session = new Soup.SessionSync.with_options(Soup.SESSION_USER_AGENT, "Nap")
        
        prop timeout: uint
            get
                return _soup_session.timeout
            set
                _soup_session.timeout = value
            
        prop base_url: string
            get
                _base_url_lock.lock()
                try
                    return _base_url
                finally
                    _base_url_lock.unlock()
            set
                _base_url_lock.lock()
                try
                    _base_url = value
                finally
                    _base_url_lock.unlock()

        def create_conversation(): Nap.Conversation raises GLib.Error
            return new ClientConversation(_soup_session, base_url)

        _soup_session: Soup.Session
        _base_url: string
        _base_url_lock: Mutex = Mutex()
