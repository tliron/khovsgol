[indent=4]

namespace Nap

    class ThreadPool: GLib.Object
        construct(max_threads: int) raises ThreadError
            _thread_pool = (GLib.ThreadPool of Context) create_thread_pool((ThreadPoolFunc) _handle, max_threads, true)
            //_thread_pool = new GLib.ThreadPool.with_owned_data((ThreadPoolFunc) _handle, max_threads, true)
        
        prop readonly max_threads: int
            get
                return _thread_pool.get_max_threads()

        def submit(handler: Handler, error_handler: ErrorHandler?, conversation: Conversation)
            try
                conversation.pause()
                _thread_pool.add(new Context(handler, error_handler, conversation))
            except e: ThreadError
                print e.message
    
        _thread_pool: GLib.ThreadPool of Context

        def private static _handle(context: Context)
            try
                context.handler(context.conversation)
                context.conversation.commit()
                context.conversation.unpause()
            except e: GLib.Error
                if context.error_handler is not null
                    context.error_handler(context.conversation, e)

        class private static Context: GLib.Object
            construct(handler: Handler, error_handler: ErrorHandler?, conversation: Conversation)
                _handler = handler
                _error_handler = error_handler
                _conversation = conversation

            prop readonly handler: unowned Handler
            prop readonly error_handler: unowned ErrorHandler?
            prop readonly conversation: Conversation
