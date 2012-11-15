[indent=4]

uses
    Khovsgol
    Nap
    JsonUtil

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
                    var name = get_string_member_or_null(status, "name")
                    if name is not null
                        stdout.printf("Player: %s\n", name)
                        var play_mode = get_string_member_or_null(status, "playMode")
                        if play_mode is not null
                            stdout.printf("  Play mode: %s\n", play_mode)
                        var play_list = get_object_member_or_null(status, "playList")
                        if play_list is not null
                            var id = get_string_member_or_null(play_list, "id")
                            if id is not null
                                stdout.printf("  ID: %s\n", id)
                            var version = get_int64_member_or_min(play_list, "version")
                            if version != int64.MIN
                                stdout.printf("  Version: %lld\n", version)
                            var tracks = get_array_member_or_null(play_list, "tracks")
                            if tracks is not null
                                for var i = 0 to (tracks.get_length() - 1)
                                    var track = get_object_element_or_null(tracks, i)
                                    var position = get_int_member_or_min(track, "position")
                                    var path = get_string_member_or_null(track, "path")
                                    if path is not null
                                        if position != int.MIN
                                            stdout.printf("    %d: %s\n", position, path)
                                        else
                                            stdout.printf("    %s\n", path)
                    

            if command == "libraries"
                var libraries = _client.get_json_array(Method.GET, "/libraries/")
                if libraries is not null
                    for var i = 0 to (libraries.get_length() - 1)
                        var library = get_object_element_or_null(libraries, i)
                        var name = get_string_member_or_null(library, "name")
                        if name is not null
                            stdout.printf("Library: %s\n", name)
                            var directories = get_array_member_or_null(library, "directories")
                            if directories is not null
                                for var ii = 0 to (directories.get_length() - 1)
                                    var directory = get_object_element_or_null(directories, ii)
                                    if directory is not null
                                        var path = get_string_member_or_null(directory, "path")
                                        var scanning = get_bool_member_or_false(directory, "scanning")
                                        if path is not null
                                            stdout.printf("  Directory: %s", path)
                                            if scanning
                                                stdout.printf(" (currently scanning)\n")
                                            else
                                                stdout.printf("\n")
                        
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
