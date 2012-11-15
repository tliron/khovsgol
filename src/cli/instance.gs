[indent=4]

uses
    Khovsgol
    Nap

namespace Khovsgol.CLI

    class Instance: GLib.Object
        construct(args: array of string) raises GLib.Error
            _arguments = new Arguments(args)
            _client = new Nap.Connector._Soup.Client("http://%s:%u".printf(_arguments.host, _arguments.port))
            
        def start()
            var command = _arguments.args[1]
            if command == "status"
                var status = _client.get_json_object(Method.GET, Template.render("/player/{player}/", _arguments.player))
                if status is not null
                    print JsonUtil.object_to(status, true)
        
        _arguments: Arguments
        _client: Client

    def get_help(): string
        var s = new StringBuilder()
        s.append("Player commands:\n")
        s.append("  (Supported switch: --player=name)\n")
        s.append("\n")
        s.append("  status\n")
        s.append("  listen [name] [sink]\n")
        s.append("  unlisten\n")
        s.append("  play\n")
        s.append("  stop\n")
        s.append("  pause\n")
        s.append("  next\n")
        s.append("  prev\n")
        s.append("  cursor [track number]\n")
        s.append("  trackposition [seconds]\n")
        s.append("  trackratio [ratio]\n")
        s.append("  cursormode [cursor mode]\n")
        s.append("  addtrack [track path]\n")
        s.append("  removetrack [track path]\n")
        s.append("  setplug [name] [type] [host] [port]\n")
        s.append("  removeplug [name]\n")
        s.append("\n")
        s.append("Library commands:\n")
        s.append("  (Supported switches: --library=name, --sort=name,name,...)\n")
        s.append("\n")
        s.append("  tracks [like]\n")
        s.append("  tracksby [artist]\n")
        s.append("  tracksin [album path]\n")
        s.append("  track [track path]\n")
        s.append("  albums\n")
        s.append("  albumsby [artist]\n")
        s.append("  albumswith [artist]\n")
        s.append("  albumsat [date]\n")
        s.append("  compilations\n")
        s.append("  album [album path]\n")
        s.append("  artists\n")
        s.append("  albumartists\n")
        s.append("  dates\n")
        s.append("\n")
        s.append("General commands:\n")
        s.append("\n")
        s.append("  players\n")
        s.append("  libraries")
        return s.str

    class Arguments: Object
        construct(args: array of string)
            var options = new array of OptionEntry[6]
            options[0] = {"host",    0, 0, OptionArg.STRING, ref _host,    "Server host (defaults to \"localhost\")", ""}
            options[1] = {"port",    0, 0, OptionArg.INT,    ref _port,    "Web server TCP port (defaults to 8080)", "number"}
            options[2] = {"player",  0, 0, OptionArg.STRING, ref _player,  "Select player (defaults to your username)", ""}
            options[3] = {"library", 0, 0, OptionArg.STRING, ref _library, "Filter by library", ""}
            options[4] = {"sort",    0, 0, OptionArg.STRING, ref _sort,    "Sort by these fields in order (comma separated)", ""}
            options[5] = {null}
            
            var context = new OptionContext("- Khovsgol Command Line Client")
            context.set_summary(get_help())
            context.set_help_enabled(true)
            context.add_main_entries(options, null)

            try
                context.parse(ref args)
                _args = args
                
                if _args.length == 1
                    // No commands, so print out help and exit
                    stdout.puts(context.get_help(true, null))
                    Posix.exit(0)
                
                if _player is null
                    _player = Environment.get_user_name()
                    
            except e: OptionError
                stderr.printf("%s\n", e.message)
                print "Use '%s --help' to see a full list of available command line options.\n", args[0]
                Posix.exit(1)
    
        prop readonly args: array of string
        prop readonly host: string = "localhost"
        prop readonly port: int = 8181
        prop readonly player: string
        prop readonly library: string
        prop readonly sort: string

init
    try
        new Khovsgol.CLI.Instance(args).start()
    except e: GLib.Error
        stderr.printf("%s\n", e.message)
