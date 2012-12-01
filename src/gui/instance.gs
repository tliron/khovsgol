[indent=4]

uses
    Khovsgol

namespace Khovsgol.GUI

    class Instance: Object
        construct(args: array of string) raises GLib.Error
            _configuration = new Configuration()

            initialize_logging()
            
            _dir = File.new_for_path(args[0]).get_parent()
            _api = new Client.API("localhost", 8181)
            player = Environment.get_user_name()
            _window = new MainWindow(self)
            
        prop readonly configuration: Configuration
        prop readonly dir: File
        prop readonly api: Client.API
        prop readonly window: MainWindow

        prop player: string
            get
                return _player
            set
                if _player != value
                    _api.watching_player = _player = value
    
        def start()
            _api.start_player_poll()
            Gtk.main()
        
        def stop()
            Gtk.main_quit()
            _api.stop_player_poll(true)
        
        _player: string
        
    _logger: Logging.Logger
        
    def private static initialize_logging() raises GLib.Error
        _logger = Logging.get_logger("khovsgol.client")
        
        var appender = new Logging.FileAppender()
        appender.deepest_level = LogLevelFlags.LEVEL_INFO
        appender.set_path("%s/.khovsgol/log/client.log".printf(Environment.get_home_dir()))
        Logging.get_logger().appender = appender

init
    try
        GtkUtil.initialize()
        new Khovsgol.GUI.Instance(args).start()
    except e: GLib.Error
        stderr.printf("%s\n", e.message)
