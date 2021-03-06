[indent=4]

uses
    Gtk
    JsonUtil

namespace Khovsgol.Client.GTK

    class LibraryManager: Window
        construct(instance: Instance)
            _instance = instance
            _libraries = _instance.libraries

            unrealize.connect(on_unrealized)

            // Tree view
            
            // node, icon, title_markup, status_markup, active
            _store = new TreeStore(5, typeof(Node), typeof(Gdk.Pixbuf), typeof(string), typeof(string), typeof(bool))

            var icon_renderer = new CellRendererPixbuf()
            var title_renderer = new CellRendererText()
            title_renderer.ellipsize = Pango.EllipsizeMode.END // This also mysteriously enables right alignment for RTL text
            title_renderer.mode = CellRendererMode.ACTIVATABLE // Allows the CellRendererToggle to work
            var status_renderer = new CellRendererText()
            var active_renderer = new CellRendererToggle()
            
            active_renderer.toggled.connect(on_active_toggled)

            var column = new TreeViewColumn()
            
            column.pack_start(icon_renderer, false)
            column.pack_start(title_renderer, true)
            column.pack_start(status_renderer, false)
            column.pack_start(active_renderer, false)

            column.add_attribute(icon_renderer, "pixbuf", Column.ICON)
            column.add_attribute(title_renderer, "markup", Column.TITLE)
            column.add_attribute(status_renderer, "markup", Column.STATUS)
            column.add_attribute(active_renderer, "active", Column.ACTIVE)

            column.set_cell_data_func(active_renderer, on_active_render)
            
            _tree_view = new TreeView.with_model(_store)
            _tree_view.headers_visible = false
            _tree_view.append_column(column)
            _tree_view.get_selection().changed.connect(on_selection_changed)
            var tree_scrolled = new ScrolledWindow(null, null)
            tree_scrolled.add(_tree_view)
            var tree_frame = new Frame(null)
            tree_frame.add(tree_scrolled)

            // Button box
            
            // Note: Newer GNOME desktops tend to disable image visibility by default,
            // but we will explicitly show the images because we think it's easier to
            // understand at a glance!
            
            _add_library_button = new Button.with_mnemonic("_Add library")
            _add_library_button.image = new Image.from_icon_name("gtk-cdrom", IconSize.MENU)
            _add_library_button.image.show()
            _add_library_button.clicked.connect(on_add_library)

            _remove_library_button = new Button.with_mnemonic("_Remove library")
            _remove_library_button.image = new Image.from_icon_name("gtk-remove", IconSize.MENU)
            _remove_library_button.image.show()
            _remove_library_button.sensitive = false
            _remove_library_button.clicked.connect(on_remove_library)

            _scan_button = new Button.with_mnemonic("Re_scan")
            _scan_button.image = new Image.from_icon_name("gtk-refresh", IconSize.MENU)
            _scan_button.image.show()
            _scan_button.sensitive = false
            _scan_button.clicked.connect(on_scan)

            _add_directory_button = new Button.with_mnemonic("Add _directory")
            _add_directory_button.image = new Image.from_icon_name("gtk-directory", IconSize.MENU)
            _add_directory_button.image.show()
            _add_directory_button.sensitive = false
            _add_directory_button.clicked.connect(on_add_directory)

            _remove_directory_button = new Button.with_mnemonic("R_emove directory")
            _remove_directory_button.image = new Image.from_icon_name("gtk-remove", IconSize.MENU)
            _remove_directory_button.image.show()
            _remove_directory_button.sensitive = false
            _remove_directory_button.clicked.connect(on_remove_directory)

            var button_box = new ButtonBox(Orientation.VERTICAL)
            button_box.set_layout(ButtonBoxStyle.START)
            button_box.spacing = 10
            button_box.add(_add_library_button)
            button_box.add(_remove_library_button)
            button_box.add(_scan_button)
            button_box.add(_add_directory_button)
            button_box.add(_remove_directory_button)
            button_box.set_child_secondary(_scan_button, true)
            button_box.set_child_secondary(_add_directory_button, true)
            button_box.set_child_secondary(_remove_directory_button, true)

            // Icons
            
            _library_icon = render_icon("gtk-cdrom", IconSize.MENU, null)
            _directory_icon = render_icon("gtk-directory", IconSize.MENU, null)
        
            // Assemble
            
            var bottom_box = new Box(Orientation.HORIZONTAL, 10)
            bottom_box.pack_start(tree_frame)
            bottom_box.pack_start(button_box, false)

            var label = new Label("These are the music libraries on the server. Each library can contain multiple file directories. Only the checked libraries will appear in your Khövsgöl library browser.")
            label.wrap = true
            label.set_alignment(0, 0)
            
            var main_box = new Box(Orientation.VERTICAL, 15)
            main_box.pack_start(label, false)
            main_box.pack_start(bottom_box)
            add(main_box)

            host: string
            port: uint
            _instance.api.get_connection(out host, out port)

            title = "Manage Libraries for %s:%u".printf(host, port)
            border_width = 10
            set_position(WindowPosition.CENTER_ON_PARENT)
            set_default_size(600, 300)
            transient_for = _instance.window
            destroy_with_parent = true
            
            key_press_event.connect(on_key_pressed)
            
            update()
            _update_id = Timeout.add_seconds(1, update)
            
        def private on_unrealized()
            Source.remove(_update_id)
            _instance.libraries = _libraries
            _instance.window.library.update()

        def private on_key_pressed(e: Gdk.EventKey): bool
            var keyval = e.keyval
            if keyval == Gdk.Key.Escape
                destroy()
                return true
            else
                return false
            
        def private on_add_library()
            var dialog = new AddLibrary(self)
            if dialog.@do()
                var name = dialog.library_name
                if name.length > 0
                    _instance.api.create_library(name)

        def private on_remove_library()
            var node = get_selected_node()
            if node is not null
                host: string
                port: uint
                _instance.api.get_connection(out host, out port)
                var dialog = new MessageDialog.with_markup(self, DialogFlags.DESTROY_WITH_PARENT, MessageType.QUESTION, ButtonsType.YES_NO, "Are you sure you want to delete library \"%s\" and all its directories?\n\nNote that files will <i>not</i> be removed, only Khövsgöl's index of them.", node.library)
                dialog.title = "Remove library from %s:%u".printf(host, port)
                var response = dialog.run()
                dialog.destroy()
                if response == ResponseType.YES
                    _instance.api.delete_library(node.library)

        def private on_scan()
            var node = get_selected_node()
            if node is not null
                if node.directory is not null
                    _instance.api.directory_action(node.library, node.directory, "scan")
                else
                    _instance.api.library_action(node.library, "scan")

        def private on_add_directory()
            var node = get_selected_node()
            if node is not null
                var dialog = new AddDirectory(self, node.library)
                if dialog.@do()
                    var path = dialog.directory_path
                    if path.length > 0
                        _instance.api.add_directory_to_library(node.library, path)

        def private on_remove_directory()
            var node = get_selected_node()
            if (node is not null) and (node.directory is not null)
                host: string
                port: uint
                _instance.api.get_connection(out host, out port)
                var dialog = new MessageDialog.with_markup(self, DialogFlags.DESTROY_WITH_PARENT, MessageType.QUESTION, ButtonsType.YES_NO, "Are you sure you want to delete directory \"%s\" in library \"%s\"?\n\nNote that files will <i>not</i> be removed, only Khövsgöl's index of them.", node.directory, node.library)
                dialog.title = "Remove directory from %s:%u".printf(host, port)
                var response = dialog.run()
                dialog.destroy()
                if response == ResponseType.YES
                    _instance.api.remove_directory_from_library(node.library, node.directory)
            
        def private on_selection_changed()
            var selection = _tree_view.get_selection()
            var tree_paths = selection.get_selected_rows(null)
            var has = tree_paths.length() > 0
            var on_directory = false
            if has
                iter: TreeIter
                if _store.get_iter(out iter, tree_paths.data)
                    on_directory = _store.iter_depth(iter) == 1
            _remove_library_button.sensitive = has
            _scan_button.sensitive = has
            _add_directory_button.sensitive = has
            _remove_directory_button.sensitive = on_directory
        
        def private get_selected_node(): Node?
            var selection = _tree_view.get_selection()
            var tree_paths = selection.get_selected_rows(null)
            if tree_paths.length() > 0
                iter: TreeIter
                if _store.get_iter(out iter, tree_paths.data)
                    value: Value
                    _store.get_value(iter, Column.NODE, out value)
                    return (Node) value
            return null

        def private on_active_render(layout: CellLayout, renderer: CellRenderer, model: TreeModel, iter: TreeIter)
            renderer.visible = _store.iter_depth(iter) == 0
        
        def private on_active_toggled(path: string)
            iter: TreeIter
            if _store.get_iter(out iter, new TreePath.from_string(path))
                value: Value
                _store.get_value(iter, Column.ACTIVE, out value)
                var active = not (bool) value
                _store.@set(iter, Column.ACTIVE, active, -1)
                _store.get_value(iter, Column.NODE, out value)
                var node = (Node) value
                if active
                    _libraries.add(node.library)
                else
                    _libraries.remove(node.library)
        
        _update_id: uint
        def private update(): bool
            var nodes = new Nodes()
        
            // Add or update
            for var library in _instance.api.get_libraries()
                var name = get_string_member_or_null(library, "name")
                if name is not null
                    var node = new Node(name)
                    nodes.add(node)
                
                    library_iter: TreeIter? = null
                    if not get_library(name, out library_iter)
                        var active = _libraries.is_empty or _libraries.contains(name)
                        _store.append(out library_iter, null)
                        _store.@set(library_iter, Column.NODE, node, Column.ICON, _library_icon, Column.TITLE, Markup.escape_text(name), Column.ACTIVE, active, -1)
                    
                    directory_iter: TreeIter? = null
                    for var directory in new JsonObjects(get_array_member_or_null(library, "directories"))
                        var path = get_string_member_or_null(directory, "path")
                        if path is not null
                            node = new Node(name, path)
                            nodes.add(node)
                        
                            var scanning = get_bool_member_or_false(directory, "scanning")
                            var status = scanning ? "<i>Scanning...</i>" : ""
                            
                            if not get_directory(path, library_iter, out directory_iter)
                                _store.append(out directory_iter, library_iter)
                                _store.@set(directory_iter, Column.NODE, node, Column.ICON, _directory_icon, Column.TITLE, Markup.escape_text(path), Column.STATUS, status, -1)
                            else
                                // Just update the status column
                                _store.@set(directory_iter, Column.STATUS, status, -1)

                    var path = _store.get_path(library_iter)
                    if path is not null
                        _tree_view.expand_row(path, false)

            // Prune
            iter: TreeIter
            child_iter: TreeIter
            value: Value
            if _store.get_iter_first(out iter)
                while true
                    if _store.iter_children(out child_iter, iter)
                        while true
                            _store.get_value(child_iter, Column.NODE, out value)
                            var node = (Node) value
                            if not nodes.contains(node)
                                if not _store.remove(ref child_iter)
                                    break
                            else
                                if not _store.iter_next(ref child_iter)
                                    break
                
                    _store.get_value(iter, Column.NODE, out value)
                    var node = (Node) value
                    if not nodes.contains(node)
                        if not _store.remove(ref iter)
                            break
                    else
                        if not _store.iter_next(ref iter)
                            break

            return true
        
        def private get_library(name: string, out library_iter: TreeIter?): bool
            iter: TreeIter
            value: Value
            if _store.get_iter_first(out iter)
                while true
                    _store.get_value(iter, Column.NODE, out value)
                    var node = (Node) value
                    if name == node.library
                        library_iter = iter
                        return true
                    if not _store.iter_next(ref iter)
                        break
            library_iter = null
            return false

        def private get_directory(path: string, library_iter: TreeIter, out directory_iter: TreeIter?): bool
            iter: TreeIter
            value: Value
            if _store.iter_children(out iter, library_iter)
                while true
                    _store.get_value(iter, Column.NODE, out value)
                    var node = (Node) value
                    if path == node.directory
                        directory_iter = iter
                        return true
                    if not _store.iter_next(ref iter)
                        break
            directory_iter = null
            return false

        _instance: Instance
        _libraries: list of string
        _store: TreeStore
        _tree_view: TreeView
        _add_library_button: Button
        _remove_library_button: Button
        _scan_button: Button
        _add_directory_button: Button
        _remove_directory_button: Button
        _library_icon: Gdk.Pixbuf
        _directory_icon: Gdk.Pixbuf
        
        class AddLibrary: Dialog
            construct(parent: Window)
                title = "Create new library"
                transient_for = parent
                destroy_with_parent = true
                modal = true
                
                _name = new EntryBox("Library _name:")
                var box = new Box(Orientation.VERTICAL, 10)
                box.pack_start(_name)
                _name.entry.activate.connect(on_activate)
                var alignment = new Alignment(0, 0, 1, 0)
                alignment.set_padding(20, 20, 20, 20)
                alignment.add(box)
                get_content_area().pack_start(alignment)
                set_default_size(400, -1)

                add_button("gtk-cancel", Gtk.ResponseType.CANCEL)
                add_button("gtk-ok", Gtk.ResponseType.OK)
                set_default_response(Gtk.ResponseType.OK)

            prop readonly library_name: string

            def @do(): bool
                show_all()
                var response = run()
                if response == ResponseType.OK
                    _library_name = _name.entry.text.strip()
                destroy()
                return response == ResponseType.OK
            
            _name: EntryBox

            def private on_activate()
                response(ResponseType.OK)

        class AddDirectory: Dialog
            construct(parent: Window, library: string)
                title = "Create new directory in \"%s\"".printf(library)
                transient_for = parent
                destroy_with_parent = true
                modal = true
                
                _path = new EntryBox("Directory _root:")
                var browse = new Button.with_mnemonic("_Browse")
                browse.clicked.connect(on_browse)
                var box = new Box(Orientation.HORIZONTAL, 10)
                box.pack_start(_path)
                box.pack_start(browse, false)
                _path.entry.activate.connect(on_activate)
                var alignment = new Alignment(0, 0, 1, 0)
                alignment.set_padding(20, 20, 20, 20)
                alignment.add(box)
                get_content_area().pack_start(alignment)
                set_default_size(600, -1)

                add_button("gtk-cancel", Gtk.ResponseType.CANCEL)
                add_button("gtk-ok", Gtk.ResponseType.OK)
                set_default_response(Gtk.ResponseType.OK)

            prop readonly directory_path: string

            def @do(): bool
                show_all()
                var response = run()
                if response == ResponseType.OK
                    _directory_path = _path.entry.text.strip()
                destroy()
                return response == ResponseType.OK

            _path: EntryBox
            
            def private on_activate()
                response(ResponseType.OK)
            
            def private on_browse()
                var dialog = new FileChooserDialog("Select directory root", self, FileChooserAction.SELECT_FOLDER, "gtk-cancel", Gtk.ResponseType.CANCEL, "gtk-ok", Gtk.ResponseType.OK)
                dialog.show_hidden = false
                var response = dialog.run()
                if response == ResponseType.OK
                    _path.entry.text = dialog.get_filename()
                dialog.destroy()
        
        class Node: Object
            construct(library: string, directory: string? = null)
                self.library = library
                self.directory = directory
        
            library: string
            directory: string?

        class Nodes
            def add(node: Node)
                _nodes.add(node)
                
            def contains(n: Node): bool
                if n.directory is null
                    for var node in _nodes
                        if n.library == node.library
                            return true
                else
                    for var node in _nodes
                        if (n.library == node.library) and (n.directory == node.directory)
                            return true
                return false
        
            _nodes: list of Node = new list of Node

        enum private Column
            NODE = 0     // Node
            ICON = 1     // Pixbuf
            TITLE = 2    // string
            STATUS = 3   // string
            ACTIVE = 4   // bool

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.library-manager")
