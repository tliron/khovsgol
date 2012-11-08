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

    /*
     * Keeps references for a list of objects.
     */
    class Ownerships: Object
        construct()
            _list = new list of Object
    
        def add(ownership: Object): bool
            return _list.add(ownership)
    
        final
            for ownership in (Gee.AbstractCollection of Object) _list
                ownership.ref()
                ownership.unref()
                
        _list: list of Object
        
    class GetStringHandler: Object implements Handler
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation)
            conversation.response_text = _delegated()
        
        delegate Delegate(): string
        
        _delegated: unowned Delegate
    
    class GetStringArgsHandler: Object implements Handler
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation)
            conversation.response_text = _delegated(conversation.query)
        
        delegate Delegate(args: dict of string, string): string
        
        _delegated: unowned Delegate

    class SetStringHandler: Object implements Handler
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation)
            var entity = conversation.get_entity()
            conversation.response_text = _delegated(entity)
        
        delegate Delegate(entity: string): string
        
        _delegated: unowned Delegate

    class SetStringArgsHandler: Object implements Handler
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation)
            var entity = conversation.get_entity()
            conversation.response_text = _delegated(entity, conversation.query)
        
        delegate Delegate(entity: string, args: dict of string, string): string
        
        _delegated: unowned Delegate

    class GetJsonHandler: Object implements Handler
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation)
            conversation.response_json = _delegated()
        
        delegate Delegate(): Json.Object?
        
        _delegated: unowned Delegate

    class GetJsonArgsHandler: Object implements Handler
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation)
            conversation.response_json = _delegated(conversation.query)
        
        delegate Delegate(args: dict of string, string): Json.Object?
        
        _delegated: unowned Delegate

    class SetJsonHandler: Object implements Handler
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation)
            var entity = conversation.get_entity()
            if entity is not null
                try
                    conversation.response_json = _delegated(JSON.from(entity))
                except e: JSON.Error
                    bad_request_json(conversation, e.message)
            else
                bad_request_json(conversation, "No entity")
        
        delegate Delegate(entity: Json.Object): Json.Object?
        
        _delegated: unowned Delegate
    
    class SetJsonArgsHandler: Object implements Handler
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation)
            var entity = conversation.get_entity()
            if entity is not null
                try
                    conversation.response_json = _delegated(JSON.from(entity), conversation.query)
                except e: JSON.Error
                    bad_request_json(conversation, e.message)
            else
                bad_request_json(conversation, "No entity")
        
        delegate Delegate(entity: Json.Object, args: dict of string, string): Json.Object?
        
        _delegated: unowned Delegate
