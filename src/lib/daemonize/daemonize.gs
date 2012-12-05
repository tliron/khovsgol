[indent=4]

namespace Daemonize

    /*
     * Will return false after the daemon receives a HUP (Hang Up) signal.
     */
    def has_terminal(): bool
        return AtomicInt.get(ref _has_terminal) == 1

    /*
     * When "start" and "stop" are false: show the status of the process
     * referenced by the PID file, and then exit.
     * 
     * When "stop" is true: send a TERM signal to the daemon process
     * referenced by the PID file. If "start" is false, exit.
     * 
     * When "start" is true: fork into a separate daemon process and
     * continue, after updating the PID file to reference us. The
     * current process (the parent) will then exit.
     * 
     * The daemon process is expected to have a GLib main loop, which
     * will be hooked to properly handle incoming signals. The exit
     * signals (TERM, QUIT and INT) will cause it to quit the main loop,
     * blocking until it is properly shut down.
     */
    def handle(dir: string, name: string, start: bool, stop: bool, main_loop: MainLoop? = null) raises Error
        // See: http://0pointer.de/lennart/projects/libdaemon/reference/html/testd_8c-example.html

        // Make sure dir exists
        var file = File.new_for_path("%s/.%s".printf(Environment.get_home_dir(), dir))
        if !file.query_exists() || (file.query_info(FileAttribute.STANDARD_TYPE, FileQueryInfoFlags.NONE).get_file_type() != FileType.DIRECTORY)
            file.make_directory()

        _dir = dir
        Daemon.pid_file_ident = Daemon.log_ident = _name = name
        set_daemon_pid_file_proc((Func) get_pid_file) // Ideally: Daemon.pid_file_proc = get_pid_file
        
        if !start && !stop
            // Show status
            var pid = Daemon.pid_file_is_running()
            if pid >= 0
                print "Daemon %s is running (PID %d)", name, pid
            else
                print "Daemon %s is not running", name
            Posix.exit(0)

        if Daemon.reset_sigs(-1) < 0
            Daemon.log(Daemon.LogPriority.ERR, "Failed to reset all daemon signal handlers: %s", strerror(errno))
            Posix.exit(1)
            
        if Daemon.unblock_sigs(-1) < 0
            Daemon.log(Daemon.LogPriority.ERR, "Failed to unblock all daemon signals: %s", strerror(errno))
            Posix.exit(1)
            
        if stop
            var pid = Daemon.pid_file_is_running()
            if pid < 0
                print "Daemon %s is not running", name
            else
                print "Stopping daemon %s (PID %d)", name, pid
            
                var r = Daemon.pid_file_kill_wait(Daemon.Sig.TERM, 5)
                if r < 0
                    Daemon.log(Daemon.LogPriority.ERR, "Failed to kill daemon: %s", strerror(errno))
                    Posix.exit(1)
            
        if start
            // Make sure daemon in not already running
            var pid = Daemon.pid_file_is_running()
            if pid >= 0
                Daemon.log(Daemon.LogPriority.ERR, "Daemon %s is already running (PID %u)", name, pid)
                Posix.exit(1)
                
            print "Starting daemon %s (%s)", name, get_pid_file()
            
            // Create pipe to communicate with daemon
            if Daemon.retval_init() < 0
                Daemon.log(Daemon.LogPriority.ERR, "Failed to create daemon pipe: %s", strerror(errno))
                Posix.exit(1)
            
            // Fork!
            pid = Daemon.fork()
            if pid < 0
                Daemon.retval_done()
                Daemon.log(Daemon.LogPriority.ERR, "Could not fork daemon")
                Posix.exit(1)

            else if pid != 0
                // Here we are in the parent process of the fork
                var r = Daemon.retval_wait(20)
                if r < 0
                    Daemon.log(Daemon.LogPriority.ERR, "Could not receive return value from daemon process: %s", strerror(errno))
                    Posix.exit(255)
                else
                    Posix.exit(r)

            else
                // Here we are the daemon process of the fork
                if Daemon.close_all(-1) < 0
                    Daemon.log(Daemon.LogPriority.ERR, "Failed to close all daemon file descriptors: %s", strerror(errno))
                    Daemon.retval_send(1)
                    exit()
                
                // Create PID file
                if Daemon.pid_file_create() < 0
                    Daemon.log(Daemon.LogPriority.ERR, "Could not create daemon PID file: %s", strerror(errno))
                    Daemon.retval_send(2)
                    exit()
                
                // Register signal handlers
                if Daemon.signal_init(Daemon.Sig.TERM, Daemon.Sig.QUIT, Daemon.Sig.INT, Daemon.Sig.HUP, 0) < 0
                    Daemon.log(Daemon.LogPriority.ERR, "Could not register daemon signal handlers: %s", strerror(errno))
                    Daemon.retval_send(3)
                    exit()

                _daemon_fd = {Daemon.signal_fd(), IOCondition.IN|IOCondition.HUP|IOCondition.ERR, 0}
                
                // Wrap GLib's MainLoop polling callback
                if main_loop is not null
                    _main_loop = main_loop
                    var context = main_loop.get_context()
                    
                    // Wrap the polling callback with ours
                    _poll = context.get_poll_func()
                    context.set_poll_func(poll)
                    
                    // Make sure to poll our daemon's file descriptor
                    context.add_poll(ref _daemon_fd, 0)

                Daemon.retval_send(0)
                Daemon.log(Daemon.LogPriority.INFO, "Daemon started")
                
        else
            Posix.exit(0)

    /*
     * The default daemon pid_file location is /var/run/, but that would
     * require the daemon to run with root privileges.
     * 
     * Our version uses one located in the user's home directory.
     */
    def private get_pid_file(): string
        var pid_file = "%s/.%s/%s.pid".printf(Environment.get_home_dir(), _dir, _name)
        return pid_file

    def private exit()
        if _main_loop is not null
            // Wait for GLib main loop to quit
            _main_loop.quit()
            while _main_loop.is_running()
                Thread.usleep(1000)

        Daemon.log(Daemon.LogPriority.INFO, "Daemon exiting")
        Daemon.retval_send(255)
        Daemon.signal_done()
        Daemon.pid_file_remove()
        Posix.exit(0)

    /*
     * Our wrapping GLib polling callback, with added support for handling
     * daemon signals.
     */
    def private poll(fds: array of PollFD, timeout: int): int
        // Look for our file descriptor
        for fd in fds
            if fd.fd == _daemon_fd.fd
                 var signal = Daemon.signal_next()
                 if signal < 0
                    Daemon.log(Daemon.LogPriority.ERR, "Could not get daemon signal: %s", strerror(errno))
                    exit()
                    
                 else if signal == Daemon.Sig.TERM
                    Daemon.log(Daemon.LogPriority.INFO, "Daemon received TERM")
                    // Terminate!
                    // Please shut down.
                    // Default for "kill" command.
                    exit()

                 else if signal == Daemon.Sig.QUIT
                    Daemon.log(Daemon.LogPriority.INFO, "Daemon received QUIT")
                    // Quit!
                    // Please do a core dump and produce other useful things for debugging, and then shut down.
                    // This is what CTRL+\ sends.
                    // TODO: dump?
                    exit()

                 else if signal == Daemon.Sig.INT
                    Daemon.log(Daemon.LogPriority.INFO, "Daemon received INT")
                    // Interrupt!
                    // This is what CTRL+C sends
                    exit()
                    
                 else if signal == Daemon.Sig.HUP
                    Daemon.log(Daemon.LogPriority.INFO, "Daemon received HUP")
                    // Hang up!
                    // This means that we no longer have a terminal.
                    // (Some daemons respond to HUP by reloading their configuration files, a rather quirky interpretation!)
                    AtomicInt.set(ref _has_terminal, 0)
                    
                 break
                 
        // Continue to wrapped poll callback
        return _poll(fds, timeout)

    _dir: private string
    _name: private string
    _poll: private PollFunc
    _daemon_fd: private PollFD
    _main_loop: private MainLoop
    _has_terminal: private int = 1
