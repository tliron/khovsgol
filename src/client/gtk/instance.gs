[indent=4]

uses
    DBusUtil
    AvahiUtil

namespace Khovsgol.Client.GTK

    class Instance: Object implements Client.Instance
        construct(application: Application, args: array of string) raises GLib.Error
            _arguments = new Arguments(args)
            _configuration = new Configuration()
            _server_configuration = new Server.Configuration()
            _receiver_configuration = new Receiver.Configuration()
            
            initialize_logging(_arguments.console)
            
            player = Environment.get_user_name()

            _dir = File.new_for_path(args[0]).get_parent()
            _window = new MainWindow(self)
            
            add_feature(new Features.ServerFeature())
            add_feature(new Features.ReceiverFeature())
            add_feature(new Features.NotificationsFeature())
            add_feature(new Features.MediaPlayerKeysFeature())
            add_feature(new Features.Mpris2Feature())
            add_feature(new Features.MusicIndicatorFeature())
            add_feature(new Features.UnityFeature())
            add_feature(new Features.PurpleFeature())
            add_feature(new Features.ScrobblingFeature())
            
        prop readonly configuration: Configuration
        prop readonly server_configuration: Server.Configuration
        prop readonly receiver_configuration: Receiver.Configuration
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
        
        def add_feature(feature: Feature)
            feature.instance = self
            _features[feature.name] = feature
            
        def get_feature(name: string): Feature?
            return _features[name]
        
        def get_features(): Gee.Iterable of Feature
            return _features.values
    
        def start()
            _started = true
        
            for var feature in _features.values
                if feature.persistent
                    if _configuration.is_feature_active(feature.name)
                        feature.start()
                else if _configuration.is_feature_boolean(feature.name, "autostart")
                    feature.start()
                
            _api.start_watch_thread()
            
            connect_to_first_local_service()
            
            Gtk.main()
        
        def stop()
            _api.stop_watch_thread(true)
            
            for var feature in _features.values
                if feature.persistent
                    feature.stop()
                else if _configuration.is_feature_boolean(feature.name, "autostop")
                    feature.stop()

            Gtk.main_quit()

            _started = false
            
        def show()
            _window.present()

        def get_resource(name: string): File?
            var file = File.new_for_path("/usr/share/khovsgol").get_child(name)
            if file.query_exists()
                return file

            file = File.new_for_path("/usr/share/icons/gnome/scalable/apps").get_child(name)
            if file.query_exists()
                return file

            var base_dir = _dir.get_parent()
            if base_dir is not null
                file = base_dir.get_child("resources").get_child(name)
                if file.query_exists()
                    return file

            return null
        
        _arguments: Arguments
        _player: string
        _features: dict of string, Feature = new dict of string, Feature
        _browser: Browser?
        
        def private connect_to_first_local_service()
            _browser = new Browser("_khovsgol._tcp")
            _browser.found.connect(on_avahi_found)
            _browser.client.start()
        
        def private on_avahi_found(info: ServiceFoundInfo)
            // Connect to first local service found
            if (info.flags & Avahi.LookupResultFlags.LOCAL) != 0
                _api.connect(info.hostname, info.port)
                _api.set_plug(_player, "pulse", true)
                _browser = null
        
    _logger: Logging.Logger
        
    def private static initialize_logging(console: bool) raises GLib.Error
        _logger = Logging.get_logger("khovsgol.client")

        if not console
            var appender = new Logging.FileAppender()
            appender.deepest_level = LogLevelFlags.LEVEL_MESSAGE
            appender.set_path("%s/.khovsgol/log/client.log".printf(Environment.get_home_dir()))
            Logging.get_logger().appender = appender
        else
            var appender = new Logging.StreamAppender()
            Logging.get_logger().appender = appender
