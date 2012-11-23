[indent=4]

uses
    Gtk
    JsonUtil
    Khovsgol

namespace Khovsgol.GUI

    class PlayList: Alignment
        construct(instance: Instance)
            _instance = instance
            _accel_group = new AccelGroup()

            unrealize.connect(on_unrealized)

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
            column.add_attribute(renderer1, "markup", Column.MARKUP1)
            column.add_attribute(renderer2, "markup", Column.MARKUP2)
            column.set_cell_data_func(progress_renderer, on_progress_render)
            column.set_cell_data_func(renderer2, on_markup2_render)

            // object, search, markup1, markup2, position
            _store = new ListStore(5, typeof(Json.Object), typeof(string), typeof(string), typeof(string), typeof(int))

            _tree_view = new ClickableDraggableTreeView()
            _tree_view.model = _store
            _tree_view.headers_visible = false
            _tree_view.get_selection().mode = SelectionMode.MULTIPLE
            _tree_view.set_row_separator_func(on_row_separator)
            _tree_view.append_column(column)
            _tree_view.search_column = 1
            _tree_view.enable_model_drag_source(Gdk.ModifierType.BUTTON1_MASK, DRAG_TARGETS, Gdk.DragAction.LINK|Gdk.DragAction.MOVE)
            _tree_view.enable_model_drag_dest(DROP_TARGETS, Gdk.DragAction.LINK|Gdk.DragAction.MOVE)
            _tree_view.double_click.connect(on_double_clicked)
            _tree_view.right_click.connect(on_right_clicked)
            _tree_view.key_press_event.connect(on_key_pressed)
            _tree_view.drag_data_get.connect(on_dragged)
            _tree_view.drag_data_received.connect(on_dropped)
            var tree_scrolled = new ScrolledWindow(null, null)
            tree_scrolled.add(_tree_view)
            var tree_frame = new Frame(null)
            tree_frame.add(tree_scrolled)

            // Bottom

            _mode_box = new SimpleComboBox()
            _mode_box.append("play_list", "Play entire list")
            _mode_box.append("album", "Stop after album")
            _mode_box.append("track", "Stop after track")
            _mode_box.append("repeat_play_list", "Repeat playlist")
            _mode_box.append("repeat_album", "Repeat album")
            _mode_box.append("repeat_track", "Repeat track")
            _mode_box.append("shuffle", "Shuffle")
            _mode_box.append("repeat_shuffle", "Keep shuffling")
            _on_cursor_mode_id = _mode_box.combo_box.changed.connect(on_cursor_mode)

            /*self.mode_combo_box = mode_box #.get_children()[1]
            self.mode_combo_box.connect('changed', self.on_mode_changed)

            style_box = self._create_style_combo_box(GroupByAlbums(), Compact(), Extended())*/

            var actions_button = new Button()
            actions_button.image = new Image.from_stock(Stock.EXECUTE, IconSize.BUTTON)
            actions_button.relief = ReliefStyle.NONE
            actions_button.tooltip_text = "Playlist actions"
            actions_button.button_press_event.connect(on_actions)
            
            var bottom_box = new Box(Orientation.HORIZONTAL, 5)
            bottom_box.pack_start(_mode_box)
            //bottom_box.pack_start(style_box)
            bottom_box.pack_start(actions_button, false)

            // Assemble

            var box = new Box(Orientation.VERTICAL, 10)
            box.pack_start(tree_frame)
            box.pack_start(bottom_box, false)
            
            add(box)
            set(0, 0, 1, 1)
            
            _instance.api.cursor_mode_change_gdk.connect(on_cursor_mode_changed)
            _instance.api.play_mode_change_gdk.connect(on_play_mode_changed)
            _instance.api.play_list_change_gdk.connect(on_play_list_changed)
            _instance.api.position_in_play_list_change_gdk.connect(on_position_in_play_list_changed)
            _instance.api.position_in_track_change_gdk.connect(on_position_in_track_changed)

        prop readonly accel_group: AccelGroup
        
        def private on_unrealized()
            _instance.api.cursor_mode_change_gdk.disconnect(on_cursor_mode_changed)
            _instance.api.play_mode_change_gdk.disconnect(on_play_mode_changed)
            _instance.api.play_list_change_gdk.disconnect(on_play_list_changed)
            _instance.api.position_in_play_list_change_gdk.disconnect(on_position_in_play_list_changed)
            _instance.api.position_in_track_change_gdk.disconnect(on_position_in_track_changed)
       
        def private on_progress_render(layout: CellLayout, renderer: dynamic CellRenderer, model: TreeModel, iter: TreeIter)
            position: Value
            _store.get_value(iter, Column.POSITION, out position)
            if _position_in_play_list == (int) position
                renderer.visible = true
                if (_position_in_track != double.MIN) && (_track_duration != double.MIN)
                    var percent = (_position_in_track / _track_duration) * 100.0
                    renderer.value = percent
                    renderer.text = _play_mode
                else
                    renderer.value = 0
                    renderer.text = "Stopped"
            else
                renderer.visible = false
            
        def private on_markup2_render(layout: CellLayout, renderer: CellRenderer, model: TreeModel, iter: TreeIter)
            pass
            
        def private on_row_separator(mode: TreeModel, iter: TreeIter): bool
            return false
        
        def private on_double_clicked(e: Gdk.EventButton)
            pass

        def private on_right_clicked(e: Gdk.EventButton)
            iter: TreeIter
            if _store.get_iter_first(out iter)
                var selections = _tree_view.get_selection().count_selected_rows()
                if selections == 0
                    _popup_none.popup(null, null, null, e.button, e.time)
                else if selections == 1
                    _popup_one.popup(null, null, null, e.button, e.time)
                else
                    _popup_many.popup(null, null, null, e.button, e.time)
            else
                _popup_empty.popup(null, null, null, e.button, e.time)

        def private on_key_pressed(e: Gdk.EventKey): bool
            if e.keyval == Gdk.Key.Menu
                iter: TreeIter
                if _store.get_iter_first(out iter)
                    var selections = _tree_view.get_selection().count_selected_rows()
                    if selections == 0
                        _popup_none.popup(null, null, null, 0, e.time)
                    else if selections == 1
                        _popup_one.popup(null, null, null, 0, e.time)
                    else
                        _popup_many.popup(null, null, null, 0, e.time)
                else
                    _popup_empty.popup(null, null, null, 0, e.time)
            return false
 
        def private on_dragged(context: Gdk.DragContext, selection_data: SelectionData, info: uint, time: uint)
            var selection = _tree_view.get_selection()
            var tree_paths = selection.get_selected_rows(null)
            iter: TreeIter
            value: Value
            var target = selection_data.get_target()
            var target_name = target.name()
            if target_name == "JSON_NUMBER_ARRAY"
                // Playlist positions moved within the playlist
                var data = new Json.Array()
                for var tree_path in tree_paths
                    if _store.get_iter(out iter, tree_path)
                        _store.get_value(iter, Column.POSITION, out value)
                        data.add_int_element((int) value)
                selection_data.@set(target, 8, array_to(data).data)
                
            else
                // Track paths, likely to a custom compilation in the library pane
                var data = new Json.Array()
                for var tree_path in tree_paths
                    if _store.get_iter(out iter, tree_path)
                        _store.get_value(iter, Column.TRACK, out value)
                        var track = (Json.Object) value
                        if track is not null
                            var path = get_string_member_or_null(track, "path")
                            if path is not null
                                data.add_string_element(path)
                selection_data.@set(target, 8, array_to(data).data)
                    
        def private on_dropped(context: Gdk.DragContext, x: int, y: int, selection_data: SelectionData, info: uint, time: uint)
            tree_path: TreePath
            drop_position: TreeViewDropPosition
            destination: int = int.MIN
            if _tree_view.get_dest_row_at_pos(x, y, out tree_path, out drop_position)
                iter: TreeIter
                if _store.get_iter(out iter, tree_path)
                    value: Value
                    _store.get_value(iter, Column.POSITION, out value)
                    destination = (int) value
                    if (drop_position == TreeViewDropPosition.AFTER) || (drop_position == TreeViewDropPosition.INTO_OR_AFTER)
                        destination++
                    
            var target_name = selection_data.get_target().name()
            if target_name == "JSON_NUMBER_ARRAY"
                // Playlist positions moved within the playlist
                var text = (string) selection_data.get_data()
                if text is not null
                    try
                        var positions = from_array(text)
                        _instance.api.move_in_play_list(_instance.player, destination, positions, true, true)
                        Gdk.drop_finish(context, true, time)
                        return
                    except e: GLib.Error
                        pass

            else if target_name == "JSON_STRING_ARRAY"
                // Track paths, likely from the library pane
                var text = (string) selection_data.get_data()
                if text is not null
                    try
                        var tracks = from_array(text)
                        _instance.api.add_to_play_list(_instance.player, destination, tracks, true, true)
                        Gdk.drop_finish(context, true, time)
                        return
                    except e: GLib.Error
                        pass
                        
            Gdk.drop_finish(context, false, time)

        def private on_actions(e: Gdk.EventButton): bool
            return false
            
        _on_cursor_mode_id: ulong
        def private on_cursor_mode()
            _instance.api.set_cursor_mode(_instance.player, (string) _mode_box.active)
        
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
            
        def private on_cursor_mode_changed(cursor_mode: string?, old_cursor_mode: string?)
            //var v = SignalHandler.block_by_func(_mode_box.combo_box, (void*) on_cursor_mode, self)
            SignalHandler.block(_mode_box.combo_box, _on_cursor_mode_id)
            _mode_box.active = cursor_mode
            SignalHandler.unblock(_mode_box.combo_box, _on_cursor_mode_id)

        def private on_play_mode_changed(play_mode: string?, old_play_mode: string?)
            _play_mode = play_mode
                    
        def private on_play_list_changed(id: string?, version: int64, old_id: string?, old_version: int64, tracks: Json.Array?)
            if (tracks is not null) && (tracks.get_length() > 0)
                _store.clear()
                iter: TreeIter
                for var i = 0 to (tracks.get_length() - 1)
                    var track = get_object_element_or_null(tracks, i)
                    var path = get_string_member_or_null(track, "path")
                    if path is not null
                        var title = get_string_member_or_null(track, "title")
                        var title_sort = get_string_member_or_null(track, "title_sort")
                        var position = get_int_member_or_min(track, "position")
                        _store.append(out iter)
                        _store.set(iter, Column.TRACK, track, Column.SEARCH, title_sort, Column.MARKUP1, "%d\t%s".printf(position, title), Column.MARKUP2, null, Column.POSITION, position, -1)
            
        def private on_position_in_play_list_changed(position_in_play_list: int, old_position_in_play_list: int)
            _position_in_play_list = position_in_play_list
        
        def private on_position_in_track_changed(position_in_track: double, old_position_in_track: double, track_duration: double)
            _position_in_track = position_in_track
            _track_duration = track_duration
            
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
            
        _instance: Instance
        _store: ListStore
        _tree_view: ClickableDraggableTreeView
        _mode_box: SimpleComboBox
        _popup_empty: Gtk.Menu
        _popup_none: Gtk.Menu
        _popup_one: Gtk.Menu
        _popup_many: Gtk.Menu
        _play_mode: string
        _position_in_play_list: int
        _position_in_track: double
        _track_duration: double

        enum private Column
            TRACK = 0    // Json.Object
            SEARCH = 1   // string
            MARKUP1 = 2  // string
            MARKUP2 = 3  // string
            POSITION = 4 // int

        const private DRAG_TARGETS: array of TargetEntry = {
            {"JSON_NUMBER_ARRAY", TargetFlags.SAME_WIDGET, 0},
            {"JSON_STRING_ARRAY", TargetFlags.SAME_APP,    1},
            {"TEXT",              0,                       2},
            {"STRING",            0,                       3},
            {"text/plain",        0,                       4}}

        const private DROP_TARGETS: array of TargetEntry = {
            {"JSON_NUMBER_ARRAY", TargetFlags.SAME_WIDGET, 0},
            {"JSON_STRING_ARRAY", TargetFlags.SAME_APP,    1}}
