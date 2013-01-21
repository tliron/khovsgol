[indent=4]

namespace Khovsgol.Server

    class Arguments: Object
        construct(args: array of string)
            var restart_daemon = false
            var version = false
            
            var options = new array of OptionEntry[10]
            options[0] = {"version", 0, 0, OptionArg.NONE,  ref version,        "Show version", null}
            options[1] = {"port",    0, 0, OptionArg.INT,   ref _port,          "Web server TCP port (defaults to 8185)", "number"}
            options[2] = {"threads", 0, 0, OptionArg.INT,   ref _threads,       "Non-zero number of threads to enable multithreaded web server, -1 to use all CPU cores (defaults to 0)", "number"}
            options[3] = {"delay",   0, 0, OptionArg.INT64, ref _delay,         "Delay all web responses (defaults to 0)", "milliseconds"}
            options[4] = {"start",   0, 0, OptionArg.NONE,  ref _start_daemon,  "Start as daemon", null}
            options[5] = {"stop",    0, 0, OptionArg.NONE,  ref _stop_daemon,   "Stop daemon", null}
            options[6] = {"restart", 0, 0, OptionArg.NONE,  ref restart_daemon, "Restart daemon", null}
            options[7] = {"status",  0, 0, OptionArg.NONE,  ref _status_daemon, "Show daemon status", null}
            options[8] = {"console", 0, 0, OptionArg.NONE,  ref _console,       "Log to console", null}
            options[9] = {null}
            
            var context = new OptionContext("- Khovsgol Server")
            context.set_summary("The anywhere-to-anywhere music player and library/playlist manager")
            context.set_help_enabled(true)
            context.add_main_entries(options, null)

            try
                context.parse(ref args)
                
                if version
                    print VERSION
                    Process.exit(0)
                
                if restart_daemon
                    _stop_daemon = true
                    _start_daemon = true

                if _threads == -1
                    _threads = System.get_n_cpus()
                    
            except e: OptionError
                stderr.printf("%s\n", e.message)
                print "Use '%s --help' to see a full list of available command line options.\n", args[0]
                Process.exit(1)
    
        prop readonly port: int = int.MIN
        prop readonly threads: int = int.MIN
        prop readonly delay: int64 = int64.MIN
        prop readonly console: bool
        
        prop readonly start_daemon: bool
        prop readonly stop_daemon: bool
        prop readonly status_daemon: bool
