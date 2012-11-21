[indent=4]

uses
    Gtk
    Khovsgol

namespace Khovsgol.GUI

    class MainWindow: Window
        construct(instance: Instance)
            _instance = instance
            
            delete_event.connect(on_delete)
            
            var control_bar = new ControlBar(_instance)
            var play_list = new PlayList(_instance)
            var library = new Library(_instance)

            _panes = new Paned(Orientation.HORIZONTAL)
            _panes.pack1(play_list, true, true)
            _panes.pack2(library, true, true)
            _panes.realize.connect(on_realize_panes)

            var main_box = new Box(Orientation.VERTICAL, 10)
            main_box.pack_start(control_bar, false)
            main_box.pack_start(_panes)
            
            title = "Khövsgöl"
            deletable = false
            border_width = 10
            
            set_position(WindowPosition.CENTER)

            add(main_box)
            add_accel_group(control_bar.accel_group)
            add_accel_group(play_list.accel_group)
            add_accel_group(library.accel_group)
            /*if self.instance.configuration.is_boolean('ui', 'focus-on-library'):
                self.library_pane.tree_view.grab_focus()
            else:
                self.play_list_pane.tree_view.grab_focus()*/

            show_all()
            
            configure_event.connect(on_configured)
            _panes.notify.connect(on_split)
              
        def private on_delete(event: Gdk.EventAny): bool
            iconify()
            return true // bypass default delete handler
        
        def private on_configured(event: Gdk.EventConfigure): bool
            x: int
            y: int
            w: int
            h: int
            get_position(out x, out y)
            get_size(out w, out h)
            print "%d %d %d %d", x, y, w, h
            return false
        
        def private on_realize_panes()
            //panes.connect('realize', lambda widget: widget.set_position(self.instance.configuration.get_window_split() or widget.get_allocation().width / 2)) # Default to equal sized panes
            _panes.position = _panes.get_allocated_width() / 2

        def private on_split(param_spec: ParamSpec)
            print "split"
            pass

        _instance: Instance
        _panes: Paned
