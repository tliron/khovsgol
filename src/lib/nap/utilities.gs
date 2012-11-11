[indent=4]

namespace Nap

    def bad_request_json(conversation: Conversation, message: string)
        var json = new Json.Object()
        json.set_string_member("error", message)
        conversation.response_json = json
        conversation.status_code = StatusCode.BAD_REQUEST

    def json_to_text(conversation: Conversation)
        if conversation.response_json is not null
            var jsonp = conversation.query["jsonp"]
            var human = jsonp is null && conversation.query["human"] == "true"
            conversation.response_text = JSON.to(conversation.response_json, human)
            if jsonp is not null
                conversation.response_text = "%s(%s)".printf(jsonp, conversation.response_text)
            if conversation.media_type is null
                conversation.media_type = "application/json"

    def default_error_handler(conversation: Conversation, error: GLib.Error)
        conversation.status_code = StatusCode.INTERNAL_SERVER_ERROR
        Logging.get_logger("nap").warning("%s (%s %s)", error.message, conversation.get_method(), conversation.path)

    /*
     * Keeps references for a list of objects.
     */
    class Ownerships
        construct()
            _list = new list of Object
    
        def add(ownership: Object): bool
            return _list.add(ownership)
    
        _list: list of Object
        
    class Arguments
        construct(conversation: Conversation)
            _query = conversation.query
            _variables = conversation.variables
    
        prop readonly query: dict of string, string
        prop readonly variables: dict of string, string
    
    class GetStringHandler: Object implements Node
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation) raises GLib.Error
            conversation.response_text = _delegated()
        
        delegate Delegate(): string raises GLib.Error
        
        _delegated: unowned Delegate
    
    class GetStringArgsHandler: Object implements Node
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation) raises GLib.Error
            conversation.response_text = _delegated(new Arguments(conversation))
        
        delegate Delegate(arguments: Arguments): string raises GLib.Error
        
        _delegated: unowned Delegate

    class SetStringHandler: Object implements Node
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation) raises GLib.Error
            var entity = conversation.get_entity()
            conversation.response_text = _delegated(entity)
        
        delegate Delegate(entity: string): string raises GLib.Error
        
        _delegated: unowned Delegate

    class SetStringArgsHandler: Object implements Node
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation) raises GLib.Error
            var entity = conversation.get_entity()
            conversation.response_text = _delegated(entity, new Arguments(conversation))
        
        delegate Delegate(entity: string, arguments: Arguments): string raises GLib.Error
        
        _delegated: unowned Delegate

    class GetJsonHandler: Object implements Node
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation) raises GLib.Error
            conversation.response_json = _delegated()
        
        delegate Delegate(): Json.Object? raises GLib.Error
        
        _delegated: unowned Delegate

    class GetJsonArgsHandler: Object implements Node
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation) raises GLib.Error
            conversation.response_json = _delegated(new Arguments(conversation))
        
        delegate Delegate(arguments: Arguments): Json.Object? raises GLib.Error
        
        _delegated: unowned Delegate

    class SetJsonHandler: Object implements Node
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation) raises GLib.Error
            var entity = conversation.get_entity()
            if entity is not null
                try
                    conversation.response_json = _delegated(JSON.from(entity))
                except e: JSON.Error
                    bad_request_json(conversation, e.message)
            else
                bad_request_json(conversation, "No entity")
        
        delegate Delegate(entity: Json.Object): Json.Object? raises GLib.Error
        
        _delegated: unowned Delegate
    
    class SetJsonArgsHandler: Object implements Node
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation) raises GLib.Error
            var entity = conversation.get_entity()
            if entity is not null
                try
                    conversation.response_json = _delegated(JSON.from(entity), new Arguments(conversation))
                except e: JSON.Error
                    bad_request_json(conversation, e.message)
            else
                bad_request_json(conversation, "No entity")
        
        delegate Delegate(entity: Json.Object, arguments: Arguments): Json.Object? raises GLib.Error
        
        _delegated: unowned Delegate
