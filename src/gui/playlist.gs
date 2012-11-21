[indent=4]

uses
    Gtk
    Khovsgol

namespace Khovsgol.GUI

    class PlayList: Alignment
        construct(instance: Instance)
            _instance = instance
            _accel_group = new AccelGroup()

            unrealize.connect(on_unrealize)

            // Popup menus
            
            _popup_empty = new Gtk.Menu()
            _popup_empty.append(create_import_menu())
            _popup_empty.show_all()

            _popup_none = new Gtk.Menu()
            var item = new Gtk.MenuItem.with_mnemonic("Clear playlist")
            item.activate.connect(on_clear)
            _popup_none.append(item)
            item = new Gtk.MenuItem.with_mnemonic("Save playlist as compilation")
            item.activate.connect(on_save_as_compilation)
            _popup_none.append(item)
            _popup_none.append(new SeparatorMenuItem())
            _popup_none.append(create_import_menu())
            _popup_none.append(create_export_menu())
            _popup_none.show_all()

            _popup_one = new Gtk.Menu()
            item = new Gtk.MenuItem.with_mnemonic("Play this track")
            item.activate.connect(on_play)
            _popup_one.append(item)
            item = new Gtk.MenuItem.with_mnemonic("Move this track to after the currently playing track")
            item.activate.connect(on_move_to_cursor)
            _popup_one.append(item)
            item = new Gtk.MenuItem.with_mnemonic("Remove this track from playlist")
            item.activate.connect(on_delete)
            _popup_one.append(item)
            _popup_one.append(new SeparatorMenuItem())
            item = new Gtk.MenuItem.with_mnemonic("Clear playlist")
            item.activate.connect(on_clear)
            _popup_one.append(item)
            item = new Gtk.MenuItem.with_mnemonic("Save playlist as compilation")
            item.activate.connect(on_save_as_compilation)
            _popup_one.append(item)
            _popup_one.append(new SeparatorMenuItem())
            _popup_one.append(create_import_menu())
            _popup_one.append(create_export_menu())
            _popup_one.show_all()

            _popup_many = new Gtk.Menu()
            item = new Gtk.MenuItem.with_mnemonic("Move these tracks to after the currently playing track")
            item.activate.connect(on_move_to_cursor)
            _popup_many.append(item)
            item = new Gtk.MenuItem.with_mnemonic("Remove these tracks from playlist")
            item.activate.connect(on_delete)
            _popup_many.append(item)
            _popup_many.append(new SeparatorMenuItem())
            item = new Gtk.MenuItem.with_mnemonic("Clear playlist")
            item.activate.connect(on_clear)
            _popup_many.append(item)
            item = new Gtk.MenuItem.with_mnemonic("Save playlist as compilation")
            item.activate.connect(on_save_as_compilation)
            _popup_many.append(item)
            _popup_many.append(new SeparatorMenuItem())
            _popup_many.append(create_import_menu())
            _popup_many.append(create_export_menu())
            _popup_many.show_all()
            
            // Main

            var progress_renderer = new CellRendererProgress()
            progress_renderer.width = 70

            var renderer1 = new CellRendererText()
            renderer1.ellipsize = Pango.EllipsizeMode.END // This also mysteriously enables right alignment for RTL text
            var renderer2 = new CellRendererText()
            renderer2.xalign = 1
            renderer2.alignment = Pango.Alignment.RIGHT
            var column = new TreeViewColumn()
            column.pack_start(renderer1, true)
            column.pack_start(renderer2, false)
            column.pack_start(progress_renderer, false)
            column.add_attribute(renderer1, "markup", 2)
            column.add_attribute(renderer2, "markup", 3)
            column.set_cell_data_func(progress_renderer, on_progress_render)
            column.set_cell_data_func(renderer2, on_markup2_render)

            // object, search, markup1, markup2, position
            _store = new ListStore(5, typeof(Object), typeof(string), typeof(string), typeof(string), typeof(uint))

            _tree_view = new TreeView.with_model(_store)
            _tree_view.headers_visible = false
            _tree_view.get_selection().mode = SelectionMode.MULTIPLE
            _tree_view.set_row_separator_func(on_row_separator)
            _tree_view.append_column(column)
            _tree_view.search_column = 1
            _tree_view.enable_model_drag_source(Gdk.ModifierType.BUTTON1_MASK, DRAG_TARGETS, Gdk.DragAction.LINK|Gdk.DragAction.MOVE)
            _tree_view.enable_model_drag_dest(DROP_TARGETS, Gdk.DragAction.LINK|Gdk.DragAction.MOVE)
            //clickable_draggable_treeview(self.tree_view, self.on_right_clicked, self.on_double_clicked)
            _tree_view.key_press_event.connect(on_key_pressed)
            _tree_view.drag_data_get.connect(on_dragged)
            _tree_view.drag_data_received.connect(on_dropped)
            var tree_scrolled = new ScrolledWindow(null, null)
            tree_scrolled.add(_tree_view)
            var tree_frame = new Frame(null)
            tree_frame.add(tree_scrolled)

            // Bottom

            var mode_box = new SimpleComboBox()
            mode_box.append("play_list", "Play entire list")
            mode_box.append("album", "Stop after album")
            mode_box.append("track", "Stop after track")
            mode_box.append("repeat_play_list", "Repeat playlist")
            mode_box.append("repeat_album", "Repeat album")
            mode_box.append("repeat_track", "Repeat track")
            mode_box.append("shuffle", "Shuffle")
            mode_box.append("repeat_shuffle", "Keep shuffling")

            /*self.mode_combo_box = mode_box #.get_children()[1]
            self.mode_combo_box.connect('changed', self.on_mode_changed)

            style_box = self._create_style_combo_box(GroupByAlbums(), Compact(), Extended())*/

            var actions_button = new Button()
            actions_button.image = new Image.from_stock(Stock.EXECUTE, IconSize.BUTTON)
            actions_button.relief = ReliefStyle.NONE
            actions_button.tooltip_text = "Playlist actions"
            actions_button.button_press_event.connect(on_actions)
            
            var bottom_box = new Box(Orientation.HORIZONTAL, 5)
            bottom_box.pack_start(mode_box)
            //bottom_box.pack_start(style_box)
            bottom_box.pack_start(actions_button, false)

            // Assemble

            var box = new Box(Orientation.VERTICAL, 10)
            box.pack_start(tree_frame)
            box.pack_start(bottom_box, false)
            
            add(box)
            set(0, 0, 1, 1)
            
            _instance.api.cursor_mode_change_gdk.connect(on_cursor_mode_change)

        prop readonly accel_group: AccelGroup
        
        def private create_import_menu(): Gtk.MenuItem
            var submenu = new Gtk.Menu()
            var item = new Gtk.MenuItem.with_mnemonic("From XSPF file...")
            item.activate.connect(on_import_xspf)
            submenu.append(item)
            item = new Gtk.MenuItem.with_mnemonic("From PLS file...")
            item.activate.connect(on_import_pls)
            submenu.append(item)
            item = new Gtk.MenuItem.with_mnemonic("From M3U file...")
            item.activate.connect(on_import_m3u)
            submenu.append(item)
            item = new Gtk.MenuItem.with_mnemonic("Import playlist...")
            item.submenu = submenu
            return item

        def private create_export_menu(): Gtk.MenuItem
            var submenu = new Gtk.Menu()
            var item = new Gtk.MenuItem.with_mnemonic("To XSPF file...")
            item.activate.connect(on_export_xspf)
            submenu.append(item)
            item = new Gtk.MenuItem.with_mnemonic("To PLS file...")
            item.activate.connect(on_export_pls)
            submenu.append(item)
            item = new Gtk.MenuItem.with_mnemonic("To M3U file...")
            item.activate.connect(on_export_m3u)
            submenu.append(item)
            item = new Gtk.MenuItem.with_mnemonic("Export playlist...")
            item.submenu = submenu
            return item
            
        def private on_unrealize()
            _instance.api.cursor_mode_change_gdk.disconnect(on_cursor_mode_change)
        
        def private on_progress_render(layout: CellLayout, renderer: CellRenderer, model: TreeModel, iter: TreeIter)
            pass
            
        def private on_markup2_render(layout: CellLayout, renderer: CellRenderer, model: TreeModel, iter: TreeIter)
            pass
            
        def private on_row_separator(mode: TreeModel, iter: TreeIter): bool
            return false

        def private on_key_pressed(event: Gdk.EventKey): bool
            return false
 
        def private on_dragged(context: Gdk.DragContext, selection_data: SelectionData, info: uint, time: uint)
            pass
        
        def private on_dropped(context: Gdk.DragContext, x: int, y: int, selection_data: SelectionData, info: uint, time: uint)
            pass

        def private on_actions(event: Gdk.EventButton): bool
            return false
        
        def private on_play()
            pass
        
        def private on_move_to_cursor()
            pass
        
        def private on_delete()
            pass
        
        def private on_clear()
            pass
        
        def private on_save_as_compilation()
            pass
        
        def private on_import_xspf()
            pass
        
        def private on_import_pls()
            pass
        
        def private on_import_m3u()
            pass
        
        def private on_export_xspf()
            pass
        
        def private on_export_pls()
            pass
        
        def private on_export_m3u()
            pass

        def private on_cursor_mode_change(cursor_mode: string?, old_cursor_mode: string?)
            print cursor_mode
            
        _instance: Instance
        _store: ListStore
        _tree_view: TreeView
        _popup_empty: Gtk.Menu
        _popup_none: Gtk.Menu
        _popup_one: Gtk.Menu
        _popup_many: Gtk.Menu

        const DRAG_TARGETS: array of TargetEntry = {
            {"JSON_NUMBER_ARRAY", TargetFlags.SAME_WIDGET, 0},
            {"JSON_STRING_ARRAY", TargetFlags.SAME_APP, 1},
            {"TEXT", 0, 2},
            {"STRING", 0, 3},
            {"text/plain", 0, 4}}

        const DROP_TARGETS: array of TargetEntry = {
            {"JSON_NUMBER_ARRAY", TargetFlags.SAME_WIDGET, 0},
            {"JSON_STRING_ARRAY", TargetFlags.SAME_APP, 1}}
