[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class MainWindow: ApplicationWindow
        construct(instance: Instance)
            _instance = instance
            
            // Try to use icon directly from file
            var icon_file = _instance.get_resource("khovsgol.svg")
            if icon_file is not null
                try
                    if !set_icon_from_file(icon_file.get_path())
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
            
            _control_bar = new ControlBar(_instance)
            _play_list = new PlayList(_instance)
            _library = new Library(_instance)

            add_accel_group(_control_bar.accel_group)
            add_accel_group(_play_list.accel_group)
            add_accel_group(_library.accel_group)
            
            // Assemble

            _panes = new Paned(Orientation.HORIZONTAL)
            _panes.pack1(_play_list, true, true)
            _panes.pack2(_library, true, true)
            _panes.realize.connect(on_realize_panes)

            var main_box = new Box(Orientation.VERTICAL, 10)
            main_box.pack_start(_control_bar, false)
            main_box.pack_start(_panes)

            add(main_box)
            
            startup_id = "khovsgol"
            title = "Khövsgöl"
            deletable = false
            border_width = 10
            
            var x = _instance.configuration.x
            var y = _instance.configuration.y
            if (x != int.MIN) && (y != int.MIN)
                move(x, y)
            else
                set_position(WindowPosition.CENTER)

            var width = _instance.configuration.width
            var height = _instance.configuration.height
            if (width != int.MIN) && (height != int.MIN)
                set_default_size(width, height)
            else
                set_default_size(900, 600)

            /*if self.instance.configuration.is_boolean('ui', 'focus-on-library'):
                self.library_pane.tree_view.grab_focus()
            else:
                self.play_list_pane.tree_view.grab_focus()*/

            show_all()
            
            configure_event.connect(on_configured)
            _panes.notify.connect(on_split)
            
        prop readonly control_bar: ControlBar
        prop readonly play_list: PlayList
        prop readonly library: Library
              
        def private on_realized()
            _instance.api.reset_watch()
            API.in_gdk = true
            _instance.api.update()
            API.in_gdk = false
                
        def private on_delete(event: Gdk.EventAny): bool
            iconify()
            return true // bypass default delete handler
        
        def private on_configured(event: Gdk.EventConfigure): bool
            x: int
            y: int
            width: int
            height: int
            get_position(out x, out y)
            get_size(out width, out height)
            if (x != _instance.configuration.x) || (y != _instance.configuration.y) || (width != _instance.configuration.width) || (height != _instance.configuration.height)
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
