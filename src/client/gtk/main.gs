[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class MainWindow: ApplicationWindow
        construct(instance: Instance)
            Object(application: instance.application)
        
            _instance = instance
            
            // Try to use icon directly from file
            var icon_file = _instance.get_resource("khovsgol.svg")
            if icon_file is not null
                try
                    if not set_icon_from_file(icon_file.get_path())
                        _logger.warningf("Could not set icon: %s", icon_file.get_path())
                        icon_name = "khovsgol"
                except e: GLib.Error
                    _logger.exception(e)
                    icon_name = "khovsgol"
            else
                // Use system icon
                icon_name = "khovsgol"
            
            realize.connect(on_realized)
            delete_event.connect(on_delete)
            show.connect(on_show)
            
            _control_bar = new ControlBar(_instance)
            _playlist = new Playlist(_instance)
            _library = new Library(_instance)

            add_accel_group(_control_bar.accel_group)
            add_accel_group(_playlist.accel_group)
            add_accel_group(_library.accel_group)
            
            // CSS

            var css_provider = new CssProvider()
            try
                // Note: all other ways we tried for adding padding to the toolbar would not use the right background color
                css_provider.load_from_data(".toolbar { padding: 10px 10px 10px 10px; }", -1)
                StyleContext.add_provider_for_screen(Gdk.Screen.get_default(), css_provider, STYLE_PROVIDER_PRIORITY_APPLICATION)
            except e: GLib.Error
                _logger.exception(e)
            
            // Assemble

            _panes = new Paned(Orientation.HORIZONTAL)
            _panes.border_width = 10
            _panes.pack1(_playlist, true, true)
            _panes.pack2(_library, true, true)
            _panes.realize.connect(on_realize_panes)
            
            var main_box = new Box(Orientation.VERTICAL, 0)
            main_box.pack_start(_control_bar, false)
            main_box.pack_start(_panes)
            add(main_box)
            
            startup_id = "khovsgol"
            title = "Khövsgöl"
            deletable = false

            var x = _instance.configuration.x
            var y = _instance.configuration.y
            if (x != int.MIN) and (y != int.MIN)
                move(x, y)
            else
                set_position(WindowPosition.CENTER)

            var width = _instance.configuration.width
            var height = _instance.configuration.height
            if (width != int.MIN) and (height != int.MIN)
                set_default_size(width, height)
            else
                set_default_size(900, 600)
                
            if _instance.configuration.focus_on_library
                _library.initial_focus()
            else
                _playlist.initial_focus()

            show_all()
            
            configure_event.connect(on_configured)
            _panes.notify.connect(on_split)
            
        prop readonly control_bar: ControlBar
        prop readonly playlist: Playlist
        prop readonly library: Library
              
        def private on_realized()
            _instance.api.reset_watch()
            API.in_gdk = true
            _instance.api.update()
            API.in_gdk = false
                
        def private on_delete(e: Gdk.EventAny): bool
            iconify()
            return true // bypass default delete handler
        
        def private on_show()
            show.disconnect(on_show)
            
            // We are setting the position *after* we're shown, because the window manager
            // will set the initial position as it pleases...
            var x = _instance.configuration.x
            var y = _instance.configuration.y
            if (x != int.MIN) and (y != int.MIN)
                move(x, y)
            else
                set_position(WindowPosition.CENTER)
        
        def private on_configured(e: Gdk.EventConfigure): bool
            x: int
            y: int
            width: int
            height: int
            get_position(out x, out y)
            get_size(out width, out height)
            if (x != _instance.configuration.x) or (y != _instance.configuration.y) or (width != _instance.configuration.width) or (height != _instance.configuration.height)
                _instance.configuration.x = x
                _instance.configuration.y = y
                _instance.configuration.width = width
                _instance.configuration.height = height
                _instance.configuration.save()
            return false
        
        def private on_realize_panes()
            var split = _instance.configuration.split
            if split != int.MIN
                _panes.position = split
            else
                _panes.position = _panes.get_allocated_width() / 2

        def private on_split(param_spec: ParamSpec)
            var position = _panes.position
            if position != _instance.configuration.split
                _instance.configuration.split = position
                _instance.configuration.save()

        _instance: Instance
        _panes: Paned

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.main")
