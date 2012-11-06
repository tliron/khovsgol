
namespace Nap {
    public class ThreadPool : Object {
        public ThreadPool(int max_threads) throws ThreadError {
            _thread_pool = new GLib.ThreadPool<Context>.with_owned_data((ThreadPoolFunc<Context>) _handle, max_threads, true);
        }
        
        public void handle(Handler handler, Conversation conversation) {
            try {
                conversation.pause();
                var context = new Context(handler, conversation);
                _thread_pool.add(context);
            }
            catch (ThreadError e) {
                print(e.message);
            }
        }
        
        private GLib.ThreadPool<Context> _thread_pool;
        
        private static void _handle(Context context) {
            context.handler.handle(context.conversation);
            context.conversation.commit();
            context.conversation.unpause();
        }
        
        private class Context : Object {
                public Context(Handler handler, Conversation conversation) {
                    _handler = handler;
                    _conversation = conversation;
                }
                
                public Handler handler { get { return _handler; } }
                public Conversation conversation { get { return _conversation; } }
                
                private Handler _handler;
                private Conversation _conversation;
        }
    }
}
