[indent=4]

uses
    Nap
    
namespace Khovsgol.Server

    class Instance: Object
        construct(args: array of string) raises GLib.Error
            _arguments = new Arguments(args)

            // Note: Gst requires us to use the default GLib.MainContext
            _main_loop = new MainLoop(null, false)
            
            if _arguments.start_daemon || _arguments.stop_daemon || _arguments.status_daemon
                Daemonize.handle("khovsgol", _arguments.start_daemon, _arguments.stop_daemon, _main_loop)
            
            initialize_logging()

            _resources = new Resources(new Sqlite.Libraries())
            _player = new GStreamer.Player()
            
            Connector._Soup.Server.delay = _arguments.delay * 1000

            _server = new Connector._Soup.Server(_arguments.port, _main_loop.get_context())
            _server.set_handler(_resources.router.handle)

            if _arguments.threads > 0
                try
                    _server.thread_pool = new Nap.ThreadPool(_arguments.threads)
                except e: ThreadError
                    print e.message
        
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
        _player: GStreamer.Player
        _main_loop: MainLoop
        _logger: Logging.Logger = Logging.get_logger("khovsgol.server")
        _resources: Resources

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
