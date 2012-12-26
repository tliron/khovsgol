[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    def get_duration_markup(duration: double, show_duration: bool): string?
        if show_duration and duration != double.MIN
            return Markup.escape_text("(%s)".printf(format_duration(duration)))
        else
            return null

    //def get_stock_icon_pixbuf(window, name):
      //  return window.render_icon(getattr(Gtk, 'STOCK_' + name), Gtk.IconSize.MENU, None)

    enum TargetInfo
        UNKNOWN = 0
        JSON_ARRAY = 1
        JSON_NUMBER_ARRAY = 2
        JSON_STRING_ARRAY = 3
        TEXT = 4
        STRING = 5
        TEXT_PLAIN = 6

    /*
     * Basic interface for library and playlist styles.
     */
    interface Style: GLib.Object
        prop abstract readonly name: string
        prop abstract readonly label: string
    
    /*
     * Represents a node in the Playlist pane, with a simplified API for
     * accessing and modifying the node data.
     */
    class PlaylistNode
        construct(instance: Instance, tree_view: TreeView, store: ListStore, tracks: IterableOfTrack, albums: IterableOfAlbum, iter: TreeIter? = null)
            _instance = instance
            _tree_view = tree_view
            _store = store
            _tracks = tracks
            _albums = albums
            _iter = iter

        prop readonly instance: Instance
        prop readonly tracks: IterableOfTrack
        prop is_frozen: bool
        
        prop readonly position: int
            get
                value: Value
                _store.get_value(_iter, Playlist.Column.POSITION, out value)
                return (int) value
        
        prop readonly as_object: Json.Object?
            get
                value: Value
                _store.get_value(_iter, Playlist.Column.NODE, out value)
                return ((Json.Node) value).get_object()

        prop readonly as_array: Json.Array
            get
                value: Value
                _store.get_value(_iter, Playlist.Column.NODE, out value)
                return ((Json.Node) value).get_array()
                
        def get_album(path: string): Album?
            if _albums_dict is null
                _albums_dict = new dict of string, Album
                for var album in _albums
                    _albums_dict[album.path] = album
            return _albums_dict[path]

        def append(node: Json.Node?, position: int, search: string? = null, title_markup: string? = null, duration_markup: string? = null)
            rtl: bool = false
            if search is not null
                var direction = Pango.find_base_dir(search, -1)
                rtl = (direction == Pango.Direction.RTL) or (direction == Pango.Direction.WEAK_RTL)

            if not _is_frozen
                _tree_view.freeze_child_notify()
                _is_frozen = true

            iter: TreeIter
            _store.append(out iter)
            _store.@set(iter, Playlist.Column.NODE, node, Playlist.Column.POSITION, position, Playlist.Column.SEARCH, search, Playlist.Column.TITLE, title_markup, Playlist.Column.DURATION, duration_markup, Playlist.Column.RTL, rtl, -1)

        def append_object(obj: Json.Object, position: int, search: string? = null, title_markup: string? = null, duration_markup: string? = null)
            var node = new Json.Node(Json.NodeType.OBJECT)
            node.set_object(obj)
            append(node, position, search, title_markup, duration_markup)
        
        def append_array(arr: Json.Array, position: int, search: string? = null, title_markup: string? = null, duration_markup: string? = null)
            var node = new Json.Node(Json.NodeType.ARRAY)
            node.set_array(arr)
            append(node, position, search, title_markup, duration_markup)

        def append_separator()
            append(null, Playlist.SEPARATOR_POSITION)

        _tree_view: TreeView
        _store: ListStore
        _iter: TreeIter?
        _albums: IterableOfAlbum
        _albums_dict: dict of string, Album

    /*
     * Represents a node in the Library pane, with a simplified API for
     * accessing and modifying the node data.
     */
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

        prop readonly as_string: string
            get
                value: Value
                _store.get_value(_iter, Library.Column.NODE, out value)
                return ((Json.Node) value).get_string()

        prop readonly as_int: int
            get
                value: Value
                _store.get_value(_iter, Library.Column.NODE, out value)
                return (int) ((Json.Node) value).get_int()

        prop readonly node_type: Json.NodeType
            get
                value: Value
                _store.get_value(_iter, Library.Column.NODE, out value)
                return ((Json.Node) value).get_node_type()

        def append(node: Json.Node?, search: string? = null, title_markup: string? = null, duration_markup: string? = null, is_expandable: bool = false)
            rtl: bool = false
            if search is not null
                var direction = Pango.find_base_dir(search, -1)
                rtl = (direction == Pango.Direction.RTL) or (direction == Pango.Direction.WEAK_RTL)

            if not _is_frozen
                _tree_view.freeze_child_notify()
                _is_frozen = true

            child_iter: TreeIter
            _store.append(out child_iter, _iter)
            _store.@set(child_iter, Library.Column.NODE, node, Library.Column.SEARCH, search, Library.Column.TITLE, title_markup, Library.Column.DURATION, duration_markup, Library.Column.RTL, rtl, -1)

            if is_expandable
                // Add placeholder
                placeholder_iter: TreeIter
                _store.append(out placeholder_iter, child_iter)
                _store.@set(placeholder_iter, Library.Column.NODE, null, -1)
        
        def append_object(obj: Json.Object, search: string? = null, title_markup: string? = null, duration_markup: string? = null, is_expandable: bool = false)
            var node = new Json.Node(Json.NodeType.OBJECT)
            node.set_object(obj)
            append(node, search, title_markup, duration_markup, is_expandable)

        def append_array(arr: Json.Array, search: string? = null, title_markup: string? = null, duration_markup: string? = null, is_expandable: bool = false)
            var node = new Json.Node(Json.NodeType.ARRAY)
            node.set_array(arr)
            append(node, search, title_markup, duration_markup, is_expandable)

        def append_string(data: string, search: string? = null, title_markup: string? = null, duration_markup: string? = null, is_expandable: bool = false)
            var node = new Json.Node(Json.NodeType.VALUE)
            node.set_string(data)
            append(node, search, title_markup, duration_markup, is_expandable)

        def append_int(data: int, search: string? = null, title_markup: string? = null, duration_markup: string? = null, is_expandable: bool = false)
            var node = new Json.Node(Json.NodeType.VALUE)
            node.set_int(data)
            append(node, search, title_markup, duration_markup, is_expandable)

        def append_separator()
            var node = new Json.Node(Json.NodeType.NULL)
            append(node)

        _tree_view: TreeView
        _store: TreeStore
        _iter: TreeIter?
    
    class ControlButton: Button
        construct(id: string, alt_key: uint, tooltip: string, accel_group: AccelGroup)
            image = new Image.from_stock(id, IconSize.BUTTON)
            relief = ReliefStyle.NONE
            add_accelerator("clicked", accel_group, alt_key, Gdk.ModifierType.MOD1_MASK, AccelFlags.VISIBLE|AccelFlags.LOCKED)
            tooltip_text = tooltip

    class ControlToolButton: ToolButton
        construct(id: string, alt_key: uint, tooltip: string, accel_group: AccelGroup)
            stock_id = id
            add_accelerator("clicked", accel_group, alt_key, Gdk.ModifierType.MOD1_MASK, AccelFlags.VISIBLE|AccelFlags.LOCKED)
            tooltip_text = tooltip

    class ControlToggleToolButton: ToggleToolButton
        construct(id: string, alt_key: uint, tooltip: string, accel_group: AccelGroup)
            stock_id = id
            add_accelerator("clicked", accel_group, alt_key, Gdk.ModifierType.MOD1_MASK, AccelFlags.VISIBLE|AccelFlags.LOCKED)
            tooltip_text = tooltip

    /*
     * Entry with a Label in a box.
     */
    class EntryBox: Box
        construct(label: string, name: string? = null, value: string? = null)
            orientation = Orientation.HORIZONTAL
            spacing = 5
            _entry = new Entry()
            if name is not null
                _entry.name = name
            /*if sensitivity is not null
                entry.set_sensitive(sensitivity)*/
            if value is not null
                entry.text = value
            var l = new Label.with_mnemonic(label)
            l.use_markup = true
            l.mnemonic_widget = entry
            pack_start(l, false)
            pack_start(_entry)
        
        prop readonly entry: Entry

    /*
     * ComboBox with an optional Label, a single rendered text column
     * plus an invisible Variant column for the active value.
     */
    class SimpleComboBox: Box
        construct(name: string? = null, label: string? = null)
            orientation = Orientation.HORIZONTAL
            spacing = 5
            
            _store = new ListStore(2, typeof(Variant), typeof(string))
            _combo_box = new ComboBox.with_model(_store)
            if name is not null
                _combo_box.name = name
            var renderer = new CellRendererText()
            _combo_box.pack_start(renderer, true)
            _combo_box.add_attribute(renderer, "text", 1)
            
            if label is not null
                var l = new Label.with_mnemonic(label)
                l.use_markup = true
                l.mnemonic_widget = _combo_box
                pack_start(l, false)

            pack_start(_combo_box)
        
        prop readonly combo_box: ComboBox
        prop readonly store: ListStore
        
        prop active: Variant?
            get
                iter: TreeIter
                if _combo_box.get_active_iter(out iter)
                    stored: Value
                    _store.get_value(iter, 0, out stored)
                    return (Variant) stored
                else
                    return null
            set
                if value is not null
                    iter: TreeIter
                    if _store.get_iter_first(out iter)
                        stored: Value
                        while true
                            _store.get_value(iter, 0, out stored)
                            if value.compare((Variant) stored) == 0
                                _combo_box.set_active_iter(iter)
                                break
                            if not _store.iter_next(ref iter)
                                break
                else
                    _combo_box.active = -1
        
        def append(value: Variant, label: string)
            iter: TreeIter
            _store.append(out iter)
            _store.@set(iter, 0, value, 1, label, -1)

    /*
     * A ComboBox for Style instances.
     */
    class StyleComboBox: ComboBox
        construct()
            model = _store = new ListStore(2, typeof(Style), typeof(string))
            var renderer = new CellRendererText()
            pack_start(renderer, true)
            add_attribute(renderer, "text", 1)

        prop readonly active_style: Style?
            get
                iter: TreeIter
                if get_active_iter(out iter)
                    stored: Value
                    _store.get_value(iter, 0, out stored)
                    return (Style) stored
                else
                    return null

        prop active_style_name: string?
            get
                var style = active_style
                if style is not null
                    return style.name
                else
                    return null
            set
                if value is not null
                    iter: TreeIter
                    if _store.get_iter_first(out iter)
                        stored: Value
                        while true
                            _store.get_value(iter, 0, out stored)
                            if value == ((Style) stored).name
                                set_active_iter(iter)
                                break
                            if not _store.iter_next(ref iter)
                                break
                else
                    active = -1
        
        def append(style: Style)
            iter: TreeIter
            _store.append(out iter)
            _store.@set(iter, 0, style, 1, style.label, -1)
            
        _store: ListStore

    /*
     * A TreeView that does not reset the selection when right-clicked
     * or double-clicked.
     * 
     * Solving the annoying default behavior in GTK+ meant rewriting
     * the entire click-handling logic.
     */
    class ClickableDraggableTreeView: TreeView
        construct()
            get_selection().set_select_function(is_selectable)
            button_press_event.connect(on_pressed)
            button_release_event.connect(on_released)
            drag_begin.connect(on_drag_begin)
            
        event double_click(e: Gdk.EventButton)
        event right_click(e: Gdk.EventButton)
            
        _selectable: bool = true
            
        def private is_selectable(selection: TreeSelection, model: TreeModel, path: TreePath, path_currently_selected: bool): bool
            return _selectable

        def private on_pressed(e: Gdk.EventButton): bool
            var selection = get_selection()
            var selected_paths = selection.get_selected_rows(null)
            clicked_path: TreePath
            get_path_at_pos((int) e.x, (int) e.y, out clicked_path, null, null, null)
            
            // Did the user click in the selection?
            in_selection: bool = false
            if clicked_path is not null
                for var selected_path in selected_paths
                    if selected_path.compare(clicked_path) == 0
                        in_selection = true
                        break
        
            // Double click
            if e.type == Gdk.EventType.@2BUTTON_PRESS
                _selectable = true
                selection.unselect_all()
                if clicked_path is not null
                    // Select and act on only one item
                    selection.select_path(clicked_path)
                double_click(e)
                return true

            // Right click
            else if e.button == 3
                _selectable = true
                if not in_selection
                    selection.unselect_all()
                    if clicked_path is not null
                        // Select and act on only one item
                        selection.select_path(clicked_path)
                right_click(e)
                return true

            // Regular click
            else if (e.button == 1) and ((e.state & (Gdk.ModifierType.CONTROL_MASK|Gdk.ModifierType.SHIFT_MASK)) == 0)
                if in_selection
                    // Looks like user *might* be starting a drag
                    _selectable = false
                    
                    // Note: this does break the user's ability to create an entirely new selection by clicking on an
                    // item which is already within the selection, but it seems like we don't have a choice: there's
                    // no way for us to know here for sure that we are starting are drag
                    pass
                else if clicked_path is null
                    // User clicked on empty space
                    selection.unselect_all()

            return false

        def private on_released(e: Gdk.EventButton): bool
            _selectable = true
            return false

        def private on_drag_begin(context: Gdk.DragContext)
            _selectable = true
    
    /*
     * The FreeDesktop autostart specification.
     * 
     * See: http://standards.freedesktop.org/autostart-spec/autostart-spec-latest.html
     */
    class Autostart
        construct(name: string, template: File?)
            _path = "%s/.config/autostart/%s.desktop".printf(Environment.get_home_dir(), name)
            _file = File.new_for_path(_path)
            _template = template
        
        def is_active(): bool raises GLib.Error
            if _file.query_exists()
                var key_file = new KeyFile()
                key_file.load_from_file(_path, KeyFileFlags.KEEP_COMMENTS)
                return key_file.get_boolean("Desktop Entry", "X-GNOME-Autostart-enabled")
            return false
        
        def set_active(value: bool, exec: string? = null) raises GLib.Error
            if value
                if (_template is not null) and not _file.query_exists()
                    // Copy from template
                    _template.copy(_file, FileCopyFlags.OVERWRITE)
                    FileUtils.chmod(_path, 0764) // octal literal
                
                // Enable
                var key_file = new KeyFile()
                key_file.load_from_file(_path, KeyFileFlags.KEEP_COMMENTS)
                key_file.set_boolean("Desktop Entry", "X-GNOME-Autostart-enabled", true)
                if exec is not null
                    key_file.set_string("Desktop Entry", "Exec", exec)
                var data = key_file.to_data()
                FileUtils.set_data(_path, data.data)
            else
                // No need to disable if file does not exist
                if _file.query_exists()
                    var key_file = new KeyFile()
                    key_file.load_from_file(_path, KeyFileFlags.KEEP_COMMENTS)
                    key_file.set_boolean("Desktop Entry", "X-GNOME-Autostart-enabled", false)
                    var data = key_file.to_data()
                    FileUtils.set_data(_path, data.data)
        
        _path: string
        _file: File
        _template: File?
