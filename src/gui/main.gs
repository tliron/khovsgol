[indent=4]

uses
    Gtk
    Gdk
    Khovsgol

namespace Khovsgol.GUI

    class MainWindow: Gtk.Window
        construct()
            set_position(WindowPosition.CENTER)
            
            delete_event.connect(on_delete)
            
            //control_bar = ControlBar(self.instance)
            //play_list_pane = PlayListPane(self.instance)
            //library_pane = LibraryPane(self.instance)

            var panes = new Paned(Orientation.HORIZONTAL)
            //panes.pack1(play_list_pane)
            //panes.pack2(library_pane)
            //panes.connect('realize', lambda widget: widget.set_position(self.instance.configuration.get_window_split() or widget.get_allocation().width / 2)) # Default to equal sized panes

            var main_box = new Box(Orientation.VERTICAL, 10)
            //main_box.pack_start(self.control_bar, False, True, 0)
            main_box.pack_start(panes, true, true, 0)

            set_title("Khövsgöl")
            set_deletable(false)
            set_border_width(10)

            add(main_box)
            /*add_accel_group(self.control_bar.accel_group)
            add_accel_group(self.play_list_pane.accel_group)
            add_accel_group(self.library_pane.accel_group)
            if self.instance.configuration.is_boolean('ui', 'focus-on-library'):
                self.library_pane.tree_view.grab_focus()
            else:
                self.play_list_pane.tree_view.grab_focus()*/

            show_all()
            
            configure_event.connect(on_configured)
            panes.notify.connect(on_split)
              
        def private on_delete(e: EventAny): bool
            iconify()
            return true
        
        def private on_configured(e: EventConfigure): bool
            x: int
            y: int
            w: int
            h: int
            get_position(out x, out y)
            get_size(out w, out h)
            print "%d %d %d %d", x, y, w, h
            return true

        def private on_split(p: ParamSpec)
            print "split"
            pass

