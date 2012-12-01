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
            _window = new MainWindow(self)

            player = Environment.get_user_name()
            
            add_plugin(new Plugins.MediaKeysPlugin())
            add_plugin(new Plugins.NotificationsPlugin())
            add_plugin(new Plugins.UnityPlugin())
            
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
        
        def add_plugin(plugin: Plugin)
            plugin.instance = self
            _plugins.add(plugin)
    
        def start()
            for var plugin in _plugins
                plugin.start()
            Gdk.threads_add_idle(_api.start_player_poll)
            Gtk.main()
        
        def stop()
            for var plugin in _plugins
                plugin.stop()
            _api.stop_player_poll(true)
            Gtk.main_quit()
        
        _player: string
        _plugins: list of Plugin = new list of Plugin
        
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
