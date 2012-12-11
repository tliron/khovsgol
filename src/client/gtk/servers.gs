[indent=4]

uses
    Gtk
    AvahiUtil

namespace Khovsgol.Client.GTK

    class Servers: Window
        construct(instance: Instance)
            _instance = instance
            
            // Tree view
            
            _store = new ListStore(3, typeof(string), typeof(string), typeof(string)) // id, url, markup

            var column = new TreeViewColumn()
            var renderer = new CellRendererText()
            column.pack_start(renderer, true)
            column.add_attribute(renderer, "markup", 2)
            
            var tree_view = new TreeView.with_model(_store)
            tree_view.headers_visible = false
            tree_view.append_column(column)
            tree_view.button_press_event.connect(on_button_pressed)
            tree_view.expand_all()
            var tree_scrolled = new ScrolledWindow(null, null)
            tree_scrolled.add(tree_view)
            var tree_frame = new Frame(null)
            tree_frame.add(tree_scrolled)

            // Right box
            
            _connect_button = new Button.with_mnemonic("_Connect")
            _connect_button.image = new Image.from_stock(Stock.NETWORK, IconSize.BUTTON)
            _connect_button.sensitive = false
            _connect_button.clicked.connect(on_connect)

            var connect_other_button = new Button.with_mnemonic("Connect _other")
            connect_other_button.image = new Image.from_stock(Stock.NETWORK, IconSize.BUTTON)
            connect_other_button.clicked.connect(on_connect_other)

            _start_button = new Button.with_mnemonic("_Start my server")
            _start_button.image = new Image.from_stock(Stock.EXECUTE, IconSize.BUTTON)
            _start_button.sensitive = false
            _start_button.clicked.connect(on_start)

            _stop_button = new Button.with_mnemonic("S_top my server")
            _stop_button.image = new Image.from_stock(Stock.STOP, IconSize.BUTTON)
            _stop_button.sensitive = false
            _stop_button.clicked.connect(on_stop)

            var button_box = new ButtonBox(Orientation.VERTICAL)
            button_box.set_layout(ButtonBoxStyle.START)
            button_box.spacing = 10
            button_box.add(_connect_button)
            button_box.add(connect_other_button)
            button_box.add(_start_button)
            button_box.add(_stop_button)
            button_box.set_child_secondary(_start_button, true)
            button_box.set_child_secondary(_stop_button, true)
        
            // Assemble
            
            var bottom_box = new Box(Orientation.HORIZONTAL, 10)
            bottom_box.pack_start(tree_frame)
            bottom_box.pack_start(button_box, false)
            
            var main_box = new Box(Orientation.VERTICAL, 15)
            main_box.pack_start(bottom_box)
            add(main_box)

            title = "Server Manager"
            border_width = 10
            set_position(WindowPosition.CENTER)
            set_default_size(500, 400)
            
            _browser = new Browser("_khovsgol._tcp")
            _browser.found.connect(on_avahi_found)
            _browser.removed.connect(on_avahi_removed)
            _browser.start()
            
            key_press_event.connect(on_key_pressed)
        
        def private on_connect()
            pass

        def private on_connect_other()
            pass
            
        def private on_start()
            pass

        def private on_stop()
            pass
            
        def private on_button_pressed(e: Gdk.EventButton): bool
            return false
            
        def private on_key_pressed(e: Gdk.EventKey): bool
            var keyval = e.keyval
            if keyval == Gdk.Key.Escape
                destroy()
                return true
            else
                return false
            
        def private on_avahi_found(info: ServiceFoundInfo)
            // Only show IPv4
            if info.protocol == Avahi.Protocol.INET
                var base_url = "http://%s:%u".printf(info.hostname, info.port)
                var markup = "%s:%u".printf(Markup.escape_text(info.hostname), info.port)
            
                iter: TreeIter
                _store.append(out iter)
                _store.@set(iter, 0, info.to_id(), 1, base_url, 2, markup, -1)
        
        def private on_avahi_removed(info: ServiceInfo)
            var id = info.to_id()
            iter: TreeIter
            value: Value
            if _store.get_iter_first(out iter)
                while true
                    _store.get_value(iter, 0, out value)
                    if id == (string) value
                        _store.remove(iter)
                        break
                    if !_store.iter_next(ref iter)
                        break

        _instance: Instance
        _store: ListStore
        _connect_button: Button
        _start_button: Button
        _stop_button: Button
        _browser: Browser

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.servers")
