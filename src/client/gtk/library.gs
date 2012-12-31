[indent=4]

uses
    Gtk
    JsonUtil

namespace Khovsgol.Client.GTK

    class Library: Alignment
        construct(instance: Instance)
            _instance = instance
            _accel_group = new AccelGroup()

            unrealize.connect(on_unrealized)
            
            // Popup menus
            
            _popup_none = create_popup_menu()
            _popup = create_popup_menu(true)
            _popup_playlist = create_popup_menu(true, true)
        
            // Top
            
            _filter_box = new EntryBox("_Filter:")
            var clear_filter_button = new ControlButton(Stock.CLEAR, Gdk.Key.T, "Reset library filter\n<Alt>T", _accel_group)
            clear_filter_button.clicked.connect(on_clear_filter)
            _filter_box.pack_start(clear_filter_button, false)
            _filter_box.entry.activate.connect(on_filter)

            var top_box = new Box(Orientation.HORIZONTAL, 5)
            top_box.pack_start(_filter_box)

            // Tree
            
            // node, search, title_markup, duration_markup, rtl
            _store = new TreeStore(5, typeof(Json.Node), typeof(string), typeof(string), typeof(string), typeof(bool))
            
            var renderer1 = new CellRendererText()
            renderer1.ellipsize = Pango.EllipsizeMode.END

            var renderer2 = new CellRendererText()
            renderer2.xalign = 1
            renderer2.alignment = Pango.Alignment.RIGHT
            
            var column = new TreeViewColumn()
            column.pack_start(renderer1, true)
            column.pack_start(renderer2, false)
            
            column.add_attribute(renderer1, "markup", Column.TITLE)
            
            column.set_cell_data_func(renderer1, on_title_render)
            column.set_cell_data_func(renderer2, on_duration_render)

            _tree_view = new ClickableDraggableTreeView()
            _tree_view.model = _store
            _tree_view.headers_visible = false
            _tree_view.get_selection().mode = SelectionMode.MULTIPLE
            _tree_view.set_row_separator_func(on_row_separator)
            _tree_view.append_column(column)
            _tree_view.search_column = 1
            _tree_view.enable_model_drag_source(Gdk.ModifierType.BUTTON1_MASK, DRAG_TARGETS, Gdk.DragAction.DEFAULT|Gdk.DragAction.COPY|Gdk.DragAction.LINK)
            _tree_view.enable_model_drag_dest(DROP_TARGETS, Gdk.DragAction.DEFAULT)
            _tree_view.button_press_event.connect(on_clicked)
            _tree_view.double_click.connect(on_double_clicked)
            _tree_view.right_click.connect(on_right_clicked)
            _tree_view.key_press_event.connect(on_key_pressed)
            _tree_view.test_expand_row.connect(on_expanded)
            _tree_view.drag_data_get.connect(on_dragged)
            _tree_view.drag_data_received.connect(on_dropped)
            var tree_scrolled = new ScrolledWindow(null,  null)
            tree_scrolled.add(_tree_view)
            var tree_frame = new Frame(null)
            tree_frame.add(tree_scrolled)
            
            // Bottom
            
            _style_box = new StyleComboBox()
            _style_box.append(new ArtistsAndTheirAlbums())
            _style_box.append(new ArtistsAndTheirTracks())
            _style_box.append(new YearsAndAlbums())
            _style_box.append(new AllAlbums())
            _style_box.append(new Playlists())
            var style = _instance.configuration.library_style
            if style is not null
                _style_box.active_style_name = style
            if _style_box.active_style_name is null
                _style_box.active_style_name = "artists_albums"
            _style_box.changed.connect(on_style)

            var actions_button = new Button()
            actions_button.image = new Image.from_stock(Stock.EXECUTE, IconSize.BUTTON)
            actions_button.relief = ReliefStyle.NONE
            actions_button.tooltip_text = "Library actions"
            actions_button.button_press_event.connect(on_actions)

            var bottom_box = new Box(Orientation.HORIZONTAL, 5)
            bottom_box.pack_start(_style_box)
            bottom_box.pack_start(actions_button, false)

            // Assemble

            var box = new Box(Orientation.VERTICAL, 10)
            box.pack_start(top_box, false)
            box.pack_start(tree_frame)
            box.pack_start(bottom_box, false)
        
            add(box)
            set(0, 0, 1, 1)
            
            _expand_on_click = _instance.configuration.expand_on_click

            _instance.configuration.expand_on_click_change.connect(on_expand_on_click_changed)
            _instance.configuration.show_duration_change.connect(on_show_duration_changed)
            _instance.configuration.subdue_lossy_change.connect(on_subdue_lossy_changed)

            var api = (API) _instance.api
            api.connection_change_gdk.connect(on_connection_changed)
        
        prop readonly accel_group: AccelGroup

        def initial_focus()
            _tree_view.grab_focus()
            
        def update()
            _tree_view.freeze_child_notify()
            _tree_view.model = null
            _store.clear()
            fill_all()
            _tree_view.model = _store
            _tree_view.thaw_child_notify()
        
        def private on_unrealized()
            _instance.configuration.expand_on_click_change.disconnect(on_expand_on_click_changed)
            _instance.configuration.show_duration_change.disconnect(on_show_duration_changed)
            _instance.configuration.subdue_lossy_change.disconnect(on_subdue_lossy_changed)

            var api = (API) _instance.api
            api.connection_change_gdk.disconnect(on_connection_changed)

        def private on_title_render(layout: CellLayout, renderer: CellRenderer, model: TreeModel, iter: TreeIter)
            // Set xalign according to RTL column
            value: Value
            model.get_value(iter, Column.RTL, out value)
            var rtl = (bool) value
            renderer.xalign = rtl ? 1 : 0

        def private on_duration_render(layout: CellLayout, renderer: CellRenderer, model: TreeModel, iter: TreeIter)
            // Should not be visible when empty
            value: Value
            model.get_value(iter, Column.DURATION, out value)
            var duration_markup = (string) value
            if (duration_markup is not null) and (duration_markup.length > 0)
                renderer.visible = true
                var text = (CellRendererText) renderer
                text.markup = duration_markup
            else
                renderer.visible = false
            
        def private on_row_separator(mode: TreeModel, iter: TreeIter): bool
            value: Value
            _store.get_value(iter, Column.NODE, out value)
            return ((Json.Node) value).get_node_type() == Json.NodeType.NULL
        
        def private on_clicked(e: Gdk.EventButton): bool
            if _expand_on_click
                path: TreePath
                cell_x: int
                cell_y: int
                if _tree_view.get_path_at_pos((int) e.x, (int) e.y, out path, null, out cell_x, out cell_y)
                    // Expand only if row is not already expanded and is in fact expandable
                    if not _tree_view.is_row_expanded(path)
                        iter: TreeIter
                        if _store.get_iter(out iter, path)
                            if _store.iter_children(out iter, iter)
                                _tree_view.expand_row(path, false)
                                
                                // Avoid selecting this row if we are not in selecting mode
                                if (e.state & (Gdk.ModifierType.CONTROL_MASK|Gdk.ModifierType.SHIFT_MASK)) == 0
                                    return true
            return false

        def private on_double_clicked(e: Gdk.EventButton)
            on_add()

        def private on_right_clicked(e: Gdk.EventButton)
            on_actions(e)

        def private on_key_pressed(e: Gdk.EventKey): bool
            var keyval = e.keyval
            if keyval == Gdk.Key.Menu
                var selections = _tree_view.get_selection().count_selected_rows()
                if selections == 0
                    _popup_none.popup(null, null, null, 0, e.time)
                else
                    _popup.popup(null, null, null, 0, e.time)
            if keyval == Gdk.Key.Delete
                on_delete()
            return false
        
        def private on_expanded(iter: TreeIter, path: TreePath): bool
            // Check for placeholder
            placeholder_iter: TreeIter
            if _store.iter_children(out placeholder_iter, iter)
                value: Value
                _store.get_value(placeholder_iter, Column.NODE, out value)
                if (Json.Node) value is null
                    // We found the placeholder, so use the active style to fill
                    _store.remove(ref placeholder_iter)
                    if fill_at(iter)
                        _tree_view.thaw_child_notify()
            return false
        
        def private on_dragged(context: Gdk.DragContext, selection_data: SelectionData, info: uint, time: uint)
            var tracks = gather_selected_tracks()
            if tracks is not null
                selection_data.@set(selection_data.get_target(), 8, array_to(tracks).data)
        
        def private on_dropped(context: Gdk.DragContext, x: int, y: int, selection_data: SelectionData, info: uint, time: uint)
            pass

        def private on_filter()
            update()
            
        def private on_clear_filter()
            _filter_box.entry.text = ""
            on_filter()

        def private on_style()
            var style = _style_box.active_style
            if (style is not null) and (style.name != _instance.configuration.library_style)
                _instance.configuration.library_style = style.name
                _instance.configuration.save()
            on_filter()

        def private on_add()
            var tracks = gather_selected_tracks()
            if tracks is not null
                API.in_gdk = true
                _instance.api.add_to_playlist(int.MIN, tracks, null, true)
                API.in_gdk = false

        def private on_add_at()
            pass

        def private on_delete()
            pass
            
        def private on_manage()
            new LibraryManager(_instance).show_all()

        def private on_popup_extra()
            new Popup(_instance).show_all()
            
        def private on_actions(e: Gdk.EventButton): bool
            var selections = _tree_view.get_selection().count_selected_rows()
            if selections == 0
                _popup_none.popup(null, null, null, e.button, e.time)
            else
                _popup.popup(null, null, null, e.button, e.time)
            return false

        def on_connection_changed(host: string?, port: uint, player: string?, old_host: string?, old_port: uint, old_player: string?)
            on_filter()

        def private on_expand_on_click_changed(value: bool)
            _expand_on_click = value

        def private on_show_duration_changed(value: bool)
            update()

        def private on_subdue_lossy_changed(value: bool)
            update()
            
        def private fill_at(iter: TreeIter): bool
            return _fill(false, false, iter)

        def private fill_all()
            _fill(true, true, null)
            
        def private _fill(is_frozen: bool, can_filter: bool, iter: TreeIter?): bool
            var style = (LibraryStyle) _style_box.active_style
            if style is not null
                var node = new LibraryNode(_instance, _tree_view, _store, iter)
                node.is_frozen = is_frozen
                filter: string? = can_filter ? _filter_box.entry.text : null
                if filter is not null
                    filter = filter.strip()
                    if filter.length < MINIMUM_FILTER_LENGTH
                        filter = null
                style.fill(node, filter)
                return node.is_frozen
            return false
        
        def private gather_selected_tracks(): Json.Array?
            var style = (LibraryStyle) _style_box.active_style
            if style is not null
                var selection = _tree_view.get_selection()
                var tree_paths = selection.get_selected_rows(null)
                if tree_paths.length() > 0
                    iter: TreeIter
                    var data = new Json.Array()
                    for var tree_path in tree_paths
                        if _store.get_iter(out iter, tree_path)
                            var node = new LibraryNode(_instance, _tree_view, _store, iter)
                            style.gather_tracks(node, ref data)
                    return data
            return null

        def create_popup_menu(has_items: bool = false, is_compilation: bool = false): Gtk.Menu
            var menu = new Gtk.Menu()
            item: Gtk.MenuItem
            if has_items
                item = new Gtk.MenuItem.with_mnemonic("_Add to end of playlist")
                item.activate.connect(on_add)
                menu.append(item)
                item = new Gtk.MenuItem.with_mnemonic("Add to after _currently playing track")
                item.activate.connect(on_add_at)
                menu.append(item)
                if is_compilation
                    menu.append(new SeparatorMenuItem())
                    item = new Gtk.MenuItem.with_mnemonic("_Delete these tracks from my playlists")
                    item.activate.connect(on_delete)
                    menu.append(item)
                menu.append(new SeparatorMenuItem())
            item = new Gtk.MenuItem.with_mnemonic("_Manage libraries")
            item.activate.connect(on_manage)
            menu.append(item)
            item = new Gtk.MenuItem.with_mnemonic("_Popup an extra library browser")
            item.activate.connect(on_popup_extra)
            menu.append(item)
            menu.show_all()
            return menu

        _instance: Instance
        _store: TreeStore
        _tree_view: ClickableDraggableTreeView
        _filter_box: EntryBox
        _style_box: StyleComboBox
        _popup_none: Gtk.Menu
        _popup: Gtk.Menu
        _popup_playlist: Gtk.Menu
        _expand_on_click: bool
        
        const MINIMUM_FILTER_LENGTH: int = 1

        class private Popup: Window
            construct(instance: GTK.Instance)
                title = "Khövsgöl Library Browser"
                set_position(WindowPosition.CENTER)
                set_default_size(500, 600)
                border_width = 10
                var library = new Library(instance)
                library.update()
                add(library)
            
                key_press_event.connect(on_key_pressed)

            def private on_key_pressed(e: Gdk.EventKey): bool
                var keyval = e.keyval
                if keyval == Gdk.Key.Escape
                    destroy()
                    return true
                else
                    return false

        enum private Column
            NODE = 0     // Json.Node
            SEARCH = 1   // string
            TITLE = 2    // string
            DURATION = 3 // string
            RTL = 4      // bool

        const private DRAG_TARGETS: array of TargetEntry = {
            {"JSON_ARRAY",        TargetFlags.SAME_WIDGET, TargetInfo.JSON_ARRAY},
            {"JSON_STRING_ARRAY", TargetFlags.SAME_APP,    TargetInfo.JSON_STRING_ARRAY}, // name, flags, id
            {"TEXT",              TargetFlags.OTHER_APP,   TargetInfo.TEXT},
            {"STRING",            TargetFlags.OTHER_APP,   TargetInfo.TEXT},
            {"text/plain",        TargetFlags.OTHER_APP,   TargetInfo.TEXT},
            {"text/uri-list",     TargetFlags.OTHER_APP,   TargetInfo.URI_LIST}}

        const private DROP_TARGETS: array of TargetEntry = {
            {"JSON_ARRAY",        TargetFlags.SAME_WIDGET, TargetInfo.JSON_ARRAY},
            {"JSON_STRING_ARRAY", TargetFlags.SAME_APP,    TargetInfo.JSON_STRING_ARRAY},
            {"text/uri-list",     TargetFlags.OTHER_APP,   TargetInfo.URI_LIST}}
