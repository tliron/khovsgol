[indent=4]

namespace Nap

    class ThreadPool: GLib.Object
        construct(max_threads: int) raises ThreadError
            _thread_pool = (GLib.ThreadPool of Context) create_thread_pool((ThreadPoolFunc) _handle, max_threads, true)
            //_thread_pool = new GLib.ThreadPool.with_owned_data((ThreadPoolFunc) _handle, max_threads, true)
        
        prop readonly max_threads: int
            get
                return _thread_pool.get_max_threads()

        def handle(handler: Handler, conversation: Conversation)
            try
                conversation.pause()
                _thread_pool.add(new Context(handler, conversation))
            except e: ThreadError
                print e.message
    
        _thread_pool: GLib.ThreadPool of Context

        def static _handle(context: Context)
            context.handler.handle(context.conversation)
            context.conversation.commit()
            context.conversation.unpause()

        class private static Context: GLib.Object
            construct(handler: Handler, conversation: Conversation)
                _handler = handler
                _conversation = conversation

            prop readonly handler: Handler
            prop readonly conversation: Conversation
