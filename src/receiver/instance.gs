[indent=4]

uses
    Nap

namespace Khovsgol.Receiver

    class Instance
        construct(args: array of string) raises GLib.Error
            _arguments = new Arguments(args)

            // Note: the Gst bus seems to work only with the default GLib.MainContext
            _main_loop = new MainLoop(null, false)
            
            if _arguments.start_daemon or _arguments.stop_daemon or _arguments.status_daemon
                Daemonize.handle("khovsgol", "khovsgolr", _arguments.start_daemon, _arguments.stop_daemon, _main_loop)
                
            _configuration = new Configuration()
            initialize_logging(_arguments.console)

            _api = new Api(self)
            _uri_space = new UriSpace(_api)

            if _arguments.port != int.MIN
                _configuration.port_override = _arguments.port

            _server = new _Soup.Server(_configuration.port, _main_loop.get_context())
            _server.set_handler(_uri_space.handle)
        
        prop player: Player?
            
        def start()
            _server.start()
            _main_loop.run()

        _arguments: Arguments
        _configuration: Configuration
        _server: Nap.Server
        _main_loop: MainLoop
        _api: Api
        _uri_space: UriSpace

    _logger: Logging.Logger
    
    def private static initialize_logging(console: bool) raises GLib.Error
        _logger = Logging.get_logger("khovsgol.receiver")
        
        if not console
            var appender = new Logging.FileAppender()
            appender.deepest_level = LogLevelFlags.LEVEL_DEBUG // LogLevelFlags.LEVEL_MESSAGE
            appender.set_path("%s/.khovsgol/log/receiver.log".printf(Environment.get_home_dir()))
            Logging.get_logger().appender = appender
        else
            var appender = new Logging.StreamAppender()
            Logging.get_logger().appender = appender

init
    try
        new Khovsgol.Receiver.Instance(args).start()
    except e: GLib.Error
        stderr.printf("%s\n", e.message)
        Posix.exit(1)
