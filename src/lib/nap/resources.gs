[indent=4]

namespace Nap

    /*
     * Base class for RESTful resources. Enables separate handlers for
     * all HTTP methods.
     */
    class Resource: Object implements Node
        def handle(conversation: Conversation) raises GLib.Error
            var method = conversation.method
            if method == Method.GET
                get(conversation)
            else if method == Method.POST
                post(conversation)
            else if method == Method.PUT
                put(conversation)
            else if method == Method.DELETE
                self.delete(conversation)
            
        def virtual new get(conversation: Conversation) raises GLib.Error
            conversation.status_code = StatusCode.METHOD_NOT_ALLOWED

        def virtual post(conversation: Conversation) raises GLib.Error
            conversation.status_code = StatusCode.METHOD_NOT_ALLOWED

        def virtual put(conversation: Conversation) raises GLib.Error
            conversation.status_code = StatusCode.METHOD_NOT_ALLOWED

        def virtual delete(conversation: Conversation) raises GLib.Error
            conversation.status_code = StatusCode.METHOD_NOT_ALLOWED

    /*
     * A RESTful resource that lets you use delegates in addition to
     * overriding. Useful for wrapping existing methods in a RESTful
     * resource.
     */
    class DelegatedResource: Resource
        construct(get: Handler? = null, post: Handler? = null, put: Handler? = null, delete: Handler? = null, ...)
            _get = get
            _post = post
            _put = put
            _delete = delete
            
            add_ownerships(va_list())
        
        construct nodes(get: Node? = null, post: Node? = null, put: Node? = null, delete: Node? = null, ...)
            _get = get.handle
            _post = post.handle
            _put = put.handle
            _delete = delete.handle

            if get is not null
                _ownerships.add(get)
            if post is not null
                _ownerships.add(post)
            if put is not null
                _ownerships.add(put)
            if delete is not null
                _ownerships.add(delete)
                
            add_ownerships(va_list())

        def add_ownerships(args: va_list)
            ownership: Object? = args.arg()
            while ownership is not null
                _ownerships.add(ownership)
                ownership = args.arg()
        
        prop readonly ownerships: Ownerships = new Ownerships()
        
        def override get(conversation: Conversation) raises GLib.Error
            if _get is not null
                _get(conversation)
            else
                super.get(conversation)

        def override post(conversation: Conversation) raises GLib.Error
            if _post is not null
                _post(conversation)
            else
                super.post(conversation)

        def override put(conversation: Conversation) raises GLib.Error
            if _put is not null
                _put(conversation)
            else
                super.put(conversation)

        def override delete(conversation: Conversation) raises GLib.Error
            if _delete is not null
                _delete(conversation)
            else
                super.delete(conversation)

        _get: unowned Handler?
        _post: unowned Handler?
        _put: unowned Handler?
        _delete: unowned Handler?
