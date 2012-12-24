[indent=4]

namespace Khovsgol.Receiver

    class Arguments: Object
        construct(args: array of string)
            restart_daemon: bool = false

            var options = new array of OptionEntry[7]
            options[0] = {"version", 0, 0, OptionArg.NONE, ref _version,       "Show version", null}
            options[1] = {"start",   0, 0, OptionArg.NONE, ref _start_daemon,  "Start as daemon", null}
            options[2] = {"stop",    0, 0, OptionArg.NONE, ref _stop_daemon,   "Stop daemon", null}
            options[3] = {"restart", 0, 0, OptionArg.NONE, ref restart_daemon, "Restart daemon", null}
            options[4] = {"status",  0, 0, OptionArg.NONE, ref _status_daemon, "Show daemon status", null}
            options[5] = {"console", 0, 0, OptionArg.NONE, ref _console,       "Log to console", null}
            options[6] = {null}
            
            var context = new OptionContext("- Khovsgol Receiver")
            context.set_summary("The anywhere-to-anywhere music player and library/playlist manager")
            context.set_help_enabled(true)
            context.add_main_entries(options, null)

            try
                context.parse(ref args)
                
                if _version
                    print VERSION
                    Posix.exit(0)

                if restart_daemon
                    _stop_daemon = true
                    _start_daemon = true
                    
            except e: OptionError
                stderr.printf("%s\n", e.message)
                print "Use '%s --help' to see a full list of available command line options.\n", args[0]
                Posix.exit(1)
    
        _version: bool
        
        prop readonly console: bool

        prop readonly start_daemon: bool
        prop readonly stop_daemon: bool
        prop readonly status_daemon: bool
