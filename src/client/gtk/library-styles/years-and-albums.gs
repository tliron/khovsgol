[indent=4]

uses
    JsonUtil

namespace Khovsgol.Client.GTK.Styles

    /*
     * Years and albums ordered alphabetically, with separators between
     * decades.
     */
    class YearsAndAlbums: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "years_albums"
        prop readonly label: string = "Years and albums"
        
        def fill(node: LibraryNode, filter: string?)
            var subdue_lossy = node.instance.configuration.subdue_lossy
            var show_duration = node.instance.configuration.show_duration
            var level = node.level
            if level == 0
                if filter is null
                    // Dates
                    current_decade: int = int.MIN
                    var first = true
                    var args = new Client.API.GetDatesArgs()
                    args.by_album = true
                    args.libraries.add_all(node.instance.libraries)
                    for var date in node.instance.api.get_dates(args)
                        // Seperate by decade
                        var decade = date / 10
                        if decade != current_decade
                            current_decade = decade
                            if not first
                                node.append_separator()
                    
                        var date_string = date.to_string()
                        node.append_int(date, date_string, date_string, null, true)
                        first = false
                    
                    if not first
                        node.append_separator()
                        
                    node.append_string("unknown", "unknown", "<b>Unknown Years</b>", null, true)
                else
                    // Dates (with all albums and tracks cached inside each node)
                    var first = true
                    current_album_path: string? = null
                    current_albums: Json.Array? = null
                    current_tracks: Json.Array? = null
                    current_decade: uint = 0
                    last_date: int = int.MIN

                    var args = new Client.API.GetTracksArgs()
                    var like = "%" + filter + "%"
                    args.search_artist = like
                    args.search_album = like
                    args.search_title = like
                    args.album_type = AlbumType.ARTIST
                    args.sort.add("date")
                    args.sort.add("album") // we will later sort albums by date
                    args.sort.add("position")
                    args.libraries.add_all(node.instance.libraries)
                    for var track in node.instance.api.get_tracks(args)
                        var date = track.date
                        var album_path = track.album_path
                        
                        if (date != last_date) or (last_date == int.MIN)
                            // New date
                            last_date = date

                            // Seperate by decade
                            var decade = date / 10
                            if decade != current_decade
                                current_decade = decade
                                if not first
                                    node.append_separator()

                            var date_string = date.to_string()
                            var date_node = new Json.Object()
                            date_node.set_int_member("date", date)
                            node.append_object(date_node, date_string, date_string, null, true)
                            current_albums = new Json.Array()
                            date_node.set_array_member("albums", current_albums)
                            
                            first = false

                        if (album_path is not null) and (current_album_path != album_path)
                            // New album
                            current_album_path = album_path
                            current_tracks = new Json.Array()
                            
                            if current_albums is not null
                                var album_node = new Json.Object()
                                album_node.set_string_member("path", current_album_path)
                                album_node.set_array_member("tracks", current_tracks)
                                current_albums.add_object_element(album_node)
                        
                        if current_tracks is not null
                            current_tracks.add_object_element(track.to_json())

            else if level == 1
                if node.node_type == Json.NodeType.OBJECT
                    // Albums at date (from cache)
                    var date_node = node.as_object
                    for var album_node in new JsonObjects(get_array_member_or_null(date_node, "albums"))
                        var path = get_string_member_or_null(album_node, "path")
                        if path is not null
                            var album = node.instance.api.get_album(path)
                            if album is not null
                                var tracks = get_array_member_or_null(album_node, "tracks")
                                if tracks is not null
                                    // Transfer tracks cache to album node
                                    album.to_json().set_array_member("tracks", tracks)
                                fill_album(album, node, subdue_lossy)
                else
                    // Albums at date
                    var date = node.as_int
                    if date == int.MIN
                        date = 0 // Unknown date
                    var args = new Client.API.GetAlbumsArgs()
                    args.at_date = date
                    args.sort.add("title_sort")
                    args.libraries.add_all(node.instance.libraries)
                    fill_albums(node.instance.api.get_albums(args), node, subdue_lossy)

            else if level == 2
                var album_node = node.as_object

                // Try cache
                var tracks = get_array_member_or_null(album_node, "tracks")
                if tracks is not null
                    // Tracks in album (from cache)
                    for var track in new JsonTracks(tracks)
                        fill_track_in_album(track, false, node, subdue_lossy, show_duration)
                else
                    // Tracks in album
                    var album = new Album.from_json(album_node)
                    var path = album.path
                    if path is not null
                        var album_type = album.album_type
                        var args = new Client.API.GetTracksArgs()
                        args.in_album = path
                        args.sort.add("position")
                        fill_tracks_in_album(node.instance.api.get_tracks(args), album_type > AlbumType.ARTIST, node, subdue_lossy, show_duration)
        
        def gather_tracks(node: LibraryNode, ref paths: Json.Array)
            var level = node.level
            if level == 1
                if node.node_type == Json.NodeType.OBJECT
                    // Try cache
                    var albums = get_array_member_or_null(node.as_object, "albums")
                    for var album_node in new JsonObjects(albums)
                        var tracks = get_array_member_or_null(album_node, "tracks")
                        gather_from_tracks(new JsonTracks(tracks), node, ref paths)
                else
                    // All tracks at date, one album at a time
                    var date = node.as_int
                    if date != int.MIN
                        var args = new Client.API.GetAlbumsArgs()
                        args.at_date = date
                        args.sort.add("title_sort")
                        args.libraries.add_all(node.instance.libraries)
                        gather_from_albums(node.instance.api.get_albums(args), node, ref paths)

            else if level == 2
                var album_node = node.as_object

                // Try cache
                var tracks = get_array_member_or_null(album_node, "tracks")
                if tracks is not null
                    gather_from_tracks(new JsonTracks(tracks), node, ref paths)
                else
                    // All paths in album
                    var album = new Album.from_json(album_node)
                    var path = album.path
                    if path is not null
                        var args = new Client.API.GetTracksArgs()
                        args.in_album = path
                        args.sort.add("position")
                        gather_from_tracks(node.instance.api.get_tracks(args), node, ref paths)

            else if level == 3
                // The track's path
                gather_from_track(node, ref paths)
