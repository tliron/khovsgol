[indent=4]

namespace Khovsgol.Client.GTK

    class Arguments: Object
        construct(args: array of string)
            var options = new array of OptionEntry[3]
            options[0] = {"version", 0, 0, OptionArg.NONE, ref _version, "Show version", null}
            options[1] = {"console", 0, 0, OptionArg.NONE, ref _console, "Log to console", null}
            options[2] = {null}
            
            var context = new OptionContext("- Khovsgol GTK+ Client")
            context.set_summary("The anywhere-to-anywhere music player and library/playlist manager")
            context.set_help_enabled(true)
            context.add_main_entries(options, null)

            try
                context.parse(ref args)
                
                if _version
                    print VERSION
                    Posix.exit(0)
                    
            except e: OptionError
                stderr.printf("%s\n", e.message)
                print "Use '%s --help' to see a full list of available command line options.\n", args[0]
                Posix.exit(1)
    
        _version: bool

        prop readonly console: bool
