[indent=4]

uses
    Nap
    
namespace Khovsgol.Server

    class Instance: Object implements Crucible
        construct(args: array of string) raises GLib.Error
            _arguments = new Arguments(args)

            // Note: Gst messages seem to only work with the default GLib.MainContext
            _main_loop = new MainLoop(null, false)
            
            if _arguments.start_daemon || _arguments.stop_daemon || _arguments.status_daemon
                Daemonize.handle("khovsgol", _arguments.start_daemon, _arguments.stop_daemon, _main_loop)
            
            initialize_logging()
            
            _libraries = new Sqlite.Libraries()
            _libraries.initialize()
            _players = new Players()
            test_data()

            _api = new Api(self)
            _uri_space = new UriSpace(_api)
            
            Connector._Soup.Server.delay = _arguments.delay * 1000

            _server = new Connector._Soup.Server(_arguments.port, _main_loop.get_context())
            _server.set_handler(_uri_space.handle)

            if _arguments.threads > 0
                try
                    _server.thread_pool = new Nap.ThreadPool(_arguments.threads)
                except e: ThreadError
                    stderr.printf("%s\n", e.message)
                    _logger.warning(e.message)
        
        prop readonly libraries: Libraries
        prop readonly players: Players
        
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
        
        def initialize_logging() raises GLib.Error
            var appender = new Logging.FileAppender()
            appender.deepest_level = LogLevelFlags.LEVEL_INFO
            appender.set_path("%s/.khovsgol/log/server.log".printf(Environment.get_home_dir()))
            Logging.get_logger().appender = appender
            
            appender = new Logging.FileAppender()
            appender.deepest_level = LogLevelFlags.LEVEL_INFO
            appender.set_path("%s/.khovsgol/log/web.log".printf(Environment.get_home_dir()))
            Logging.get_logger("nap.web").appender = appender
            
        def start()
            stdout.printf("Starting Khövsgöl server at port %d, %d threads\n", _arguments.port, _arguments.threads)
            _logger.info("Starting Khövsgöl server at port %d, %d threads", _arguments.port, _arguments.threads)
            _server.start()
            _main_loop.run()

        _arguments: Arguments
        _server: Nap.Server
        _main_loop: MainLoop
        _logger: Logging.Logger = Logging.get_logger("khovsgol.server")
        _api: Api
        _uri_space: UriSpace

        def private test_data() raises GLib.Error
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
            context.set_summary("Music player server")
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
    
init
    try
        new Khovsgol.Server.Instance(args).start()
    except e: GLib.Error
        stderr.printf("%s\n", e.message)
