
namespace Nap {
    /*
     * Written in Vala due to Genie limitation, see: https://bugzilla.gnome.org/show_bug.cgi?id=687703
     */
    GLib.ThreadPool<Object> create_thread_pool(ThreadPoolFunc<Object> handle, int max_threads, bool exclusive) throws ThreadError {
        return new GLib.ThreadPool<Object>.with_owned_data(handle, max_threads, true);
    }
}
