[indent=4]

uses
    Nap
    
namespace Khovsgol.Server

    class Instance: Object implements Crucible
        construct(args: array of string) raises GLib.Error
            _arguments = new Arguments(args)
            _configuration = new Configuration()

            // Note: Gst messages seem to only work with the default GLib.MainContext
            _main_loop = new MainLoop(null, false)
            
            if _arguments.start_daemon || _arguments.stop_daemon || _arguments.status_daemon
                Daemonize.handle("khovsgol", _arguments.start_daemon, _arguments.stop_daemon, _main_loop)
            
            initialize_logging(_arguments.console)
            
            _libraries = create_libraries()
            _libraries.initialize()
            _players = create_players()
            //test_data()

            _api = new Api(self)
            _uri_space = new UriSpace(_api)
            
            if _arguments.threads != int.MIN
                _configuration.threads_override = _arguments.threads

            if _arguments.port != int.MIN
                _configuration.port_override = _arguments.port

            if _arguments.delay != int64.MIN
                _configuration.delay_override = _arguments.delay

            Connector._Soup.Server.delay = (ulong) (_configuration.delay * 1000)

            _server = new Connector._Soup.Server(_configuration.port, _main_loop.get_context())
            _server.set_handler(_uri_space.handle)

            if _configuration.threads > 0
                try
                    _server.thread_pool = new Nap.ThreadPool(_configuration.threads)
                except e: ThreadError
                    raise new Error.NETWORK(e.message)
                if !SqliteUtil.enable_multithreaded()
                    raise new Error.DATABASE("Could not enable multithreaded Sqlite")

        prop readonly configuration: Configuration
        prop readonly libraries: Libraries
        prop readonly players: Players

        def create_libraries(): Libraries
            var libraries = new Sqlite.Libraries()
            for var name in _configuration.libraries
                var library = create_library()
                library.name = name
                for var path in _configuration.get_directories(name)
                    var directory = create_directory()
                    directory.path = path
                    library.directories[path] = directory
                libraries.libraries[name] = library
            return libraries
        
        def create_players(): Players
            var players = new Players()
            players.crucible = self
            return players
                        
        def create_library(): Library
            var library = new Library()
            library.crucible = self
            return library
            
        def create_directory(): Directory
            var directory = new Filesystem.Directory()
            directory.crucible = self
            return directory

        def create_player(): Player
            var player = new GStreamer.Player()
            player.crucible = self
            return player
            
        def create_play_list(): PlayList
            var play_list = new PlayList()
            play_list.crucible = self
            return play_list
        
        def start()
            _server.start()
            _main_loop.run()

        _arguments: Arguments
        _server: Nap.Server
        _main_loop: MainLoop
        _api: Api
        _uri_space: UriSpace

        def test_data() raises GLib.Error
            var l = create_library()
            l.name = "Main"
            var d = create_directory()
            d.path = "/Depot/Music"
            l.directories[d.path] = d
            _libraries.libraries[l.name] = l
            
            var p = create_player()
            p.name = "emblemparade"
            _players.players[p.name] = p

            /*var t = new Track()
            t.path = "/Depot/Music/50 Foot Wave/Power+Light [EP]/01 - Power+Light.flac"
            t.title = "Power+Light"
            t.title_sort = "powerlight"
            t.artist = "50 Foot Wave"
            t.artist_sort = "50footwave"
            t.album = "Power+Light [EP]"
            t.album_sort = "powerlightep"
            t.album_path = "/Depot/Music/50 Foot Wave/Power+Light [EP]"
            t.duration = 100
            t.file_type = "flac"
            t.position = 1
            p.play_list.tracks.add(t)
            p.play_list.version = 12345
            p.play_list.id = "05c14cdc-2e2b-11e2-acee-00241ddd2a14"*/

    _logger: Logging.Logger
    
    def private static initialize_logging(console: bool) raises GLib.Error
        _logger = Logging.get_logger("khovsgol.server")
        
        if !console
            var appender = new Logging.FileAppender()
            appender.deepest_level = LogLevelFlags.LEVEL_INFO
            appender.set_path("%s/.khovsgol/log/server.log".printf(Environment.get_home_dir()))
            Logging.get_logger().appender = appender
            
            appender = new Logging.FileAppender()
            appender.deepest_level = LogLevelFlags.LEVEL_DEBUG
            appender.set_path("%s/.khovsgol/log/web.log".printf(Environment.get_home_dir()))
            appender.renderer = new Logging.SimpleRenderer()
            Logging.get_logger("nap.server.ncsa").appender = appender
        else
            var appender = new Logging.StreamAppender()
            Logging.get_logger().appender = appender
        
init
    try
        new Khovsgol.Server.Instance(args).start()
    except e: GLib.Error
        stderr.printf("%s\n", e.message)
