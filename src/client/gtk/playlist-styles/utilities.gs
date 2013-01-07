[indent=4]

uses
    Gtk
    JsonUtil

namespace Khovsgol.Client.GTK.Styles
    
    interface PlaylistStyle: Style
        def abstract fill(node: PlaylistNode)
        def abstract gather_positions(node: PlaylistNode, ref positions: Json.Array)
        def abstract gather_paths(node: PlaylistNode, ref positions: Json.Array)
        def abstract get_first_position(node: PlaylistNode): int

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
                var node = (Json.Node) value
                return is_object(node) ? node.get_object() : null

        prop readonly as_array: Json.Array
            get
                value: Value
                _store.get_value(_iter, Playlist.Column.NODE, out value)
                var node = (Json.Node) value
                return is_array(node) ? node.get_array() : null
                
        def get_album(path: string): Album?
            if _albums_dict is null
                _albums_dict = new dict of string, Album
                for var album in _albums
                    _albums_dict[album.path] = album
            return _albums_dict[path]

        def append(node: Json.Node?, position: int, search: string? = null, title_markup: string? = null, duration_markup: string? = null)
            var rtl = false
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
