[indent=4]

uses
    Gtk
    JsonUtil

namespace Khovsgol.Client.GTK

    class Playlist: Alignment
        construct(instance: Instance)
            _instance = instance
            _accel_group = new AccelGroup()

            unrealize.connect(on_unrealized)

            // Popup menus
            
            _popup_empty = new Gtk.Menu()
            _popup_empty.append(create_import_menu())
            _popup_empty.show_all()

            _popup_none = new Gtk.Menu()
            var item = new Gtk.MenuItem.with_mnemonic("_Clear playlist")
            item.activate.connect(on_clear)
            _popup_none.append(item)
            item = new Gtk.MenuItem.with_mnemonic("_Save playlist")
            item.activate.connect(on_save_as_compilation)
            _popup_none.append(item)
            _popup_none.append(new SeparatorMenuItem())
            _popup_none.append(create_import_menu())
            _popup_none.append(create_export_menu())
            _popup_none.show_all()

            _popup_one = new Gtk.Menu()
            item = new Gtk.MenuItem.with_mnemonic("_Play this track")
            item.activate.connect(on_play)
            _popup_one.append(item)
            item = new Gtk.MenuItem.with_mnemonic("_Move this track to after the currently playing track")
            item.activate.connect(on_move_to_cursor)
            _popup_one.append(item)
            item = new Gtk.MenuItem.with_mnemonic("_Remove this track from playlist")
            item.activate.connect(on_delete)
            _popup_one.append(item)
            _popup_one.append(new SeparatorMenuItem())
            item = new Gtk.MenuItem.with_mnemonic("_Clear playlist")
            item.activate.connect(on_clear)
            _popup_one.append(item)
            item = new Gtk.MenuItem.with_mnemonic("_Save playlist")
            item.activate.connect(on_save_as_compilation)
            _popup_one.append(item)
            _popup_one.append(new SeparatorMenuItem())
            _popup_one.append(create_import_menu())
            _popup_one.append(create_export_menu())
            _popup_one.show_all()

            _popup_many = new Gtk.Menu()
            item = new Gtk.MenuItem.with_mnemonic("_Move these tracks to after the currently playing track")
            item.activate.connect(on_move_to_cursor)
            _popup_many.append(item)
            item = new Gtk.MenuItem.with_mnemonic("_Remove these tracks from playlist")
            item.activate.connect(on_delete)
            _popup_many.append(item)
            _popup_many.append(new SeparatorMenuItem())
            item = new Gtk.MenuItem.with_mnemonic("_Clear playlist")
            item.activate.connect(on_clear)
            _popup_many.append(item)
            item = new Gtk.MenuItem.with_mnemonic("_Save playlist")
            item.activate.connect(on_save_as_compilation)
            _popup_many.append(item)
            _popup_many.append(new SeparatorMenuItem())
            _popup_many.append(create_import_menu())
            _popup_many.append(create_export_menu())
            _popup_many.show_all()
            
            // Main

            var title_renderer = new CellRendererText()
            title_renderer.ellipsize = Pango.EllipsizeMode.END

            var duration_renderer = new CellRendererText()
            duration_renderer.xalign = 1
            duration_renderer.alignment = Pango.Alignment.RIGHT
            
            var progress_renderer = new CellRendererProgress()
            progress_renderer.width = 70

            //var column = new TreeViewColumn.with_area(new MyCellArea())
            var column = new TreeViewColumn()
            column.pack_start(title_renderer, true)
            column.pack_start(progress_renderer, false)
            column.pack_start(duration_renderer, false)

            column.add_attribute(title_renderer, "markup", Column.TITLE)

            column.set_cell_data_func(title_renderer, on_title_render)
            column.set_cell_data_func(duration_renderer, on_duration_render)
            column.set_cell_data_func(progress_renderer, on_progress_render)

            // node, position, search, title_markup, duration_markup, rtl
            _store = new ListStore(6, typeof(Json.Node), typeof(int), typeof(string), typeof(string), typeof(string), typeof(bool))

            _tree_view = new ClickableDraggableTreeView()
            _tree_view.model = _store
            _tree_view.headers_visible = false
            _tree_view.get_selection().mode = SelectionMode.MULTIPLE
            _tree_view.set_row_separator_func(on_row_separator)
            _tree_view.append_column(column)
            _tree_view.search_column = 1
            _tree_view.enable_model_drag_source(Gdk.ModifierType.BUTTON1_MASK, DRAG_TARGETS, Gdk.DragAction.DEFAULT|Gdk.DragAction.MOVE|Gdk.DragAction.LINK)
            _tree_view.enable_model_drag_dest(DROP_TARGETS, Gdk.DragAction.DEFAULT|Gdk.DragAction.MOVE)
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
            _mode_box.append("playlist", "Play entire list")
            _mode_box.append("album", "Stop after album")
            _mode_box.append("track", "Stop after track")
            _mode_box.append("repeat_playlist", "Repeat playlist")
            _mode_box.append("repeat_album", "Repeat album")
            _mode_box.append("repeat_track", "Repeat track")
            _mode_box.append("shuffle", "Shuffle")
            _mode_box.append("repeat_shuffle", "Keep shuffling")
            _on_cursor_mode_id = _mode_box.combo_box.changed.connect(on_cursor_mode)

            _style_box = new StyleComboBox()
            _style_box.append(new GroupByAlbums())
            _style_box.append(new Compact())
            _style_box.append(new Extended())
            var style = _instance.configuration.playlist_style
            if style is not null
                _style_box.active_style_name = style
            if _style_box.active_style_name is null
                _style_box.active_style_name = "group_by_albums"
            _style_box.changed.connect(on_style)

            var actions_button = new Button()
            actions_button.image = new Image.from_stock(Stock.EXECUTE, IconSize.BUTTON)
            actions_button.relief = ReliefStyle.NONE
            actions_button.tooltip_text = "Playlist actions"
            actions_button.button_press_event.connect(on_actions)
            
            var bottom_box = new Box(Orientation.HORIZONTAL, 5)
            bottom_box.pack_start(_mode_box)
            bottom_box.pack_start(_style_box)
            bottom_box.pack_start(actions_button, false)

            // Assemble

            var box = new Box(Orientation.VERTICAL, 10)
            box.pack_start(tree_frame)
            box.pack_start(bottom_box, false)
            
            add(box)
            set(0, 0, 1, 1)
            
            _instance.configuration.show_duration_change.connect(on_show_duration_changed)
            _instance.configuration.subdue_lossy_change.connect(on_subdue_lossy_changed)
            
            var api = (API) _instance.api
            api.cursor_mode_change_gdk.connect(on_cursor_mode_changed)
            api.play_mode_change_gdk.connect(on_play_mode_changed)
            api.playlist_change_gdk.connect(on_playlist_changed)
            api.position_in_playlist_change_gdk.connect(on_position_in_playlist_changed)
            api.position_in_track_change_gdk.connect(on_position_in_track_changed)

        prop readonly accel_group: AccelGroup
        
        def initial_focus()
            _tree_view.grab_focus()
        
        def private on_unrealized()
            _instance.configuration.show_duration_change.disconnect(on_show_duration_changed)
            _instance.configuration.subdue_lossy_change.disconnect(on_subdue_lossy_changed)

            var api = (API) _instance.api
            api.cursor_mode_change_gdk.disconnect(on_cursor_mode_changed)
            api.play_mode_change_gdk.disconnect(on_play_mode_changed)
            api.playlist_change_gdk.disconnect(on_playlist_changed)
            api.position_in_playlist_change_gdk.disconnect(on_position_in_playlist_changed)
            api.position_in_track_change_gdk.disconnect(on_position_in_track_changed)
            
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
            
        def private on_progress_render(layout: CellLayout, renderer: CellRenderer, model: TreeModel, iter: TreeIter)
            position: Value
            _store.get_value(iter, Column.POSITION, out position)
            if _position_in_playlist == (int) position
                renderer.visible = true

                var progress = (CellRendererProgress) renderer
                if (_position_in_track != double.MIN) and (_track_duration != double.MIN)
                    var percent = (_position_in_track / _track_duration) * 100.0
                    progress.value = (int) percent
                    progress.text = first_upper(_play_mode)
                else
                    progress.value = 0
                    progress.text = "Stopped"
            else
                renderer.visible = false
            
        def private on_row_separator(mode: TreeModel, iter: TreeIter): bool
            position: Value
            _store.get_value(iter, Column.POSITION, out position)
            return position == SEPARATOR_POSITION
        
        def private on_double_clicked(e: Gdk.EventButton)
            on_play()

        def private on_right_clicked(e: Gdk.EventButton)
            on_actions(e)

        def private on_key_pressed(e: Gdk.EventKey): bool
            var keyval = e.keyval
            if keyval == Gdk.Key.Menu
                iter: TreeIter
                if _store.get_iter_first(out iter)
                    var selections = get_selected_positions().get_length()
                    if selections == 0
                        _popup_none.popup(null, null, null, 0, e.time)
                    else if selections == 1
                        _popup_one.popup(null, null, null, 0, e.time)
                    else
                        _popup_many.popup(null, null, null, 0, e.time)
                else
                    _popup_empty.popup(null, null, null, 0, e.time)
            else if keyval == Gdk.Key.Delete
                on_delete()
            return false
 
        def private on_dragged(context: Gdk.DragContext, selection_data: SelectionData, info: uint, time: uint)
            var target = selection_data.get_target()
            if info == TargetInfo.JSON_NUMBER_ARRAY
                // Playlist positions moved within the playlist
                var data = get_selected_positions()
                selection_data.@set(target, 8, array_to(data).data)
                
            else
                // Track paths, likely dragged to a playlist in the library pane
                var data = get_selected_paths()
                selection_data.@set(target, 8, array_to(data).data)
        
        def private on_dropped(context: Gdk.DragContext, x: int, y: int, selection_data: SelectionData, info: uint, time: uint)
            tree_path: TreePath
            drop_position: TreeViewDropPosition
            destination: int = int.MIN
            if _tree_view.get_dest_row_at_pos(x, y, out tree_path, out drop_position)
                iter: TreeIter
                if _store.get_iter(out iter, tree_path)
                    destination = get_first_position(iter)
                    if (drop_position == TreeViewDropPosition.AFTER) or (drop_position == TreeViewDropPosition.INTO_OR_AFTER)
                        destination++
            
            if info == TargetInfo.JSON_NUMBER_ARRAY
                // Playlist positions moved within the playlist
                var text = (string) selection_data.get_data()
                if text is not null
                    try
                        var positions = from_array(text)
                        API.in_gdk = true
                        _instance.api.move_in_playlist(destination, positions, null, true)
                        API.in_gdk = false
                        Gdk.drop_finish(context, true, time)
                    except e: GLib.Error
                        _logger.exception(e)

            else if info == TargetInfo.JSON_STRING_ARRAY
                // Track paths, likely from the library pane
                var text = (string) selection_data.get_data()
                if text is not null
                    try
                        var tracks = from_array(text)
                        API.in_gdk = true
                        _instance.api.add_to_playlist(destination, tracks, null, true)
                        API.in_gdk = false
                        Gdk.drop_finish(context, true, time)
                    except e: GLib.Error
                        _logger.exception(e)
            else
                Gdk.drop_finish(context, false, time)

        def private on_actions(e: Gdk.EventButton): bool
            iter: TreeIter
            if _store.get_iter_first(out iter)
                var selections = get_selected_positions().get_length()
                if selections == 0
                    _popup_none.popup(null, null, null, e.button, e.time)
                else if selections == 1
                    _popup_one.popup(null, null, null, e.button, e.time)
                else
                    _popup_many.popup(null, null, null, e.button, e.time)
            else
                _popup_empty.popup(null, null, null, e.button, e.time)
            return false
            
        _on_cursor_mode_id: ulong
        def private on_cursor_mode()
            _instance.api.set_cursor_mode((string) _mode_box.active)
        
        def private on_style()
            var style = _style_box.active_style
            if (style is not null) and (style.name != _instance.configuration.playlist_style)
                _instance.configuration.playlist_style = style.name
                _instance.configuration.save()
            update()
            
        def private on_play()
            var position = get_first_selected_position()
            if position != int.MIN
                if _position_in_playlist != position
                    _instance.api.set_position_in_playlist(position)
                else
                    _instance.api.set_position_in_track(0)
        
        def private on_move_to_cursor()
            pass
        
        def private on_delete()
            var positions = get_selected_positions()
            if positions.get_length() > 0
                API.in_gdk = true
                _instance.api.remove_from_playlist(positions, null, true)
                API.in_gdk = false
        
        def private on_clear()
            API.in_gdk = true
            _instance.api.set_playlist_paths(new Json.Array(), null, true)
            API.in_gdk = false

        def private on_save_as_compilation()
            if _tracks.to_json().get_length() > 0
                var dialog = new SavePlaylist(_instance.window)
                if dialog.@do()
                    var title = dialog.playlist_name
                    if title.length > 0
                        var album_path = "*" + GLib.DBus.generate_guid()
                        var paths = new Json.Array()
                        for var track in _tracks
                            var path = track.path
                            if path is not null
                                paths.add_string_element(path)
                        _instance.api.create_album(album_path, title, "main", paths)
        
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
            SignalHandler.block(_mode_box.combo_box, _on_cursor_mode_id)
            _mode_box.active = cursor_mode
            SignalHandler.unblock(_mode_box.combo_box, _on_cursor_mode_id)

        def private on_play_mode_changed(play_mode: string?, old_play_mode: string?)
            _play_mode = play_mode
            refresh_row(_position_in_playlist)
                    
        def private on_playlist_changed(id: string?, version: int64, old_id: string?, old_version: int64, tracks: IterableOfTrack, albums: IterableOfAlbum)
            _tracks = tracks
            _albums = albums
            update()
        
        def private on_position_in_playlist_changed(position_in_playlist: int, old_position_in_playlist: int)
            _position_in_playlist = position_in_playlist
            refresh_row(old_position_in_playlist)
            refresh_row(position_in_playlist)
        
        def private on_position_in_track_changed(position_in_track: double, old_position_in_track: double, track_duration: double)
            _position_in_track = position_in_track
            _track_duration = track_duration
            refresh_row(_position_in_playlist)
                
        def private on_show_duration_changed(value: bool)
            update()

        def private on_subdue_lossy_changed(value: bool)
            update()
       
        def private update()
            _tree_view.freeze_child_notify()
            _tree_view.model = null
            _store.clear()
            if _tracks is not null
                var style = (PlaylistStyle) _style_box.active_style
                if style is not null
                    var node = new PlaylistNode(_instance, _tree_view, _store, _tracks, _albums)
                    style.fill(node)
            _tree_view.model = _store
            _tree_view.thaw_child_notify()
            
        def private refresh_row(position: int)
            if position == int.MIN
                return
            iter: TreeIter
            value: Value
            if _store.get_iter_first(out iter)
                while true
                    _store.get_value(iter, Column.POSITION, out value)
                    if position == (int) value
                        _store.row_changed(_store.get_path(iter), iter)
                        break
                    if not _store.iter_next(ref iter)
                        break

        def private get_selected_positions(): Json.Array
            var positions = new Json.Array()
            var style = (PlaylistStyle) _style_box.active_style
            if style is not null
                var selection = _tree_view.get_selection()
                var tree_paths = selection.get_selected_rows(null)
                iter: TreeIter
                for var tree_path in tree_paths
                    if _store.get_iter(out iter, tree_path)
                        var node = new PlaylistNode(_instance, _tree_view, _store, _tracks, _albums, iter)
                        style.gather_positions(node, ref positions)
            return positions

        def private get_selected_paths(): Json.Array
            var paths = new Json.Array()
            var style = (PlaylistStyle) _style_box.active_style
            if style is not null
                var selection = _tree_view.get_selection()
                var tree_paths = selection.get_selected_rows(null)
                iter: TreeIter
                for var tree_path in tree_paths
                    if _store.get_iter(out iter, tree_path)
                        var node = new PlaylistNode(_instance, _tree_view, _store, _tracks, _albums, iter)
                        style.gather_paths(node, ref paths)
            return paths

        def private get_first_selected_position(): int
            var selection = _tree_view.get_selection()
            var tree_paths = selection.get_selected_rows(null)
            iter: TreeIter
            for var tree_path in tree_paths
                if _store.get_iter(out iter, tree_path)
                    return get_first_position(iter)
            return int.MIN

        def private get_first_position(iter: TreeIter): int
            var style = (PlaylistStyle) _style_box.active_style
            if style is not null
                var node = new PlaylistNode(_instance, _tree_view, _store, _tracks, _albums, iter)
                var position = style.get_first_position(node)
                if position != int.MIN
                    return position
            return int.MIN
        
        def private create_import_menu(): Gtk.MenuItem
            var submenu = new Gtk.Menu()
            var item = new Gtk.MenuItem.with_mnemonic("From _XSPF file...")
            item.activate.connect(on_import_xspf)
            submenu.append(item)
            item = new Gtk.MenuItem.with_mnemonic("From _PLS file...")
            item.activate.connect(on_import_pls)
            submenu.append(item)
            item = new Gtk.MenuItem.with_mnemonic("From _M3U file...")
            item.activate.connect(on_import_m3u)
            submenu.append(item)
            item = new Gtk.MenuItem.with_mnemonic("_Import playlist...")
            item.submenu = submenu
            return item

        def private create_export_menu(): Gtk.MenuItem
            var submenu = new Gtk.Menu()
            var item = new Gtk.MenuItem.with_mnemonic("To _XSPF file...")
            item.activate.connect(on_export_xspf)
            submenu.append(item)
            item = new Gtk.MenuItem.with_mnemonic("To _PLS file...")
            item.activate.connect(on_export_pls)
            submenu.append(item)
            item = new Gtk.MenuItem.with_mnemonic("To _M3U file...")
            item.activate.connect(on_export_m3u)
            submenu.append(item)
            item = new Gtk.MenuItem.with_mnemonic("_Export playlist...")
            item.submenu = submenu
            return item
        
        _instance: Instance
        _store: ListStore
        _tree_view: ClickableDraggableTreeView
        _mode_box: SimpleComboBox
        _style_box: StyleComboBox
        _popup_empty: Gtk.Menu
        _popup_none: Gtk.Menu
        _popup_one: Gtk.Menu
        _popup_many: Gtk.Menu
        _play_mode: string
        _position_in_playlist: int = int.MIN
        _position_in_track: double = double.MIN
        _track_duration: double = double.MIN
        _tracks: IterableOfTrack?
        _albums: IterableOfAlbum?
        
        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.playlist")
            
        enum private Column
            NODE = 0     // Json.Node
            POSITION = 1 // int
            SEARCH = 2   // string
            TITLE = 3    // string
            DURATION = 4 // string
            RTL = 5      // bool

        const private SEPARATOR_POSITION: int = -1

        const private DRAG_TARGETS: array of TargetEntry = {
            {"JSON_NUMBER_ARRAY", TargetFlags.SAME_WIDGET, TargetInfo.JSON_NUMBER_ARRAY},
            {"JSON_STRING_ARRAY", TargetFlags.SAME_APP,    TargetInfo.JSON_STRING_ARRAY},
            {"TEXT",              TargetFlags.OTHER_APP,   TargetInfo.TEXT},
            {"STRING",            TargetFlags.OTHER_APP,   TargetInfo.STRING},
            {"text/plain",        TargetFlags.OTHER_APP,   TargetInfo.TEXT_PLAIN}}

        const private DROP_TARGETS: array of TargetEntry = {
            {"JSON_NUMBER_ARRAY", TargetFlags.SAME_WIDGET, TargetInfo.JSON_NUMBER_ARRAY},
            {"JSON_STRING_ARRAY", TargetFlags.SAME_APP,    TargetInfo.JSON_STRING_ARRAY}}
        
        class private SavePlaylist: Dialog
            construct(parent: Window)
                title = "Save Playlist"
                transient_for = parent
                destroy_with_parent = true
                modal = true
                
                _name_box = new EntryBox("Playlist _name:")
                _name_box.entry.activate.connect(on_activate)
                var library = new SimpleComboBox()
                //for l in libraries:
                //    library.append_text(l['name'])
                //library.set_active(0)
                var library_label = new Label.with_mnemonic("_Library:")
                library_label.mnemonic_widget = library
                var library_box = new Box(Orientation.HORIZONTAL, 5)
                library_box.pack_start(library_label)
                library_box.pack_start(library)
                var box = new Box(Orientation.VERTICAL, 10)
                box.pack_start(_name_box)
                box.pack_start(library_box)
                var alignment = new Alignment(0, 0, 1, 0)
                alignment.set_padding(20, 20, 20, 20)
                alignment.add(box)
                get_content_area().pack_start(alignment)
                set_default_size(400, -1)
                
                add_button(Stock.CANCEL, ResponseType.CANCEL)
                add_button(Stock.OK, ResponseType.OK)
                set_default_response(ResponseType.OK)
                
            prop readonly playlist_name: string

            def @do(): bool
                show_all()
                var response = run()
                if response == ResponseType.OK
                    _playlist_name = _name_box.entry.text.strip()
                destroy()
                return response == ResponseType.OK
            
            def private on_activate()
                response(ResponseType.OK)

            _name_box: EntryBox
