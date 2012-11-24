[indent=4]

uses
    Gtk

namespace Khovsgol.GUI

    //def get_stock_icon_pixbuf(window, name):
      //  return window.render_icon(getattr(Gtk, 'STOCK_' + name), Gtk.IconSize.MENU, None)

    interface Style: GLib.Object
        prop abstract readonly name: string
        prop abstract readonly label: string

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
