[indent=4]

uses
    Gtk
    AvahiUtil
    JsonUtil

namespace Khovsgol.Client.GTK

    class Connect: Window
        construct(instance: Instance)
            _instance = instance
            
            // Tree view
            
            _store = new TreeStore(3, typeof(Object), typeof(Gdk.Pixbuf), typeof(string)) // node, icon, markup

            var column = new TreeViewColumn()
            var icon_renderer = new CellRendererPixbuf()
            var markup_renderer = new CellRendererText()
            column.pack_start(icon_renderer, false)
            column.pack_start(markup_renderer, true)
            column.add_attribute(icon_renderer, "pixbuf", Column.ICON)
            column.add_attribute(markup_renderer, "markup", Column.MARKUP)
            
            _tree_view = new TreeView.with_model(_store)
            _tree_view.headers_visible = false
            _tree_view.append_column(column)
            _tree_view.button_press_event.connect(on_button_pressed)
            _tree_view.get_selection().changed.connect(on_selection_changed)
            var tree_scrolled = new ScrolledWindow(null, null)
            tree_scrolled.add(_tree_view)
            var tree_frame = new Frame(null)
            tree_frame.add(tree_scrolled)

            // Button box
            
            // Note: Newer GNOME desktops tend to disable image visibility by default,
            // but we will explicitly show the images because we think it's easier to
            // understand at a glance!
            
            _connect_button = new Button.with_mnemonic("_Connect")
            _connect_button.image = new Image.from_stock(Stock.NETWORK, IconSize.MENU)
            _connect_button.image.show()
            _connect_button.sensitive = false
            _connect_button.clicked.connect(on_connect)

            var connect_other_button = new Button.with_mnemonic("Connect _other")
            connect_other_button.image = new Image.from_stock(Stock.NETWORK, IconSize.MENU)
            connect_other_button.image.show()
            connect_other_button.clicked.connect(on_connect_other)

            _start_button = new Button.with_mnemonic("_Start my server")
            _start_button.image = new Image.from_stock(Stock.EXECUTE, IconSize.MENU)
            _start_button.image.show()
            _start_button.sensitive = true
            _start_button.clicked.connect(on_start)

            _stop_button = new Button.with_mnemonic("S_top my server")
            _stop_button.image = new Image.from_stock(Stock.STOP, IconSize.MENU)
            _stop_button.image.show()
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
            
            // Icons
            
            _server_icon = render_icon(Stock.NETWORK, IconSize.MENU, null)
            _playing_icon = render_icon(Stock.MEDIA_PLAY, IconSize.MENU, null)
            _paused_icon = render_icon(Stock.MEDIA_PAUSE, IconSize.MENU, null)
            _stopped_icon = render_icon(Stock.MEDIA_STOP, IconSize.MENU, null)
            _plug_icon = render_icon(Stock.CONNECT, IconSize.MENU, null)
        
            // Assemble
            
            var bottom_box = new Box(Orientation.HORIZONTAL, 10)
            bottom_box.pack_start(tree_frame)
            bottom_box.pack_start(button_box, false)
            
            var main_box = new Box(Orientation.VERTICAL, 15)
            main_box.pack_start(bottom_box)
            add(main_box)

            title = "Connect"
            border_width = 10
            set_position(WindowPosition.CENTER)
            set_default_size(500, 400)
            
            _browser = new Browser("_khovsgol._tcp")
            _browser.found.connect(on_avahi_found)
            _browser.removed.connect(on_avahi_removed)
            _browser.start()
            
            key_press_event.connect(on_key_pressed)
        
        def private on_connect()
            var selection = _tree_view.get_selection()
            var tree_paths = selection.get_selected_rows(null)
            if tree_paths.length() > 0
                iter: TreeIter
                if _store.get_iter(out iter, tree_paths.data)
                    value: Value
                    _store.get_value(iter, Column.NODE, out value)
                    
                    server_node: ServerNode? = null
                    player: string? = null
                    
                    var obj = (Object) value
                    if obj isa ServerNode
                        server_node = (ServerNode) obj
                    else if obj isa PlayerNode
                        var player_node = (PlayerNode) obj
                        server_node = player_node.server_node
                        player = player_node.name
                    else if obj isa PlugNode
                        var plug_node = (PlugNode) obj
                        server_node = plug_node.player_node.server_node
                        player = plug_node.player_node.name
                        
                    if server_node is not null
                        if player is null
                            player = Environment.get_user_name()
                        _instance.api.connect(server_node.host, server_node.port)
                        _instance.player = player
                        destroy()

        def private on_connect_other()
            pass
            
        def private on_start()
            _instance.start_server()

        def private on_stop()
            _instance.stop_server()
            
        def private on_button_pressed(e: Gdk.EventButton): bool
            if e.type == Gdk.EventType.@2BUTTON_PRESS
                on_double_clicked()
            else if e.button == 3
                on_right_clicked()
            return false
            
        def private on_double_clicked()
            on_connect()

        def private on_right_clicked()
            pass
            
        def private on_key_pressed(e: Gdk.EventKey): bool
            var keyval = e.keyval
            if keyval == Gdk.Key.Escape
                destroy()
                return true
            else
                return false
                
        def private on_selection_changed()
            var selection = _tree_view.get_selection()
            var tree_paths = selection.get_selected_rows(null)
            _connect_button.sensitive = tree_paths.length() > 0
            
        // TODO: are we in the Gdk thread?!
        def private on_avahi_found(info: ServiceFoundInfo)
            // Only show IPv4
            if info.protocol == Avahi.Protocol.INET
                var node = new ServerNode(info)
            
                var markup = "%s:%u".printf(Markup.escape_text(node.host), node.port)
                
                // Is this the server we're currently connected to?
                host: string
                port: uint
                _instance.api.get_connection(out host, out port)
                var is_current = (host == node.host) and (port == node.port)
                
                if is_current
                    markup = "<b>%s</b>".printf(markup)
                    
                if node.is_local
                    _stop_button.sensitive = true
                    _start_button.sensitive = false
                    
                iter: TreeIter
                _store.append(out iter, null)
                _store.@set(iter, Column.NODE, node, Column.ICON, _server_icon, Column.MARKUP, markup, -1)
                
                fill_players(node, iter, is_current)
                
        def private fill_players(server_node: ServerNode, server_iter: TreeIter, is_current: bool)
            var api = new API()
            api.connect(server_node.host, server_node.port)
            for var player in api.get_players()
                var name = get_string_member_or_null(player, "name")
                if name is not null
                    //var play_list = get_object_member_or_null(player, "play_list")
                    var play_mode = get_string_member_or_null(player, "playMode")
                
                    if is_current
                        is_current = _instance.player == name
                            
                    iter: TreeIter
                    _store.append(out iter, server_iter)
                    var node = new PlayerNode(name, server_node, self, iter, is_current)
                    node.render(play_mode)
                    _store.@set(iter, Column.NODE, node)
            
            var path = _store.get_path(server_iter)
            if path is not null
                _tree_view.expand_row(path, true)
                
        def private on_avahi_removed(info: ServiceInfo)
            var id = info.to_id()
            iter: TreeIter
            value: Value
            if _store.get_iter_first(out iter)
                while true
                    _store.get_value(iter, Column.NODE, out value)
                    var node = (ServerNode) value
                    if node.id == id
                        _store.remove(ref iter)
                        if node.is_local
                            _stop_button.sensitive = false
                            _start_button.sensitive = true
                        break
                    if !_store.iter_next(ref iter)
                        break

        _instance: Instance
        _store: TreeStore
        _tree_view: TreeView
        _connect_button: Button
        _start_button: Button
        _stop_button: Button
        _server_icon: Gdk.Pixbuf
        _playing_icon: Gdk.Pixbuf
        _stopped_icon: Gdk.Pixbuf
        _paused_icon: Gdk.Pixbuf
        _plug_icon: Gdk.Pixbuf
        _browser: Browser

        enum private Column
            NODE = 0     // Object
            ICON = 1     // Pixbuf
            MARKUP = 2   // string

        class private ServerNode: Object
            construct(info: ServiceFoundInfo)
                id = info.to_id()
                host = info.hostname
                port = info.port
                is_local = (info.flags & Avahi.LookupResultFlags.LOCAL) != 0
        
            id: string
            host: string
            port: uint
            is_local: bool
        
        class private PlayerNode: Object
            construct(name: string, server_node: ServerNode, connect: Connect, iter: TreeIter, is_current: bool)
                self.name = name
                self.server_node = server_node
                _connect = connect
                _iter = iter
                _is_current = is_current
                
                _api.connect(server_node.host, server_node.port)
                _api.watching_player = name
                _api.play_mode_change_gdk.connect(on_play_mode_changed)
                _api.start_watch_thread()
    
            final
                _api.play_mode_change_gdk.disconnect(on_play_mode_changed)
                _api.stop_watch_thread()
            
            name: string
            server_node: ServerNode
            
            def render(play_mode: string?)
                var markup = Markup.escape_text(name)
                
                if _is_current
                    markup = "<b>%s</b>".printf(markup)
                
                icon: Gdk.Pixbuf = _connect._stopped_icon
                if play_mode is not null
                    markup += " (%s)".printf(Markup.escape_text(play_mode))
                    if play_mode == "playing"
                        icon = _connect._playing_icon
                    else if play_mode == "paused"
                        icon = _connect._paused_icon
                        
                _connect._store.@set(_iter, Column.ICON, icon, Column.MARKUP, markup, -1)
            
            _api: API = new API()
            _connect: Connect
            _iter: TreeIter
            _is_current: bool
            
            def private on_play_mode_changed(play_mode: string?, old_play_mode: string?)
                render(play_mode)

        class private PlugNode: Object
            construct(name: string, player_node: PlayerNode)
                self.name = name
                self.player_node = player_node
            
            name: string
            player_node: PlayerNode

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.servers")
