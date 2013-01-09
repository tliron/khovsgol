[indent=4]

uses
    JsonUtil
    AvahiUtil

namespace Khovsgol.Client.CLI

    class Arguments: Object
        construct(args: array of string)
            libraries: string? = null
        
            var options = new array of OptionEntry[7]
            options[0] = {"version",   0, 0, OptionArg.NONE,   ref _version,  "Show version", null}
            options[1] = {"host",      0, 0, OptionArg.STRING, ref _host,     "Server host (defaults to \"localhost\")", ""}
            options[2] = {"port",      0, 0, OptionArg.INT,    ref _port,     "Web server TCP port (defaults to 8185)", "number"}
            options[3] = {"player",    0, 0, OptionArg.STRING, ref _player,   "Select player (defaults to your username)", ""}
            options[4] = {"libraries", 0, 0, OptionArg.STRING, ref libraries, "Filter by libraries (comma separated)", ""}
            options[5] = {"sort",      0, 0, OptionArg.STRING, ref _sort,     "Sort by these fields in order (comma separated)", ""}
            options[6] = {null}
            
            var context = new OptionContext("- Khovsgol Command Line Client")
            context.set_summary(get_help())
            context.set_help_enabled(true)
            context.add_main_entries(options, null)

            try
                context.parse(ref args)

                if _version
                    print VERSION
                    Posix.exit(0)

                _args = args
                if _args.length == 1
                    // No commands, so print out help and exit
                    stdout.puts(context.get_help(true, null))
                    Posix.exit(0)
                
                if _player is null
                    _player = Environment.get_user_name()
                
                if libraries is not null
                    for var library in libraries.split(",")
                        _libraries.add(library)
                    
            except e: OptionError
                stderr.printf("%s\n", e.message)
                print "Use '%s --help' to see a full list of available command line options.\n", args[0]
                Posix.exit(1)
    
        _version: bool

        prop readonly args: array of string
        prop readonly host: string = "localhost"
        prop readonly port: int = 8185
        prop readonly player: string
        prop readonly libraries: list of string = new list of string
        prop readonly sort: string
