[indent=4]

uses
    Soup
    Json

namespace Nap

    /*
     * The base class for all RESTful conversation handlers.
     */
    interface Handler: GLib.Object
        def abstract handle(conversation: Conversation)

    delegate HandlerDelegate(conversation: Conversation)
    
    /*
     * A RESTful conversation.
     */
    interface Conversation: GLib.Object
        prop abstract readonly path: string
        prop abstract readonly query: dict of string, string
        prop abstract status_code: int = KnownStatusCode.OK
        prop abstract media_type: string?
        prop abstract response_text: string?
        prop abstract response_json: Json.Object?
        
        def abstract get_method(): string
        def abstract get_entity(): string
        def abstract commit()
        def abstract pause()
        def abstract unpause()
                    
    interface Server: GLib.Object
        prop abstract handler: Handler
        prop abstract thread_pool: ThreadPool
        def abstract start()
