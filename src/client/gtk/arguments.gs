[indent=4]

namespace Khovsgol.Client.GTK

    class Arguments: Object
        construct(command_line: ApplicationCommandLine)
            var args = command_line.get_arguments()
            var length = args.length
            if length == 0
                command_line.printerr("Bad command line")
                _quit = true
                _status_code = 1
            
            _file = File.new_for_path(args[0])
        
            var options = new array of OptionEntry[3]
            options[0] = {"version", 0, 0, OptionArg.NONE, ref _version, "Show version", null}
            options[1] = {"console", 0, 0, OptionArg.NONE, ref _console, "Log to console", null}
            options[2] = {null}
            
            var context = new OptionContext("- Khovsgol GTK+ Client")
            context.set_summary("The anywhere-to-anywhere music player and library/playlist manager")
            context.set_help_enabled(false) // otherwise, it will print to stdout... useless for us
            context.add_main_entries(options, null)

            try
                // Parse wants to change the args
                var args_copy = new array of string[length]
                for var i = 0 to (length - 1)
                    args_copy[i] = args[i]
                unowned_args: unowned array of string = args_copy

                context.parse(ref unowned_args)
                
                if _version
                    command_line.print("%s\n", VERSION)
                    _quit = true
                    return
                    
            except e: OptionError
                command_line.print("%s\n", e.message)
                command_line.print(context.get_help(true, null))
                _quit = true
                _status_code = 1
        
        prop readonly file: File
        prop readonly quit: bool
        prop readonly status_code: int = 0
    
        _version: bool

        prop readonly console: bool
