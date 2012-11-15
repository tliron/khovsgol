[indent=4]

namespace Nap

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
        prop abstract readonly path: string
        prop abstract readonly query: dict of string, string
        prop abstract readonly variables: dict of string, string
        prop abstract status_code: uint
        prop abstract media_type: string?
        prop abstract response_text: string?
        prop abstract response_json_object: Json.Object?
        prop abstract response_json_array: Json.Array?
        
        def abstract get_method(): string
        def abstract get_entity(): string?
        def abstract commit()
        def abstract pause()
        def abstract unpause()

    /*
     * A holder for conversation information; does not actually do
     * anything with a server, but useful for calling handlers,
     * allowing you to treat them as a non-wired RESTful API.
     */
    class MockConversation: Object implements Conversation
        prop readonly path: string
        prop readonly query: dict of string, string
        prop readonly variables: dict of string, string
        prop status_code: uint = StatusCode.OK
        prop media_type: string?
        prop response_text: string?
        prop response_json_object: Json.Object?
        prop response_json_array: Json.Array?
        prop method: string
        prop entity: string?

        def get_method(): string
            return _method
            
        def get_entity(): string?
            return _entity
        
        def commit()
            pass
            
        def pause()
            pass
            
        def unpause()
            pass
                    
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
        
        def abstract get_handler(): unowned Handler?
        def abstract set_handler(handler: Handler?)
        def abstract get_error_handler(): unowned ErrorHandler?
        def abstract set_error_handler(ErrorHandler: Handler?)

        def abstract start()

    /*
     * Renders an NCSA Common Log entry.
     */
    class NcsaCommonLogEntry
        prop address: string?
        prop user_identifier: string?
        prop user_id: string?
        prop timestamp: DateTime = new DateTime.now_local()
        prop method: string
        prop path: string
        prop protocol: string
        prop status_code: uint
        prop size: uint
        
        def get_formatted_timestamp(): string
            return _timestamp.format("%d/%b/%Y:%H:%M:%S %z")
        
        def to_string(): string
            return "%s %s %s [%s] \"%s %s %s\" %u %u\n".printf(dash(_address), dash(_user_identifier), dash(_user_id), get_formatted_timestamp(), _method, _path, _protocol, _status_code, _size)
                
        def private dash(str: string?): string
            if (str is null) || (str.length == 0)
                return "-"
            return str
