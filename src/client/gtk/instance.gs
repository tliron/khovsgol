[indent=4]

uses
    DBusUtil
    AvahiUtil
    Gtk

namespace Khovsgol.Client.GTK

    class Instance: Object implements Client.Instance
        construct(application: Application, arguments: Arguments) raises GLib.Error
            _application = application
            _arguments = arguments
            _configuration = new Configuration()
            _server_configuration = new Server.Configuration()
            _receiver_configuration = new Receiver.Configuration()
            
            initialize_logging(_arguments.console)

            GtkUtil.initialize()
            
            _dir = _arguments.file.get_parent()
            
            add_feature(new Features.ServerFeature())
            add_feature(new Features.ReceiverFeature())
            add_feature(new Features.NotificationsFeature())
            add_feature(new Features.MediaPlayerKeysFeature())
            add_feature(new Features.Mpris2Feature())
            add_feature(new Features.MusicIndicatorFeature())
            add_feature(new Features.UnityFeature())
            add_feature(new Features.PurpleFeature())
            add_feature(new Features.ScrobblingFeature())
            add_feature(new Features.VisualizationFeature())

            _window = new MainWindow(self)
            
        prop readonly configuration: Configuration
        prop readonly server_configuration: Server.Configuration
        prop readonly receiver_configuration: Receiver.Configuration
        prop readonly dir: File
        prop readonly api: Client.API = new API()
        prop readonly window: MainWindow
        prop readonly application: Application

        prop libraries: list of string
            get
                if _libraries is null
                    _libraries = _configuration.connection_libraries
                return _libraries
            set
                _configuration.connection_libraries = _libraries = value
                _configuration.save()

        def new @connect(host: string, port: uint, is_local: bool, player: string? = null, plug: string? = null): bool
            if player is null
                player = Environment.get_user_name()

            _api.@connect(host, port, player)
            if _api.get_player() is not null
                if (host != _configuration.connection_host) or (port != _configuration.connection_port) or (is_local != _configuration.connection_is_local) or (player != _configuration.connection_player)
                    _configuration.connection_host = host
                    _configuration.connection_port = port
                    _configuration.connection_is_local = is_local
                    _configuration.connection_player = player
                    _configuration.save()
                return true
            else
                _api.@disconnect()
                return false
        
        def add_feature(feature: Feature)
            feature.instance = self
            _features[feature.name] = feature
            
        def get_feature(name: string): Feature?
            return _features[name]
        
        def get_features(): Gee.Iterable of Feature
            return _features.values
    
        def start()
            if _started
                show()
                return
        
            _started = true
        
            _window.show_all()

            for var feature in _features.values
                if feature.persistent
                    if _configuration.is_feature_active(feature.name)
                        feature.start()
                else if _configuration.is_feature_boolean(feature.name, "autostart")
                    feature.start()
                    
            Gdk.threads_add_idle(connect_first_time)

            _api.start_watch_thread()
            
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
            
            _application.quit()
            
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

        def validate_plugs(plugs: Plugs?)
            if plugs is null
                if _configuration.connection_is_local
                    _api.set_plug("pulse", null, true)
                else
                    host: string
                    port: uint
                    _api.get_connection(out host, out port)
                    var dialog = new MessageDialog.with_markup(_window, DialogFlags.DESTROY_WITH_PARENT, MessageType.QUESTION, ButtonsType.YES_NO, "You're playing music from \"%s\", a computer in your network. Do you want the sound to come out <i>here</i>?\n\n(Answering no will make the sound come out at \"%s\")", host, host)
                    dialog.title = "Playing music from %s:%u".printf(host, port)
                    dialog.set_default_response(Gtk.ResponseType.YES)
                    var response = dialog.run()
                    dialog.destroy()
                    if response == ResponseType.YES
                        // Make sure receiver is running
                        var feature = get_feature("receiver")
                        if feature is not null
                            feature.start()
                            _api.set_plug("rtpL16:udp:%u".printf(_receiver_configuration.port), null, true)
                        else
                            // TODO: error! no receiver!
                            pass
                    else
                        _api.set_plug("pulse", null, true)

        _arguments: Arguments
        _features: dict of string, Feature = new dict of string, Feature
        _browser: Browser?
        _started: bool
        _libraries: list of string
        
        def private connect_first_time(): bool
            var host = _configuration.connection_host
            if host is not null
                if not @connect(host, _configuration.connection_port, _configuration.connection_is_local, _configuration.connection_player)
                    connect_to_first_local_service()
            else
                connect_to_first_local_service()
            return false
        
        def private connect_to_first_local_service()
            _browser = new Browser("_khovsgol._tcp")
            _browser.found.connect(on_avahi_found)
            _browser.client.start()
        
        def private on_avahi_found(info: ServiceFoundInfo)
            // Connect to first local service found
            if (info.flags & Avahi.LookupResultFlags.LOCAL) != 0
                @connect(info.hostname, info.port, true)
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
