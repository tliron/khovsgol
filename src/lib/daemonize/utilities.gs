[indent=4]

/*
 * This is a workaround for Daemon.pid_file_proc, which is broken.
 * 
 * We need this in a compilation unit that does not reference Daemon,
 * otherwise the "extern" definition here would conflict with the
 * one used there.
 */

daemon_pid_file_proc: extern void *

namespace Daemonize

    def set_daemon_pid_file_proc(func: Func)
        daemon_pid_file_proc = (void *) func
