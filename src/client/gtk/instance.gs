[indent=4]

uses
    DBusUtil
    AvahiUtil

namespace Khovsgol.Client.GTK

    class Instance: Object implements Client.Instance
        construct(application: Application, args: array of string) raises GLib.Error
            _configuration = new Configuration()

            initialize_logging()
            
            player = Environment.get_user_name()

            _dir = File.new_for_path(args[0]).get_parent()
            _window = new MainWindow(self)
            
            add_plugin(new Plugins.NotificationsPlugin())
            add_plugin(new Plugins.MediaPlayerKeysPlugin())
            add_plugin(new Plugins.Mpris2Plugin())
            add_plugin(new Plugins.UnityPlugin())
            add_plugin(new Plugins.PurplePlugin())
            add_plugin(new Plugins.LastFmPlugin())
            //add_plugin(new Plugins.MusicIndicatorPlugin())
            
        prop readonly configuration: Configuration
        prop readonly dir: File
        prop readonly api: Client.API = new API()
        prop readonly window: MainWindow
        prop readonly application: Application
        prop readonly started: bool

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
            _started = true
        
            if _configuration.server_autostart
                start_server()
                
            for var plugin in _plugins
                plugin.start()
                
            _api.start_watch_thread()
            
            connect_to_first_local_service()
            
            Gtk.main()
        
        def stop()
            _api.stop_watch_thread(true)
            
            for var plugin in _plugins
                plugin.stop()
                
            if _configuration.server_autostop
                stop_server()

            Gtk.main_quit()

            _started = false
            
        def show()
            _window.present()

        def start_server()
            try
                pid: Pid
                Process.spawn_async(_dir.get_path(), {"khovsgold", "--start"}, null, SpawnFlags.STDOUT_TO_DEV_NULL|SpawnFlags.STDERR_TO_DEV_NULL, null, out pid)
                _logger.messagef("Starting khovsgold, daemonizer pid: %d", pid)
            except e: SpawnError
                _logger.exception(e)

        def stop_server()
            try
                pid: Pid
                Process.spawn_async(_dir.get_path(), {"khovsgold", "--stop"}, null, SpawnFlags.STDOUT_TO_DEV_NULL|SpawnFlags.STDERR_TO_DEV_NULL, null, out pid)
                _logger.messagef("Stopping khovsgold, daemonizer pid: %d", pid)
            except e: SpawnError
                _logger.exception(e)
        
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
        _browser: Browser?
        
        def private connect_to_first_local_service()
            _browser = new Browser("_khovsgol._tcp")
            _browser.found.connect(on_avahi_found)
            _browser.start()
        
        def private on_avahi_found(info: ServiceFoundInfo)
            // Connect to first local service found
            if (info.flags & Avahi.LookupResultFlags.LOCAL) != 0
                _api.connect(info.hostname, info.port)
                _browser = null
        
    _logger: Logging.Logger
        
    def private static initialize_logging() raises GLib.Error
        _logger = Logging.get_logger("khovsgol.client")
        
        var appender = new Logging.FileAppender()
        appender.deepest_level = LogLevelFlags.LEVEL_MESSAGE
        appender.set_path("%s/.khovsgol/log/client.log".printf(Environment.get_home_dir()))
        Logging.get_logger().appender = appender
