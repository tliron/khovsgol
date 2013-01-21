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

            if _arguments.latency != int.MIN
                _configuration.player_latency_override = _arguments.latency

            if _arguments.sink is not null
                _configuration.player_sink_override = _arguments.sink

            _server = new _Soup.Server(_configuration.port, _main_loop.get_context())
            _server.set_handler(_uri_space.handle)

        prop readonly configuration: Configuration
        
        prop player: Player?
            get
                return _player
            set
                _player = value
                if _player is not null
                    if _configuration.player_spec != _player.spec
                        _configuration.player_spec = _player.spec
                        _configuration.save()
            
        def start()
            var player_spec = _configuration.player_spec
                if player_spec is not null
                    _player = create_player(_configuration, player_spec)
                    if _player is not null
                        _player.play()
            
            _server.start()
            _main_loop.run()

        _arguments: Arguments
        _server: Nap.Server
        _main_loop: MainLoop
        _api: Api
        _uri_space: UriSpace
        _player: Player?

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
        Process.exit(1)
