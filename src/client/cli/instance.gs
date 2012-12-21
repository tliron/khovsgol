[indent=4]

uses
    JsonUtil
    AvahiUtil

namespace Khovsgol.Client.CLI

    class Instance: GLib.Object
        construct(args: array of string) raises GLib.Error
            _arguments = new Arguments(args)
            _api = new Client.API()
            _api.connect(_arguments.host, _arguments.port)
            
        def start() raises GLib.Error
            var command = _arguments.args[1]
            
            if command == "status"
                print_player(_api.get_player(_arguments.player))
        
            else if command == "listen"
                pass
                    
            else if command == "unlisten"
                pass

            else if command == "play"
                print_player(_api.set_play_mode(_arguments.player, "playing"))

            else if command == "stop"
                print_player(_api.set_play_mode(_arguments.player, "stopped"))

            else if command == "pause"
                print_player(_api.set_play_mode(_arguments.player, "toggle_paused"))

            else if command == "next"
                print_player(_api.set_position_in_playlist_string(_arguments.player, "next"))

            else if command == "prev"
                print_player(_api.set_position_in_playlist_string(_arguments.player, "prev"))

            else if command == "cursor"
                if _arguments.args.length < 3
                    stderr.printf("You must provide the position (a number)\n")
                    Posix.exit(1)
                var position = int.parse(_arguments.args[2])
                print_player(_api.set_position_in_playlist(_arguments.player, position))

            else if command == "trackposition"
                if _arguments.args.length < 3
                    stderr.printf("You must provide the position (a decimal)\n")
                    Posix.exit(1)
                var position = double.parse(_arguments.args[2])
                print_player(_api.set_position_in_track(_arguments.player, position))

            else if command == "trackratio"
                if _arguments.args.length < 3
                    stderr.printf("You must provide the ratio (a decimal)\n")
                    Posix.exit(1)
                var ratio = double.parse(_arguments.args[2])
                print_player(_api.set_ratio_in_track(_arguments.player, ratio))

            else if command == "cursormode"
                if _arguments.args.length < 3
                    stderr.printf("You must provide the cursor mode\n")
                    Posix.exit(1)
                var cursor_mode = _arguments.args[2]
                print_player(_api.set_cursor_mode(_arguments.player, cursor_mode))

            else if command == "addtrack"
                pass

            else if command == "removetrack"
                pass

            else if command == "setplug"
                pass

            else if command == "removeplug"
                pass

            else if command == "tracks"
                pass

            else if command == "tracksby"
                if _arguments.args.length < 3
                    stderr.printf("You must provide the artist name\n")
                    Posix.exit(1)
                var args = new Client.API.GetTracksArgs()
                args.by_artist = _arguments.args[2]
                args.sort.add("path")
                for track in _api.get_tracks(args)
                    print track.path

            else if command == "tracksin"
                if _arguments.args.length < 3
                    stderr.printf("You must provide the album name\n")
                    Posix.exit(1)
                var args = new Client.API.GetTracksArgs()
                args.in_album = _arguments.args[2]
                args.sort.add("position")
                for track in _api.get_tracks(args)
                    print track.path

            else if command == "track"
                pass

            else if command == "albums"
                for var album in _api.get_albums()
                    var path = album.path
                    if path is not null
                        stdout.printf("%s\n", path)

            else if command == "albumsby"
                if _arguments.args.length < 3
                    stderr.printf("You must provide the artist name\n")
                    Posix.exit(1)
                var args = new Client.API.GetAlbumsArgs()
                args.by_artist = _arguments.args[2]
                for var album in _api.get_albums(args)
                    var path = album.path
                    if path is not null
                        stdout.printf("%s\n", path)

            else if command == "albumswith"
                if _arguments.args.length < 3
                    stderr.printf("You must provide the artist name\n")
                    Posix.exit(1)
                var args = new Client.API.GetAlbumsArgs()
                args.with_artist = _arguments.args[2]
                for var album in _api.get_albums(args)
                    var path = album.path
                    if path is not null
                        stdout.printf("%s\n", path)

            else if command == "albumsat"
                if _arguments.args.length < 3
                    stderr.printf("You must provide the date (a number)\n")
                    Posix.exit(1)
                var args = new Client.API.GetAlbumsArgs()
                args.at_date = int.parse(_arguments.args[2])
                for var album in _api.get_albums(args)
                    var path = album.path
                    if path is not null
                        stdout.printf("%s\n", path)

            else if command == "compilations"
                var args = new Client.API.GetAlbumsArgs()
                args.album_type = 1
                for var album in _api.get_albums(args)
                    var path = album.path
                    if path is not null
                        stdout.printf("%s\n", path)

            else if command == "album"
                pass

            else if command == "artists"
                for var artist in _api.get_artists()
                    var name = artist.name
                    if name is not null
                        stdout.printf("%s\n", name)

            else if command == "albumartists"
                for var artist in _api.get_artists(true)
                    var name = artist.name
                    if name is not null
                        stdout.printf("%s\n", name)

            else if command == "dates"
                for var date in _api.get_dates()
                    stdout.printf("%d\n", date)

            else if command == "scan"
                if _arguments.library is not null
                    _api.library_action(_arguments.library, "scan")
                else
                    for var library in _api.get_libraries()
                        var name = get_string_member_or_null(library, "name")
                        if name is not null
                            _api.library_action(name, "scan")

            else if command == "players"
                for var player in _api.get_players()
                    print_player(player)

            else if command == "libraries"
                for var library in _api.get_libraries()
                    var name = get_string_member_or_null(library, "name")
                    if name is not null
                        stdout.printf("Library: %s\n", name)
                        for var directory in new JsonObjects(get_array_member_or_null(library, "directories"))
                            var path = get_string_member_or_null(directory, "path")
                            var scanning = get_bool_member_or_false(directory, "scanning")
                            if path is not null
                                stdout.printf("  Directory: %s", path)
                                if scanning
                                    stdout.printf(" (currently scanning)\n")
                                else
                                    stdout.printf("\n")
                                    
            else if command == "servers"
                print "Scanning for servers, press any key to exit..."
                
                _browser = new Browser("_khovsgol._tcp")
                _browser.found.connect(on_avahi_found)
                _browser.removed.connect(on_avahi_removed)
                _browser.client.start()

                var main_loop = new MainLoop()
                new ExitOnKeyPress(main_loop)
                main_loop.run()

            else
                stderr.printf("Unknown command: %s\n", command)
                Posix.exit(1)
                        
        _arguments: Arguments
        _api: Client.API
        _browser: Browser

        def private on_avahi_found(info: ServiceFoundInfo)
            // Only show IPv4
            if info.protocol == Avahi.Protocol.INET
                stdout.printf("Found: %s (port %u)\n", info.hostname, info.port)
        
        def private on_avahi_removed(info: ServiceInfo)
            stdout.printf("Disappeared: %s\n", info.to_id())
        
        def private static indent(indentation: int)
            if indentation > 0
                stdout.printf(string.nfill(indentation * 2, ' '))                    

        def private static print_player(player: Json.Object?)
            if player is not null
                var name = get_string_member_or_null(player, "name")
                if name is not null
                    stdout.printf("Player: %s\n", name)

                    var playlist = get_object_member_or_null(player, "playList")
                    if playlist is not null
                        var id = get_string_member_or_null(playlist, "id")
                        if id is not null
                            indent(1)
                            stdout.printf("Unique ID: %s\n", id)
                        var version = get_int64_member_or_min(playlist, "version")
                        if version != int64.MIN
                            indent(1)
                            stdout.printf("Version: %lld\n", version)
                    
                    var cursor_mode = get_string_member_or_null(player, "cursorMode")
                    if cursor_mode is not null
                        indent(1)
                        stdout.printf("Mode: %s\n", cursor_mode)
                    
                    var track_duration = double.MIN
                    var ratio = double.MIN
                    var position_in_playlist = int.MIN
                    var cursor = get_object_member_or_null(player, "cursor")
                    if cursor is not null
                        position_in_playlist = get_int_member_or_min(cursor, "positionInPlaylist")
                        var position_in_track = get_double_member_or_min(cursor, "positionInTrack")
                        track_duration = get_double_member_or_min(cursor, "trackDuration")
                        if (position_in_track != double.MIN) and (track_duration != double.MIN)
                            ratio = position_in_track / track_duration

                    var play_mode = get_string_member_or_null(player, "playMode")
                    if play_mode is not null
                        indent(1)
                        if ratio != double.MIN
                            stdout.printf("Currently %s (at %d%% of %d seconds)\n", play_mode, (int)(Math.round(ratio * 100)), (int) track_duration)
                        else
                            stdout.printf("Currently %s\n", play_mode)
                            
                    if playlist is not null
                        for var track in new JsonTracks(get_array_member_or_null(playlist, "tracks"))
                            var position = track.position_in_playlist
                            var path = track.path
                            if path is not null
                                indent(2)
                                if position != int.MIN
                                    if position == position_in_playlist
                                        stdout.printf(">%d: %s\n", position, path)
                                    else
                                        stdout.printf(" %d: %s\n", position, path)
                                else
                                    stdout.printf("%s\n", path)

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
        s.append("  scan\n")
        s.append("\n")
        s.append("General commands:\n")
        s.append("\n")
        s.append("  players\n")
        s.append("  libraries\n")
        s.append("  servers")
        return s.str

init
    try
        new Khovsgol.Client.CLI.Instance(args).start()
    except e: GLib.Error
        stderr.printf("%s\n", e.message)
