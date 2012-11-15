[indent=4]

namespace Khovsgol.Server

    class Arguments: Object
        construct(args: array of string)
            restart_daemon: bool = false
            
            var options = new array of OptionEntry[8]
            options[0] = {"port",    0, 0, OptionArg.INT,   ref _port,          "Web server TCP port (defaults to 8080)", "number"}
            options[1] = {"threads", 0, 0, OptionArg.INT,   ref _threads,       "Non-zero number of threads to enable multithreaded web server, -1 to use all CPU cores (defaults to 0)", "number"}
            options[2] = {"delay",   0, 0, OptionArg.INT64, ref _delay,         "Delay all web responses (defaults to 0)", "milliseconds"}
            options[3] = {"start",   0, 0, OptionArg.NONE,  ref _start_daemon,  "Start as daemon", null}
            options[4] = {"stop",    0, 0, OptionArg.NONE,  ref _stop_daemon,   "Stop daemon", null}
            options[5] = {"restart", 0, 0, OptionArg.NONE,  ref restart_daemon, "Restart daemon", null}
            options[6] = {"status",  0, 0, OptionArg.NONE,  ref _status_daemon, "Show daemon status", null}
            options[7] = {null}
            
            var context = new OptionContext("- Khovsgol Server")
            context.set_summary("The anywhere-to-anywhere music player and library/playlist manager")
            context.set_help_enabled(true)
            context.add_main_entries(options, null)

            try
                context.parse(ref args)
                
                if restart_daemon
                    _stop_daemon = true
                    _start_daemon = true

                if _threads < 0
                    _threads = System.get_n_cpus()
                    
            except e: OptionError
                stderr.printf("%s\n", e.message)
                print "Use '%s --help' to see a full list of available command line options.\n", args[0]
                Posix.exit(1)
    
        prop readonly port: int = 8181
        prop readonly threads: int = 0
        prop readonly delay: int = 0
        
        prop readonly start_daemon: bool
        prop readonly stop_daemon: bool
        prop readonly status_daemon: bool
