[indent=4]

uses
    Gtk

namespace Khovsgol.GUI

    //def get_stock_icon_pixbuf(window, name):
      //  return window.render_icon(getattr(Gtk, 'STOCK_' + name), Gtk.IconSize.MENU, None)

    /*
     * True if the file type is known to be lossless.
     */
    def is_lossless(file_type: string): bool
        return (file_type == "flac") || (file_type == "ape") || (file_type == "wav") || (file_type == "wv") || (file_type == "tta")
    
    /*
     * Formats a duration in seconds as "hh:mm:ss".
     */
    def format_duration(duration: double): string
        var seconds = (int) Math.round(duration)
        var minutes = seconds / 60
        var hours = seconds / 3600
        seconds -= minutes * 60
        minutes -= hours * 60
        if hours > 0
            return "%d:%02d:%02d".printf(hours, minutes, seconds)
        else if minutes > 0
            return "%d:%02d".printf(minutes, seconds)
        else
            return seconds.to_string()

    /*
     * Adds markup for a washed-out effect.
     */
    def format_washed_out(text: string): string
        return "<span color=\"#888888\">%s</span>".printf(text)

    /*
     * Adds markup for bracketed annotations.
     */
    def format_annotation(text: string): string
        if text.has_suffix("]")
            var open = text.last_index_of_char('[')
            if open != -1
                return "%s<span size=\"smaller\">%s</span>".printf(text.substring(0, open), text.substring(open))
        return text
    
    /*
     * Converts the first character to uppercase.
     */
    def first_upper(text: string): string
        if text.length > 0
            var first = text.get_char(0)
            var second = 0
            if text.get_next_char(ref second, null)
                return first.toupper().to_string() + text.substring(second)
        return text
    
    /*
     * Basic interface for plugins.
     */
    interface Plugin: GLib.Object
        def abstract start()
        def abstract stop()
        prop abstract instance: Instance

    /*
     * Basic interface for library and playlist styles.
     */
    interface Style: GLib.Object
        prop abstract readonly name: string
        prop abstract readonly label: string
    
    /*
     * Represents a node in the PlayList pane, with a simplified API for
     * accessing and modifying the node data.
     */
    class PlayListNode
        construct(instance: Instance, tree_view: TreeView, store: ListStore, tracks: IterableOfTrack, iter: TreeIter? = null)
            _instance = instance
            _tree_view = tree_view
            _store = store
            _tracks = tracks
            _iter = iter

        prop readonly instance: Instance
        prop readonly tracks: IterableOfTrack
        prop is_frozen: bool
        
        prop readonly position: int
            get
                value: Value
                _store.get_value(_iter, PlayList.Column.POSITION, out value)
                return (int) value
        
        prop readonly as_object: Json.Object?
            get
                value: Value
                _store.get_value(_iter, PlayList.Column.NODE, out value)
                return ((Json.Node) value).get_object()

        prop readonly as_array: Json.Array
            get
                value: Value
                _store.get_value(_iter, PlayList.Column.NODE, out value)
                return ((Json.Node) value).get_array()

        def append(node: Json.Node?, position: int, search: string? = null, markup1: string? = null, markup2: string? = null)
            if !_is_frozen
                _tree_view.freeze_child_notify()
                _is_frozen = true
            iter: TreeIter
            _store.append(out iter)
            _store.set(iter, PlayList.Column.NODE, node, PlayList.Column.SEARCH, search, PlayList.Column.MARKUP1, markup1, PlayList.Column.MARKUP2, markup2, PlayList.Column.POSITION, position, -1)

        def append_object(obj: Json.Object, position: int, search: string? = null, markup1: string? = null, markup2: string? = null)
            var node = new Json.Node(Json.NodeType.OBJECT)
            node.set_object(obj)
            append(node, position, search, markup1, markup2)
        
        def append_array(arr: Json.Array, position: int, search: string? = null, markup1: string? = null, markup2: string? = null)
            var node = new Json.Node(Json.NodeType.ARRAY)
            node.set_array(arr)
            append(node, position, search, markup1, markup2)

        def append_separator()
            append(null, PlayList.SEPARATOR_POSITION)

        _tree_view: TreeView
        _store: ListStore
        _iter: TreeIter?

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

        def append(node: Json.Node?, search: string? = null, markup1: string? = null, markup2: string? = null, is_expandable: bool = false)
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

        def append_string(data: string, search: string? = null, markup1: string? = null, markup2: string? = null, is_expandable: bool = false)
            var node = new Json.Node(Json.NodeType.VALUE)
            node.set_string(data)
            append(node, search, markup1, markup2, is_expandable)

        def append_int(data: int, search: string? = null, markup1: string? = null, markup2: string? = null, is_expandable: bool = false)
            var node = new Json.Node(Json.NodeType.VALUE)
            node.set_int(data)
            append(node, search, markup1, markup2, is_expandable)

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
                            if !_store.iter_next(ref iter)
                                break
                else
                    _combo_box.active = -1
        
        def append(value: Variant, label: string)
            iter: TreeIter
            _store.append(out iter)
            _store.set(iter, 0, value, 1, label, -1)

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
                            if !_store.iter_next(ref iter)
                                break
                else
                    active = -1
        
        def append(style: Style)
            iter: TreeIter
            _store.append(out iter)
            _store.set(iter, 0, style, 1, style.label, -1)
            
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
                if !in_selection
                    selection.unselect_all()
                    if clicked_path is not null
                        // Select and act on only one item
                        selection.select_path(clicked_path)
                right_click(e)
                return true

            // Regular click
            else if (e.button == 1) && ((e.state & (Gdk.ModifierType.CONTROL_MASK|Gdk.ModifierType.SHIFT_MASK)) == 0)
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
