[indent=4]

// apt-get install libgee-dev, valac --pkg gee-1.0

uses
    Soup // apt-get install libsoup-2.4-dev, valac --pkg libsoup-2.4
    Json // apt-get install libjson-glib-dev, valac --pkg json-glib-1.0

namespace Nap

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

    class Ownerships: GLib.Object
        construct()
            _list = new list of GLib.Object
    
        def add(ownership: GLib.Object): bool
            return _list.add(ownership)
    
        final
            for ownership in (Gee.AbstractCollection of GLib.Object) _list
                ownership.ref()
                ownership.unref()
                
        _list: list of GLib.Object

    class DelegatedResource: Resource
        construct(get: Delegate?, post: Delegate?, put: Delegate?, delete: Delegate?, ...)
            _get = get
            _post = post
            _put = put
            _delete = delete
            _ownerships = new Ownerships

            var args = va_list()
            ownership: GLib.Object? = args.arg()
            while ownership is not null
                _ownerships.add(ownership)
                ownership = args.arg()

        prop readonly ownerships: Ownerships

        def override get(conversation: Conversation)
            if _get is not null
                _get(conversation)
            else
                super.get(conversation)

        def override post(conversation: Conversation)
            if _post is not null
                _post(conversation)
            else
                super.post(conversation)

        def override put(conversation: Conversation)
            if _put is not null
                _put(conversation)
            else
                super.put(conversation)

        def override delete(conversation: Conversation)
            if _delete is not null
                _delete(conversation)
            else
                super.delete(conversation)

        delegate Delegate(conversation: Conversation)

        _get: unowned Delegate?
        _post: unowned Delegate?
        _put: unowned Delegate?
        _delete: unowned Delegate?

    class GetString: GLib.Object
        construct(delegated: Delegate)
            _delegated = delegated
        
        def delegated(conversation: Conversation)
            conversation.response_text = _delegated()
        
        delegate Delegate(): string
        
        _delegated: unowned Delegate
    
    class GetStringArgs: GLib.Object
        construct(delegated: Delegate)
            _delegated = delegated
        
        def delegated(conversation: Conversation)
            conversation.response_text = _delegated(conversation.query)
        
        delegate Delegate(args: dict of string, string): string
        
        _delegated: unowned Delegate

    class SetString: GLib.Object
        construct(delegated: Delegate)
            _delegated = delegated
        
        def delegated(conversation: Conversation)
            var entity = conversation.get_entity()
            conversation.response_text = _delegated(entity)
        
        delegate Delegate(entity: string): string
        
        _delegated: unowned Delegate

    class SetStringArgs: GLib.Object
        construct(delegated: Delegate)
            _delegated = delegated
        
        def delegated(conversation: Conversation)
            var entity = conversation.get_entity()
            conversation.response_text = _delegated(entity, conversation.query)
        
        delegate Delegate(entity: string, args: dict of string, string): string
        
        _delegated: unowned Delegate

    class GetJson: GLib.Object
        construct(delegated: Delegate)
            _delegated = delegated
        
        def delegated(conversation: Conversation)
            conversation.response_json = _delegated()
        
        delegate Delegate(): Json.Object?
        
        _delegated: unowned Delegate

    class GetJsonArgs: GLib.Object
        construct(delegated: Delegate)
            _delegated = delegated
        
        def delegated(conversation: Conversation)
            conversation.response_json = _delegated(conversation.query)
        
        delegate Delegate(args: dict of string, string): Json.Object?
        
        _delegated: unowned Delegate

    class SetJson: GLib.Object
        construct(delegated: Delegate)
            _delegated = delegated
        
        def delegated(conversation: Conversation)
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
    
    class SetJsonArgs: GLib.Object
        construct(delegated: Delegate)
            _delegated = delegated
        
        def delegated(conversation: Conversation)
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

    class DocumentResource: Resource
        def override get(conversation: Conversation)
            conversation.response_json = get_json(conversation)

        def override post(conversation: Conversation)
            var entity = conversation.get_entity()
            if entity is not null
                try
                    conversation.response_json = post_json(conversation, JSON.from(entity))
                except e: JSON.Error
                    bad_request_json(conversation, e.message)
            else
                bad_request_json(conversation, "No entity")

        def override put(conversation: Conversation)
            var entity = conversation.get_entity()
            if entity is not null
                try
                    conversation.response_json = put_json(conversation, JSON.from(entity))
                except e: JSON.Error
                    bad_request_json(conversation, e.message)
            else
                bad_request_json(conversation, "No entity")

        def virtual get_json(conversation: Conversation): Json.Object?
            return new Json.Object()

        def virtual post_json(conversation: Conversation, entity: Json.Object): Json.Object?
            return new Json.Object()

        def virtual put_json(conversation: Conversation, entity: Json.Object): Json.Object?
            return new Json.Object()
        
    def bad_request_json(conversation: Conversation, message: string)
        var json = new Json.Object()
        json.set_string_member("error", message)
        conversation.response_json = json
        conversation.status_code = Soup.KnownStatusCode.BAD_REQUEST

    class DelegatedDocumentResource: DocumentResource
        construct(get_json: json_delegate?, post_json: json_entity_delegate?)
            _get_json = get_json
            _post_json = post_json

        def override get_json(conversation: Conversation): Json.Object?
            if _get_json is not null
                return _get_json()
            else
                return super.get_json(conversation)

        def override post_json(conversation: Conversation, entity: Json.Object): Json.Object?
            if _post_json is not null
                return _post_json(entity)
            else
                return super.post_json(conversation, entity)
        
        delegate json_delegate(): Json.Object?
        delegate json_entity_delegate(entity: Json.Object): Json.Object?

        _get_json: unowned json_delegate?
        _post_json: unowned json_entity_delegate?
        //_put_json: json_entity_delegate
        //_delete_json: json_delegate

