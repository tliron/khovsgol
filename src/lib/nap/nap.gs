[indent=4]

namespace Nap

    namespace StatusCode
        const OK: int = 200
        const BAD_REQUEST: int = 400
        const NOT_FOUND: int = 404
        const METHOD_NOT_ALLOWED: int = 405
    
    namespace Method
        const GET: string = "GET"
        const PUT: string = "PUT"
        const POST: string = "POST"
        const DELETE: string = "DELETE"

    /*
     * The base class for all RESTful conversation handlers.
     */
    interface Handler: Object
        def abstract handle(conversation: Conversation)

    delegate HandlerDelegate(conversation: Conversation)
    
    /*
     * A RESTful conversation.
     */
    interface Conversation: Object
        prop abstract readonly path: string
        prop abstract readonly query: dict of string, string
        prop abstract status_code: int = StatusCode.OK
        prop abstract media_type: string?
        prop abstract response_text: string?
        prop abstract response_json: Json.Object?
        
        def abstract get_method(): string
        def abstract get_entity(): string
        def abstract commit()
        def abstract pause()
        def abstract unpause()
                    
    interface Server: Object
        prop abstract handler: Handler
        prop abstract thread_pool: ThreadPool
        def abstract start()
