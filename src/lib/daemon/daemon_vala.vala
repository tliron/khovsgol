
extern void *daemon_pid_file_proc;

namespace Daemonize {
    /*
     * Because Daemon.pid_file_proc is broken. :(
     */
    void set_daemon_pid_file_proc(Func func) {
        daemon_pid_file_proc = (void *) func;
    }
}
