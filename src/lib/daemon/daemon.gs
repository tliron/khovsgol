[indent=4]

namespace Daemonize

    _poll: PollFunc
    _daemon_fd: PollFD
    _main_loop: MainLoop
            
    def poll(fds: array of PollFD, timeout: int): int
        for fd in fds
            if fd.fd == _daemon_fd.fd
                 var signal = Daemon.signal_next()
                 if signal < 0
                    Daemon.log(Daemon.LogPriority.ERR, "Could not get next daemon signal: %s", strerror(errno))
                    exit()
                    
                 if signal == Daemon.Sig.INT || signal == Daemon.Sig.QUIT || signal == Daemon.Sig.TERM
                    Daemon.log(Daemon.LogPriority.INFO, "Daemon received exit signal: %d", signal)
                    exit()
                    
                 else if signal == Daemon.Sig.HUP
                    Daemon.log(Daemon.LogPriority.INFO, "Daemon received HUP")
                    exit()
                    
                 break
        return _poll(fds, timeout)

    def get_pid_file(): string
        return "/tmp/khovsgol.pid"
        
    // See: http://0pointer.de/lennart/projects/libdaemon/reference/html/testd_8c-example.html
    def handle(name: string, start_daemon: bool, stop_daemon: bool, main_loop: MainLoop? = null)
        if !start_daemon && !stop_daemon
            return
            
        if Daemon.reset_sigs(-1) < 0
            Daemon.log(Daemon.LogPriority.ERR, "Failed to reset all daemon signal handlers: %s", strerror(errno))
            Posix.exit(1)
            
        if Daemon.unblock_sigs(-1) < 0
            Daemon.log(Daemon.LogPriority.ERR, "Failed to unblock all daemon signals: %s", strerror(errno))
            Posix.exit(1)
            
        Daemon.pid_file_ident = Daemon.log_ident = name
        set_daemon_pid_file_proc((Func) get_pid_file) // Daemon.pid_file_proc = get_pid_file
        
        if stop_daemon
            print "Stopping daemon"
            
            var r = Daemon.pid_file_kill_wait(Daemon.Sig.TERM, 5)
            if r < 0
                Daemon.log(Daemon.LogPriority.ERR, "Failed to kill daemon: %s", strerror(errno))
                
            Posix.exit(r < 0 ? 1 : 0)
            
        if start_daemon
            print "Starting daemon"
            
            var pid = Daemon.pid_file_is_running()
            if pid >= 0
                Daemon.log(Daemon.LogPriority.ERR, "Daemon already running on PID file %u", pid)
                Posix.exit(1)
                
            if Daemon.retval_init() < 0
                Daemon.log(Daemon.LogPriority.ERR, "Failed to create daemon pipe: %s", strerror(errno))
                Posix.exit(1)
                
            pid = Daemon.fork()
            if pid < 0
                Daemon.retval_done()
                Daemon.log(Daemon.LogPriority.ERR, "Could not fork daemon")
                Posix.exit(1)
            else if pid != 0
                // We are the parent now
                var r = Daemon.retval_wait(20)
                if r < 0
                    Daemon.log(Daemon.LogPriority.ERR, "Could not receive return value from daemon process: %s", strerror(errno))
                    Posix.exit(255)
                else
                    Posix.exit(r)
            else
                // We are the daemon now
                if Daemon.close_all(-1) < 0
                    Daemon.log(Daemon.LogPriority.ERR, "Failed to close all daemon file descriptors: %s", strerror(errno))
                    Daemon.retval_send(1)
                    exit()
                    
                if Daemon.pid_file_create() < 0
                    Daemon.log(Daemon.LogPriority.ERR, "Could not create daemon PID file: %s", strerror(errno))
                    Daemon.retval_send(2)
                    exit()
                    
                if Daemon.signal_init(Daemon.Sig.INT, Daemon.Sig.TERM, Daemon.Sig.QUIT, Daemon.Sig.HUP, 0) < 0
                    Daemon.log(Daemon.LogPriority.ERR, "Could not register daemon signal handlers: %s", strerror(errno))
                    Daemon.retval_send(3)
                    exit()
                    
                _daemon_fd = {Daemon.signal_fd(), IOCondition.IN|IOCondition.HUP|IOCondition.ERR, 0}
                
                if main_loop is not null
                    _main_loop = main_loop
                    var context = main_loop.get_context()
                    
                    // Replace the poll function with ours
                    _poll = context.get_poll_func()
                    context.set_poll_func(poll)
                    
                    // Poll our daemon's file descriptor
                    context.add_poll(ref _daemon_fd, 0)

                Daemon.retval_send(0)
                Daemon.log(Daemon.LogPriority.INFO, "Daemon started")

    def exit()
        if _main_loop is not null
            _main_loop.quit()
            while _main_loop.is_running()
                Thread.usleep(1000)
        Daemon.log(Daemon.LogPriority.INFO, "Daemon exiting")
        Daemon.retval_send(255)
        Daemon.signal_done()
        Daemon.pid_file_remove()
        Posix.exit(0)
