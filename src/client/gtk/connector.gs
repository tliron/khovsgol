[indent=4]

uses
    Gtk
    AvahiUtil
    JsonUtil

namespace Khovsgol.Client.GTK

    class Connector: Window
        construct(instance: Instance)
            _instance = instance

            unrealize.connect(on_unrealized)
            
            // Tree view
            
            _store = new TreeStore(3, typeof(Object), typeof(Gdk.Pixbuf), typeof(string)) // node, icon, markup

            var column = new TreeViewColumn()
            var icon_renderer = new CellRendererPixbuf()
            var markup_renderer = new CellRendererText()
            markup_renderer.ellipsize = Pango.EllipsizeMode.END // This also mysteriously enables right alignment for RTL text
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
            _connect_button.image = new Image.from_icon_name("gtk-connect", IconSize.MENU)
            _connect_button.image.show()
            _connect_button.sensitive = false
            _connect_button.clicked.connect(on_connect)

            var connect_other_button = new Button.with_mnemonic("Connect _other")
            connect_other_button.image = new Image.from_icon_name("gtk-connect", IconSize.MENU)
            connect_other_button.image.show()
            connect_other_button.clicked.connect(on_connect_other)

            _server = _instance.get_feature("server")
            if _server is not null
                _start_button = new Button.with_mnemonic("_Start my server")
                _start_button.image = new Image.from_icon_name("gtk-execute", IconSize.MENU)
                _start_button.image.show()
                _start_button.clicked.connect(on_start)

                _stop_button = new Button.with_mnemonic("S_top my server")
                _stop_button.image = new Image.from_icon_name("gtk-stop", IconSize.MENU)
                _stop_button.image.show()
                _stop_button.clicked.connect(on_stop)

                on_server_state_changed(_server.state)
                _server.state_change.connect(on_server_state_changed)

            var button_box = new ButtonBox(Orientation.VERTICAL)
            button_box.set_layout(ButtonBoxStyle.START)
            button_box.spacing = 10
            button_box.add(_connect_button)
            button_box.add(connect_other_button)
            if _server is not null
                button_box.add(_start_button)
                button_box.add(_stop_button)
                button_box.set_child_secondary(_start_button, true)
                button_box.set_child_secondary(_stop_button, true)
            
            // Icons
            
            _server_icon = render_icon("gtk-network", IconSize.MENU, null)
            _playing_icon = render_icon("gtk-media-play", IconSize.MENU, null)
            _paused_icon = render_icon("gtk-media-pause", IconSize.MENU, null)
            _stopped_icon = render_icon("gtk-media-stop", IconSize.MENU, null)
            _plug_icon = render_icon("gtk-connect", IconSize.MENU, null)
        
            // Assemble
            
            var bottom_box = new Box(Orientation.HORIZONTAL, 10)
            bottom_box.pack_start(tree_frame)
            bottom_box.pack_start(button_box, false)

            var label = new Label("This is a map of the Khövsgöl servers visible in your local network.\n\nThe server and player which you\'re currently controlling is marked in bold. Double-click or click \"Connect\" on any other server to control it instead. Use \"Connect other\" for hidden servers, or for servers outside your local network.\n\nEach server may have one or more players, and each player may have one or more plugs. You may connect to an already existing player. Otherwise, if you connect to the server itself, a player will be created for you.")
            label.wrap = true
            label.set_alignment(0, 0)
            
            var main_box = new Box(Orientation.VERTICAL, 15)
            main_box.pack_start(label, false)
            main_box.pack_start(bottom_box)
            add(main_box)

            title = "Your Khövsgöl Network"
            border_width = 10
            set_position(WindowPosition.CENTER_ON_PARENT)
            set_default_size(500, 400)
            transient_for = _instance.window
            destroy_with_parent = true
            
            _browser = new Browser("_khovsgol._tcp")
            _browser.found.connect(on_avahi_found)
            _browser.removed.connect(on_avahi_removed)
            _browser.client.start()
            
            key_press_event.connect(on_key_pressed)
            
            var api = (API) _instance.api
            api.connection_change_gdk.connect(on_connection_changed)
        
        def private on_unrealized()
            var api = (API) _instance.api
            api.connection_change_gdk.disconnect(on_connection_changed)
            
            // We need to manually clear the store, because the nodes have references to the window,
            // so that neither would be automatically unreferenced
            _store.clear()
        
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
                        /*if not server_node.is_local
                            var dialog = new MessageDialog.with_markup(self, DialogFlags.DESTROY_WITH_PARENT, MessageType.QUESTION, ButtonsType.YES_NO, "You're connecting to \"%s\", a computer in your network. Do you want the sound to come out <i>here</i>?\n\n(Answering no will make the sound come out at \"%s\")", server_node.host, server_node.host)
                            dialog.title = "Connecting to %s:%u".printf(server_node.host, server_node.port)
                            dialog.set_default_response(Gtk.ResponseType.YES)
                            var response = dialog.run()
                            dialog.destroy()
                            if response == ResponseType.YES
                                // Make sure receiver is running
                                var feature = _instance.get_feature("receiver")
                                if feature is not null
                                    feature.start()
                                    _instance.@connect(server_node.host, server_node.port, player, "rtpL16:udp:%u".printf(_instance.receiver_configuration.port))
                                else
                                    // TODO: error! no receiver!
                                    pass*/
                        _instance.@connect(server_node.host, server_node.port, server_node.is_local, player)
                        
                        destroy()

        def private on_connect_other()
            var dialog = new ConnectOther(_instance.window)
            if dialog.@do()
                var host = dialog.host
                if (host is not null) and (host.length > 0)
                    var port = dialog.port
                    _instance.@connect(host, port, false)
                destroy()
            
        def private on_start()
            var feature = _instance.get_feature("server")
            if feature is not null
                feature.start()

        def private on_stop()
            var feature = _instance.get_feature("server")
            if feature is not null
                feature.stop()
            
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
            
        def private on_connection_changed(host: string?, port: uint, player: string?, old_host: string?, old_port: uint, old_player: string?)
            _store.clear()
            _browser.reset()
            
        def private on_server_state_changed(state: FeatureState)
            _stop_button.sensitive = state == FeatureState.STARTED
            _start_button.sensitive = state == FeatureState.STOPPED
            
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
                    
                iter: TreeIter
                _store.append(out iter, null)
                _store.@set(iter, Column.NODE, node, Column.ICON, _server_icon, Column.MARKUP, markup, -1)
                
                fill_players(node, iter, is_current)
                
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
                        break
                    if not _store.iter_next(ref iter)
                        break

        def private fill_players(server_node: ServerNode, server_iter: TreeIter, is_current: bool)
            var api = new API()
            api.@connect(server_node.host, server_node.port, null)
            for var player in api.get_players()
                var name = get_string_member_or_null(player, "name")
                if name is not null
                    var play_mode = get_string_member_or_null(player, "playMode")
                
                    if is_current
                        is_current = _instance.api.watching_player == name
                            
                    player_iter: TreeIter
                    _store.append(out player_iter, server_iter)
                    var player_node = new PlayerNode(name, server_node, self, player_iter, is_current)
                    _store.@set(player_iter, Column.NODE, player_node)
                    player_node.render(play_mode)
                    
                    plug_iter: TreeIter
                    for var plug in new JsonObjects(get_array_member_or_null(player, "plugs"))
                        var spec = get_string_member_or_null(plug, "spec")
                        if spec is not null
                            var plug_node = new PlugNode(spec, player_node)
                            var markup = "<i>%s</i>".printf(Markup.escape_text(spec))
                            _store.append(out plug_iter, player_iter)
                            _store.@set(plug_iter, Column.NODE, plug_node, Column.ICON, _plug_icon, Column.MARKUP, markup)
            
            var path = _store.get_path(server_iter)
            if path is not null
                _tree_view.expand_row(path, true)
                
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
        _server: Feature?

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
            construct(name: string, server_node: ServerNode, connector: Connector, iter: TreeIter, is_current: bool)
                self.name = name
                self.server_node = server_node
                _connector = connector
                _iter = iter
                _is_current = is_current
                
                _api.@connect(server_node.host, server_node.port, name)
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
                
                icon: Gdk.Pixbuf = _connector._stopped_icon
                if play_mode is not null
                    markup += " [%s]".printf(Markup.escape_text(play_mode))
                    if play_mode == "playing"
                        icon = _connector._playing_icon
                    else if play_mode == "paused"
                        icon = _connector._paused_icon
                        
                _connector._store.@set(_iter, Column.ICON, icon, Column.MARKUP, markup, -1)
            
            _api: API = new API()
            _connector: Connector
            _iter: TreeIter
            _is_current: bool
            
            def private on_play_mode_changed(play_mode: string?, old_play_mode: string?)
                render(play_mode)

        class private PlugNode: Object
            construct(spec: string, player_node: PlayerNode)
                self.spec = spec
                self.player_node = player_node
            
            spec: string
            player_node: PlayerNode

        class private ConnectOther: Dialog
            construct(parent: Window)
                title = "Connect to Server"
                transient_for = parent
                destroy_with_parent = true
                modal = true
                
                _host_box = new EntryBox("_Hostname or IP address:")
                _host_box.entry.activate.connect(on_activate)
                _port_box = new EntryBox("_Port:")
                _port_box.entry.text = "8185"
                _port_box.entry.activate.connect(on_activate)
                var box = new Box(Orientation.VERTICAL, 10)
                box.pack_start(_host_box)
                box.pack_start(_port_box)
                var alignment = new Alignment(0, 0, 1, 0)
                alignment.set_padding(20, 20, 20, 20)
                alignment.add(box)
                get_content_area().pack_start(alignment)
                set_default_size(400, -1)
                
                add_button("gtk-cancel", ResponseType.CANCEL)
                add_button("gtk-ok", ResponseType.OK)
                set_default_response(ResponseType.OK)
                
            prop readonly host: string
            prop readonly port: uint

            def @do(): bool
                show_all()
                var response = run()
                if response == ResponseType.OK
                    _host = _host_box.entry.text.strip()
                    _port = int.parse(_port_box.entry.text.strip())
                destroy()
                return response == ResponseType.OK
            
            def private on_activate()
                response(ResponseType.OK)

            _host_box: EntryBox
            _port_box: EntryBox

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.connector")
