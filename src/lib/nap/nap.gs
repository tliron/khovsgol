[indent=4]

namespace Nap

    exception Error
        CONNECTOR

    /*
     * HTTP status codes.
     */
    namespace StatusCode
        const OK: uint = 200
        const BAD_REQUEST: uint = 400
        const NOT_FOUND: uint = 404
        const METHOD_NOT_ALLOWED: uint = 405
        const INTERNAL_SERVER_ERROR: uint = 500
    
    /*
     * HTTP methods.
     */
    namespace Method
        const GET: string = "GET"
        const PUT: string = "PUT"
        const POST: string = "POST"
        const DELETE: string = "DELETE"

    /*
     * A RESTful conversation.
     */
    interface Conversation: Object
        prop abstract method: string
        prop abstract path: string
        prop abstract readonly query: dict of string, string
        prop abstract readonly variables: dict of string, string
        
        prop abstract request_media_type: string?
        prop abstract request_text: string?
            owned get
        prop abstract request_json_object: Json.Object?
            owned get
        prop abstract request_json_array: Json.Array?
            owned get
        prop abstract readonly request_form: dict of string, string
        
        prop abstract status_code: uint
        prop abstract response_media_type: string?
        prop abstract response_text: string?
            owned get
        prop abstract response_json_object: Json.Object?
            owned get
        prop abstract response_json_array: Json.Array?
            owned get

        prop abstract readonly peer: string?
        
        event committed(conversation: Conversation)
        
        def abstract commit(asynchronous: bool = false)
        def abstract pause()
        def abstract unpause()

    /*
     * A holder for conversation information; does not actually do
     * anything with a server, but useful for calling handlers,
     * allowing you to treat them as a non-wired RESTful API.
     */
    class MockConversation: Object implements Conversation
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
                
        prop request_json_array: Json.Array?
            owned get
                return _request_json_array
            set
                _request_json_array = value

        prop readonly request_form: dict of string, string = new dict of string, string
        
        prop status_code: uint
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
                
        prop response_json_array: Json.Array?
            owned get
                return _response_array
            set
                _response_array = value

        prop readonly peer: string? = null
            
        def commit(asynchronous: bool = false)
            pass
            
        def pause()
            pass
            
        def unpause()
            pass
        
        _request_text: string?
        _request_json_object: Json.Object?
        _request_json_array: Json.Array?
        _response_text: string?
        _response_object: Json.Object?
        _response_array: Json.Array?

    /*
     * A RESTful conversation handler.
     */
    delegate Handler(conversation: Conversation) raises GLib.Error

    /*
     * A RESTful error handler.
     */
    delegate ErrorHandler(conversation: Conversation, error: GLib.Error)
    
    /*
     * A RESTful conversation node.
     */
    interface Node: Object
        def abstract handle(conversation: Conversation) raises GLib.Error

    /*
     * A RESTful server.
     */
    interface Server: Object
        prop abstract thread_pool: ThreadPool?
        prop abstract readonly port: uint
        
        // Note: we get compilation errors if we use a properties for handler/error_handler
        
        def abstract get_handler(): unowned Handler?
        def abstract set_handler(handler: Handler?)
        def abstract get_error_handler(): unowned ErrorHandler?
        def abstract set_error_handler(ErrorHandler: Handler?)

        def abstract start() raises Error

    /*
     * A RESTful client.
     */
    interface Client: Object
        prop abstract base_url: string
        prop abstract timeout: uint

        def abstract create_conversation(): Conversation raises GLib.Error
