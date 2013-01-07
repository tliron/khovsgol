[indent=4]

uses
    Gtk
    JsonUtil

namespace Khovsgol.Client.GTK.Styles

    interface LibraryStyle: Style
        def abstract fill(node: LibraryNode, filter: string?)
        def abstract gather_tracks(node: LibraryNode, ref paths: Json.Array)

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
                var node = (Json.Node) value
                return is_object(node) ? node.get_object() : null

        prop readonly as_array: Json.Array?
            get
                value: Value
                _store.get_value(_iter, Library.Column.NODE, out value)
                var node = (Json.Node) value
                return is_array(node) ? node.get_array() : null

        prop readonly as_string: string?
            get
                value: Value
                _store.get_value(_iter, Library.Column.NODE, out value)
                var node = (Json.Node) value
                return is_string(node) ? node.get_string() : null

        prop readonly as_int: int
            get
                value: Value
                _store.get_value(_iter, Library.Column.NODE, out value)
                var node = (Json.Node) value
                return is_int64(node) ? (int) node.get_int() : int.MIN

        prop readonly node_type: Json.NodeType
            get
                value: Value
                _store.get_value(_iter, Library.Column.NODE, out value)
                return ((Json.Node) value).get_node_type()

        def append(node: Json.Node?, search: string? = null, title_markup: string? = null, duration_markup: string? = null, is_expandable: bool = false)
            var rtl = false
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
    
    def private fill_artists(artists: IterableOfArtist, node: LibraryNode): bool
        current_letter: unichar = 0
        var first = true
        for var artist in artists
            var sort = artist.sort
            if (sort is not null) and (sort.length > 0)
                // Separate by first letter
                var letter = sort.get_char(0)
                if letter != current_letter
                    current_letter = letter
                    if not first
                        node.append_separator()
                            
            if fill_artist(artist, node) is not null
                first = false
        return not first
    
    def private fill_artist(artist: Artist, node: LibraryNode): Json.Object?
        var name = artist.name
        if (name is not null) and (name.length > 0)
            var markup = Markup.escape_text(name)
            var json = artist.to_json()
            node.append_object(json, name, markup, null, true)
            return json
        else
            return null
 
    def private fill_albums_by(albums: IterableOfAlbum, node: LibraryNode, subdue_lossy: bool)
        for var album in albums
            fill_album_by(album, node, subdue_lossy)
            
    def private fill_album_by(album: Album, node: LibraryNode, subdue_lossy: bool)
        var title = album.title
        if (title is null) or (title.length == 0)
            title = get_title_from_path(album.path)
        if title is not null
            var file_type = album.file_type
            var date = album.date
            
            title = Markup.escape_text(title)
            title = format_annotation(title)
            if subdue_lossy and not is_lossless(file_type)
                title = format_washed_out(title)
            var markup = ((date != int64.MIN) and (date != 0)) ? "%lld: %s".printf(date, title) : title
            
            node.append_object(album.to_json(), album.title, markup, null, true)

    def private fill_albums(albums: IterableOfAlbum, node: LibraryNode, subdue_lossy: bool)
        current_letter: unichar = 0
        var first = true
        for var album in albums
            var sort = album.title_sort
            if (sort is not null) and (sort.length > 0)
                // Separate by first letter
                var letter = sort.get_char(0)
                if letter != current_letter
                    current_letter = letter
                    if not first
                        node.append_separator()
                
            if fill_album(album, node, subdue_lossy)
                first = false

    def private fill_album(album: Album, node: LibraryNode, subdue_lossy: bool): bool
        var title = album.title
        if (title is null) or (title.length == 0)
            title = get_title_from_path(album.path)
        if title is not null
            var file_type = album.file_type
            var artist = album.artist

            title = Markup.escape_text(title)
            title = format_annotation(title)
            if subdue_lossy and not is_lossless(file_type)
                title = format_washed_out(title)
            markup: string
            if (artist is not null) and (artist.length > 0)
                artist = Markup.escape_text(artist)
                markup = "%s - <i>%s</i>".printf(title, artist)
            else
                markup = title
            
            node.append_object(album.to_json(), album.title, markup, null, true)
            
            return true
        else
            return false

    def private fill_tracks_in_album(tracks: IterableOfTrack, is_compilation: bool, node: LibraryNode, subdue_lossy: bool, show_duration: bool)
        for var track in tracks
            fill_track_in_album(track, is_compilation, node, subdue_lossy, show_duration)
                
    def private fill_track_in_album(track: Track, is_compilation: bool, node: LibraryNode, subdue_lossy: bool, show_duration: bool)
        var title = track.title
        if (title is null) or (title.length == 0)
            title = get_title_from_path(track.path)
        if title is not null
            var file_type = track.file_type
            var position = track.position_in_album
            var duration = track.duration
            var artist = is_compilation ? track.artist : null
            
            title = Markup.escape_text(title)
            title = format_annotation(title)
            if subdue_lossy and not is_lossless(file_type)
                title = format_washed_out(title)
            if (artist is not null) and (artist.length > 0)
                artist = Markup.escape_text(artist)
            else
                artist = null
            title_markup: string
            if (position != int.MIN) and (artist is not null)
                title_markup = "%d\t%s - <i>%s</i>".printf(position, title, artist)
            else if position != int.MIN
                title_markup = "%d\t%s".printf(position, title)
            else if artist is not null
                title_markup = "%s - <i>%s</i>".printf(title, artist)
            else
                title_markup = title
            var duration_markup = get_duration_markup(duration, show_duration)
            
            node.append_object(track.to_json(), track.title, title_markup, duration_markup)

    def private fill_tracks(tracks: IterableOfTrack, node: LibraryNode, subdue_lossy: bool, show_duration: bool)
        current_letter: unichar = 0
        var first = true
        for var track in tracks
            var sort = track.title_sort
            if (sort is not null) and (sort.length > 0)
                // Separate by first letter
                var letter = sort.get_char(0)
                if letter != current_letter
                    current_letter = letter
                    if not first
                        node.append_separator()
                            
            if fill_track(track, node, subdue_lossy, show_duration)
                first = false

    def private fill_track(track: Track, node: LibraryNode, subdue_lossy: bool, show_duration: bool): bool
        var title = track.title
        if (title is null) or (title.length == 0)
            title = get_title_from_path(track.path)
        if title is not null
            var album = track.album
            var file_type = track.file_type
            var duration = track.duration

            title = Markup.escape_text(title)
            title = format_annotation(title)
            if subdue_lossy and not is_lossless(file_type)
                title = format_washed_out(title)
            
            title_markup: string
            if (album is not null) and (album.length > 0)
                album = Markup.escape_text(album)
                album = format_annotation(album)
                title_markup = "%s - %s".printf(title, album)
            else
                title_markup = title
            var duration_markup = get_duration_markup(duration, show_duration)
            
            node.append_object(track.to_json(), track.title, title_markup, duration_markup)
            
            return true
        else
            return false

    def private gather_from_albums(albums: IterableOfAlbum, node: LibraryNode, ref paths: Json.Array)
        for var album in albums
            var path = album.path
            if path is not null
                var args = new Client.API.GetTracksArgs()
                args.in_album = path
                args.sort.add("position")
                for var track in node.instance.api.get_tracks(args)
                    var track_path = track.path
                    if track_path is not null
                        paths.add_string_element(track_path)

    def private gather_from_tracks(tracks: IterableOfTrack, node: LibraryNode, ref paths: Json.Array)
        for var track in tracks
            var path = track.path
            if path is not null
                paths.add_string_element(path)

    def private gather_from_track(node: LibraryNode, ref paths: Json.Array)
        var track = new Track.from_json(node.as_object)
        var path = track.path
        if path is not null
            paths.add_string_element(path)
            
    def private compare_albums_by_date(album1: Album, album2: Album): int
        return (int) (album1.date - album2.date)
