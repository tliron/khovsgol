[indent=4]

uses
    DBusUtil

namespace Khovsgol.Client.GTK

    class Instance: Object implements Client.Instance
        construct(args: array of string) raises GLib.Error
            _configuration = new Configuration()

            initialize_logging()
            
            _dir = File.new_for_path(args[0]).get_parent()
            _api = new API("localhost", 8181)
            player = Environment.get_user_name()
            _window = new MainWindow(self)
            
            add_plugin(new Plugins.NotificationsPlugin())
            add_plugin(new Plugins.MediaPlayerKeysPlugin())
            add_plugin(new Plugins.Mpris2Plugin())
            //add_plugin(new Plugins.MusicIndicatorPlugin())
            add_plugin(new Plugins.UnityPlugin())
            add_plugin(new Plugins.PurplePlugin())
            
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
            if _configuration.server_autostart
                start_server()
                
            for var plugin in _plugins
                plugin.start()

            _api.start_player_poll()
            
            Gtk.main()
        
        def stop()
            _api.stop_player_poll(true)
            
            for var plugin in _plugins
                plugin.stop()
                
            if _configuration.server_autostop
                stop_server()

            Gtk.main_quit()
            
        def show()
            _window.present()
        
        def get_resource(name: string): File?
            // TODO: try standard location first
            var base_dir = _dir.get_parent()
            if base_dir is not null
                var file = base_dir.get_child("resources").get_child(name)
                if file.query_exists()
                    return file
            return null
        
        _player: string
        _plugins: list of Plugin = new list of Plugin
        
        def private start_server()
            try
                Process.spawn_sync(dir.get_path(), {"khovsgold", "--start"}, null, SpawnFlags.STDOUT_TO_DEV_NULL|SpawnFlags.STDERR_TO_DEV_NULL, null)
            except e: SpawnError
                _logger.exception(e)

        def private stop_server()
            pid: Pid
            try
                Process.spawn_async(dir.get_path(), {"khovsgold", "--stop"}, null, SpawnFlags.STDOUT_TO_DEV_NULL|SpawnFlags.STDERR_TO_DEV_NULL, null, out pid)
            except e: SpawnError
                _logger.exception(e)
        
    _logger: Logging.Logger
        
    def private static initialize_logging() raises GLib.Error
        _logger = Logging.get_logger("khovsgol.client")
        
        var appender = new Logging.FileAppender()
        appender.deepest_level = LogLevelFlags.LEVEL_MESSAGE
        appender.set_path("%s/.khovsgol/log/client.log".printf(Environment.get_home_dir()))
        Logging.get_logger().appender = appender

init
    try
        GtkUtil.initialize()
        new Khovsgol.Client.GTK.Instance(args).start()
    except e: GLib.Error
        stderr.printf("%s\n", e.message)
