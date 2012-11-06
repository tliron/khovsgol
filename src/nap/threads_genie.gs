/*[indent=4]

namespace Nap

    class ThreadPool: GLib.Object
        construct(max_threads: int) raises ThreadError
            _thread_pool = new GLib.ThreadPool.with_owned_data((Func) _handle, max_threads, true)
        
        prop readonly max_threads: int
            get
                return _thread_pool.get_max_threads()

        def handle(handler: Handler, conversation: Conversation)
            try
                conversation.pause()
                var context = new Context(handler, conversation)
                context.ref() // ThreadPool does not own the context!
                _thread_pool.add(context)
            except e: ThreadError
                print e.message
    
        _thread_pool: GLib.ThreadPool

        def static _handle(context: Context)
            context.handler.handle(context.conversation)
            context.conversation.commit()
            context.conversation.unpause()
            context.unref()

        class private static Context: GLib.Object
            construct(handler: Handler, conversation: Conversation)
                _handler = handler
                _conversation = conversation
                
                _handler.ref()
                _conversation.ref()

            final
                _handler.unref()
                _conversation.unref()

            prop readonly handler: Handler
            prop readonly conversation: Conversation
*/
