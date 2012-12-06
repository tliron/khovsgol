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
            tree_view.expand_all()
            var tree_scrolled = new ScrolledWindow(null, null)
            tree_scrolled.add(tree_view)
            var tree_frame = new Frame(null)
            tree_frame.add(tree_scrolled)
            
            // Assemble
            
            var bottom_box = new Box(Orientation.HORIZONTAL, 10)
            bottom_box.pack_start(tree_frame, true, true)
            
            var main_box = new Box(Orientation.VERTICAL, 15)
            main_box.pack_start(bottom_box, true, true)
            add(main_box)

            title = "Server Manager"
            border_width = 10
            set_position(WindowPosition.CENTER)
            set_default_size(500, 400)
            
            try
                _browser = new Browser("_khovsgol._tcp")
                _browser.found.connect(on_avahi_found)
                _browser.removed.connect(on_avahi_removed)
            except e: Avahi.Error
                _logger.exception(e)
            
        def private on_avahi_found(info: ServiceFoundInfo)
            // Only show IPv4
            if info.protocol == Avahi.Protocol.INET
                var base_url = "http://%s:%u".printf(info.hostname, info.port)
                var markup = "%s (port %u)".printf(Markup.escape_text(info.hostname), info.port)
            
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
        _browser: Browser

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.servers")
