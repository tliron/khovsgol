[indent=4]

uses
    Gtk
    JsonUtil
    Khovsgol

namespace Khovsgol.GUI

    class LibraryNode
        construct(instance: Instance, tree_view: TreeView, store: TreeStore, iter: TreeIter? = null)
            _instance = instance
            _tree_view = tree_view
            _store = store
            _iter = iter
        
        prop readonly instance: Instance

        prop is_frozen: bool
        
        prop readonly level: int
            get
                if _iter is not null
                    return _store.iter_depth(_iter) + 1
                else
                    return 0
        
        prop readonly as_object: Json.Object?
            get
                value: Value
                _store.get_value(_iter, Library.Column.NODE, out value)
                return ((Json.Node) value).get_object()

        prop readonly as_array: Json.Array
            get
                value: Value
                _store.get_value(_iter, Library.Column.NODE, out value)
                return ((Json.Node) value).get_array()

        def append(node: Json.Node, search: string? = null, markup1: string? = null, markup2: string? = null, is_expandable: bool = false)
            if !_is_frozen
                _tree_view.freeze_child_notify()
                _is_frozen = true
            child_iter: TreeIter
            _store.append(out child_iter, _iter)
            _store.set(child_iter, Library.Column.NODE, node, Library.Column.SEARCH, search, Library.Column.MARKUP1, markup1, Library.Column.MARKUP2, markup2, -1)
            if is_expandable
                // Add placeholder
                _store.append(out child_iter, child_iter)
                _store.set(child_iter, Library.Column.NODE, null, -1)

        def append_object(obj: Json.Object, search: string? = null, markup1: string? = null, markup2: string? = null, is_expandable: bool = false)
            var node = new Json.Node(Json.NodeType.OBJECT)
            node.set_object(obj)
            append(node, search, markup1, markup2, is_expandable)

        def append_array(arr: Json.Array, search: string? = null, markup1: string? = null, markup2: string? = null, is_expandable: bool = false)
            var node = new Json.Node(Json.NodeType.ARRAY)
            node.set_array(arr)
            append(node, search, markup1, markup2, is_expandable)

        _store: TreeStore
        _tree_view: TreeView
        _iter: TreeIter?
    
    class Library: Alignment
        construct(instance: Instance)
            _instance = instance
            _accel_group = new AccelGroup()

            unrealize.connect(on_unrealized)
            
            // Popup menus
            
            _popup_none = create_popup_menu()
            _popup = create_popup_menu(true)
            _popup_custom = create_popup_menu(true, true)
        
            // Top
            
            _filter_box = new EntryBox("_Filter:")
            var clear_filter_button = new ControlButton(Stock.CLEAR, Gdk.Key.T, "Reset library filter\n<Alt>T", _accel_group)
            clear_filter_button.clicked.connect(on_clear_filter)
            _filter_box.pack_start(clear_filter_button, false)
            _filter_box.entry.activate.connect(on_filter)

            var top_box = new Box(Orientation.HORIZONTAL, 5)
            top_box.pack_start(_filter_box)

            // Tree
            
            _store = new TreeStore(4, typeof(Json.Node), typeof(string), typeof(string), typeof(string)) // node, search, markup1, markup2
            
            var renderer1 = new CellRendererText()
            renderer1.ellipsize = Pango.EllipsizeMode.END // This also mysteriously enables right alignment for RTL text
            var renderer2 = new CellRendererText()
            renderer2.xalign = 1
            renderer2.alignment = Pango.Alignment.RIGHT
            var column = new TreeViewColumn()
            column.pack_start(renderer1, true)
            column.pack_start(renderer2, false)
            column.add_attribute(renderer1, "markup", Column.MARKUP1)
            column.add_attribute(renderer2, "markup", Column.MARKUP2)
            column.set_cell_data_func(renderer2, on_markup2_render)

            _tree_view = new ClickableDraggableTreeView()
            _tree_view.model = _store
            _tree_view.headers_visible = false
            _tree_view.get_selection().mode = SelectionMode.MULTIPLE
            _tree_view.set_row_separator_func(on_row_separator)
            _tree_view.append_column(column)
            _tree_view.search_column = 1
            _tree_view.enable_model_drag_source(Gdk.ModifierType.BUTTON1_MASK, DRAG_TARGETS, Gdk.DragAction.LINK)
            _tree_view.enable_model_drag_dest(DROP_TARGETS, Gdk.DragAction.LINK|Gdk.DragAction.MOVE)
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
            _style_box.append(new CustomCompilations())
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
            
            on_filter()
        
        prop readonly accel_group: AccelGroup
            
        def private on_unrealized()
            pass

        //def private on_progress_render(layout: CellLayout, renderer: CellRenderer, model: TreeModel, iter: TreeIter)
          //  pass
            
        def private on_markup2_render(layout: CellLayout, renderer: CellRenderer, model: TreeModel, iter: TreeIter)
            pass
            
        def private on_row_separator(mode: TreeModel, iter: TreeIter): bool
            return false
        
        def private on_clicked(event: Gdk.EventButton): bool
            return false

        def private on_double_clicked(e: Gdk.EventButton)
            pass

        def private on_right_clicked(e: Gdk.EventButton)
            var selections = _tree_view.get_selection().count_selected_rows()
            if selections == 0
                _popup_none.popup(null, null, null, e.button, e.time)
            else
                _popup.popup(null, null, null, e.button, e.time)

        def private on_key_pressed(e: Gdk.EventKey): bool
            if e.keyval == Gdk.Key.Menu
                var selections = _tree_view.get_selection().count_selected_rows()
                if selections == 0
                    _popup_none.popup(null, null, null, 0, e.time)
                else
                    _popup.popup(null, null, null, 0, e.time)
            return false
        
        def private on_expanded(iter: TreeIter, path: TreePath): bool
            // Check for placeholder
            placeholder_iter: TreeIter
            if _store.iter_children(out placeholder_iter, iter)
                value: Value
                _store.get_value(placeholder_iter, Column.NODE, out value)
                if (Json.Node) value == null
                    // We found the placeholder, so use the active style to fill
                    _store.remove(ref placeholder_iter)
                    var style = _style_box.active_style
                    if style is not null
                        var node = new LibraryNode(_instance, _tree_view, _store, iter)
                        ((LibraryStyle) style).fill(node)
                        if node.is_frozen
                            _tree_view.thaw_child_notify()
            return false
 
        def private on_dragged(context: Gdk.DragContext, selection_data: SelectionData, info: uint, time: uint)
            var style = _style_box.active_style
            if style is not null
                var selection = _tree_view.get_selection()
                var tree_paths = selection.get_selected_rows(null)
                var target = selection_data.get_target()
                var data = new Json.Array()
                iter: TreeIter
                for var tree_path in tree_paths
                    if _store.get_iter(out iter, tree_path)
                        var node = new LibraryNode(_instance, _tree_view, _store, iter)
                        ((LibraryStyle) style).gather_tracks(node, ref data)
                        /*_store.get_value(iter, Column.TRACK, out value)
                        var track = (Json.Object) value
                        if track is not null
                            var path = get_string_member_or_null(track, "path")
                            if path is not null
                                data.add_string_element(path)*/
                selection_data.@set(target, 8, array_to(data).data)
        
        def private on_dropped(context: Gdk.DragContext, x: int, y: int, selection_data: SelectionData, info: uint, time: uint)
            pass

        def private on_filter()
            _tree_view.freeze_child_notify()
            _tree_view.model = null
            _store.clear()
            var style = _style_box.active_style
            if style is not null
                var node = new LibraryNode(_instance, _tree_view, _store)
                node.is_frozen = true
                ((LibraryStyle) style).fill(node)
            _tree_view.model = _store
            _tree_view.thaw_child_notify()
        
        def private on_clear_filter()
            _filter_box.entry.text = ""
            on_filter()

        def private on_style()
            on_filter()

        def private on_add()
            pass

        def private on_add_at()
            pass

        def private on_delete()
            pass

        def private on_popup_extra()
            var window = new Window()
            window.title = "Khövsgöl Library Browser"
            window.set_position(WindowPosition.CENTER)
            window.set_default_size(500, 600)
            window.border_width = 10
            window.add(new Library(_instance))
            window.show_all()

        def private on_actions(e: Gdk.EventButton): bool
            on_right_clicked(e)
            return false
            
        def create_popup_menu(has_items: bool = false, is_compilation: bool = false): Gtk.Menu
            var menu = new Gtk.Menu()
            item: Gtk.MenuItem
            if has_items
                item = new Gtk.MenuItem.with_mnemonic("Add to end of playlist")
                item.activate.connect(on_add)
                menu.append(item)
                item = new Gtk.MenuItem.with_mnemonic("Add to after currently playing track")
                item.activate.connect(on_add_at)
                menu.append(item)
                if is_compilation
                    menu.append(new SeparatorMenuItem())
                    item = new Gtk.MenuItem.with_mnemonic("Delete these tracks from my compilations")
                    item.activate.connect(on_delete)
                    menu.append(item)
                menu.append(new SeparatorMenuItem())
            item = new Gtk.MenuItem.with_mnemonic("Popup an extra library browser")
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
        _popup_custom: Gtk.Menu

        enum private Column
            NODE = 0     // Json.Object
            SEARCH = 1   // string
            MARKUP1 = 2  // string
            MARKUP2 = 3  // string

        const private DRAG_TARGETS: array of TargetEntry = {
            {"JSON_ARRAY",        TargetFlags.SAME_WIDGET, 0},
            {"JSON_STRING_ARRAY", TargetFlags.SAME_APP,    1}, // name, flags, id
            {"TEXT",              0,                       2},
            {"STRING",            0,                       3},
            {"text/plain",        0,                       4}}

        const private DROP_TARGETS: array of TargetEntry = {
            {"JSON_ARRAY",        TargetFlags.SAME_WIDGET, 0},
            {"JSON_STRING_ARRAY", TargetFlags.SAME_APP,    1}}
