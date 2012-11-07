[indent=4]

uses
    Soup
    Json
    Gee

namespace Nap

    /*
     * Keeps references for a list of objects.
     */
    class Ownerships: GLib.Object
        construct()
            _list = new list of GLib.Object
    
        def add(ownership: GLib.Object): bool
            return _list.add(ownership)
    
        final
            for ownership in (AbstractCollection of GLib.Object) _list
                ownership.ref()
                ownership.unref()
                
        _list: list of GLib.Object
        
    class GetStringHandler: GLib.Object implements Handler
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation)
            conversation.response_text = _delegated()
        
        delegate Delegate(): string
        
        _delegated: unowned Delegate
    
    class GetStringArgsHandler: GLib.Object implements Handler
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation)
            conversation.response_text = _delegated(conversation.query)
        
        delegate Delegate(args: dict of string, string): string
        
        _delegated: unowned Delegate

    class SetStringHandler: GLib.Object implements Handler
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation)
            var entity = conversation.get_entity()
            conversation.response_text = _delegated(entity)
        
        delegate Delegate(entity: string): string
        
        _delegated: unowned Delegate

    class SetStringArgsHandler: GLib.Object implements Handler
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation)
            var entity = conversation.get_entity()
            conversation.response_text = _delegated(entity, conversation.query)
        
        delegate Delegate(entity: string, args: dict of string, string): string
        
        _delegated: unowned Delegate

    class GetJsonHandler: GLib.Object implements Handler
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation)
            conversation.response_json = _delegated()
        
        delegate Delegate(): Json.Object?
        
        _delegated: unowned Delegate

    class GetJsonArgsHandler: GLib.Object implements Handler
        construct(delegated: Delegate)
            _delegated = delegated
        
        def handle(conversation: Conversation)
            conversation.response_json = _delegated(conversation.query)
        
        delegate Delegate(args: dict of string, string): Json.Object?
        
        _delegated: unowned Delegate

    class SetJsonHandler: GLib.Object implements Handler
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
    
    class SetJsonArgsHandler: GLib.Object implements Handler
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
