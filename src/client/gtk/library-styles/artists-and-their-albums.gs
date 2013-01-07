[indent=4]

uses
    JsonUtil

namespace Khovsgol.Client.GTK.Styles

    /*
     * Classic view of artists with their albums ordered by date.
     * Separate sections are added to the bottom for compilations
     * and playlists.
     */
    class ArtistsAndTheirAlbums: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "artists_albums"
        prop readonly label: string = "Artists and their albums"
        
        def fill(node: LibraryNode, filter: string?)
            var subdue_lossy = node.instance.configuration.subdue_lossy
            var show_duration = node.instance.configuration.show_duration
            var level = node.level
            if level == 0
                if filter is null
                    // Album artists
                    var args = new Client.API.GetArtistsArgs()
                    args.album_artists = true
                    args.sort.add("artist_sort")
                    args.libraries.add_all(node.instance.libraries)
                    if fill_artists(node.instance.api.get_artists(args), node)
                        node.append_separator()
        
                    // Special section
                    node.append_string("unknownartist", "unknownartist", "<b>Unknown Artist</b>", null, true)
                    node.append_string("compilations", "compilations", "<b>Compilations</b>", null, true)
                    node.append_string("playlists", "playlists", "<b>Playlists</b>", null, true)
                else
                    // Album artists (with all albums and tracks cached inside each node)
                    var first = true
                    current_album_path: string? = null
                    current_albums: Json.Array? = null
                    current_tracks: Json.Array? = null
                    current_letter: unichar = 0
                    last_artist_name: string? = null
                    var unknown = new Json.Array()
                    var compilations = new Json.Array()
                    var playlists = new Json.Array()

                    var args = new Client.API.GetTracksArgs()
                    var like = "%" + filter + "%"
                    args.search_artist = like
                    args.search_album = like
                    args.search_title = like
                    args.album_type = AlbumType.ARTIST
                    args.sort.add("artist_sort")
                    args.sort.add("album") // we will later sort albums by date
                    args.sort.add("position")
                    args.libraries.add_all(node.instance.libraries)
                    for var track in node.instance.api.get_tracks(args)
                        var artist_name = track.artist
                        var album_path = track.album_path
                        var album_type = track.album_type
                        
                        if (album_type == AlbumType.ARTIST) and (artist_name != last_artist_name)
                            // New artist
                            var sort = track.artist_sort
                            last_artist_name = artist_name

                            // Separate by first letter
                            if (sort is not null) and (sort.length > 0)
                                var letter = sort.get_char(0)
                                if letter != current_letter
                                    current_letter = letter
                                    if not first
                                        node.append_separator()

                                var artist = new Artist()
                                artist.name = artist_name
                                artist.sort = sort
                                var artist_node = fill_artist(artist, node)
                                if artist_node is not null
                                    current_albums = new Json.Array()
                                    artist_node.set_array_member("_albums", current_albums)
                                    
                                    first = false
                                else
                                    current_albums = null
                            else
                                current_albums = unknown

                        if (album_path is not null) and (current_album_path != album_path)
                            // New album
                            current_album_path = album_path
                            current_tracks = new Json.Array()
                            
                            var album_node = new Json.Object()
                            album_node.set_string_member("path", current_album_path)
                            album_node.set_array_member("tracks", current_tracks)
                            
                            if album_type == AlbumType.COMPILATION
                                compilations.add_object_element(album_node)
                            else if album_type == AlbumType.SAVED_PLAYLIST
                                playlists.add_object_element(album_node)
                            else if current_albums is not null
                                current_albums.add_object_element(album_node)
                        
                        if current_tracks is not null
                            current_tracks.add_object_element(track.to_json())

                    if not first and ((unknown.get_length() > 0) or (compilations.get_length() > 0) or (playlists.get_length() > 0))
                        node.append_separator()
                    
                    if unknown.get_length() > 0
                        var special = new Json.Object()
                        special.set_array_member("_albums", unknown)
                        node.append_object(special, "unknownartist", "<b>Unknown Artist</b>", null, true)

                    if compilations.get_length() > 0
                        var special = new Json.Object()
                        special.set_array_member("_albums", compilations)
                        node.append_object(special, "compilations", "<b>Compilations</b>", null, true)

                    if playlists.get_length() > 0
                        var special = new Json.Object()
                        special.set_array_member("_albums", playlists)
                        node.append_object(special, "playlists", "<b>Playlists</b>", null, true)
            
            else if level == 1
                var node_type = node.node_type
                if node_type == Json.NodeType.OBJECT
                    var artist_node = node.as_object
                
                    // Try cache
                    var albums = get_array_member_or_null(artist_node, "_albums")
                    if albums is not null
                        // Albums by artist (from cache)
                        var albums_list = new Gee.LinkedList of Album
                        for var album_node in new JsonObjects(albums)
                            var path = get_string_member_or_null(album_node, "path")
                            if path is not null
                                var album = node.instance.api.get_album(path)
                                if album is not null
                                    var tracks = get_array_member_or_null(album_node, "tracks")
                                    if tracks is not null
                                        // Transfer tracks cache to album node
                                        album.to_json().set_array_member("_tracks", tracks)
                                    albums_list.add(album)
                                
                        albums_list.sort((CompareFunc) compare_albums_by_date)
                        for var album in albums_list
                            fill_album_by(album, node, subdue_lossy)
                    else
                        // Albums by artist
                        var artist = new Artist.from_json(artist_node)
                        var name = artist.name
                        if name is not null
                            var args = new Client.API.GetAlbumsArgs()
                            args.by_artist = name
                            args.sort.add("date")
                            args.sort.add("title_sort")
                            args.libraries.add_all(node.instance.libraries)
                            fill_albums_by(node.instance.api.get_albums(args), node, subdue_lossy)
                else
                    // Special
                    var special_type = node.as_string
                    if special_type == "unknownartist"
                        // Unknown artists
                        var args = new Client.API.GetAlbumsArgs()
                        args.by_artist = ""
                        args.album_type = AlbumType.ARTIST
                        args.sort.add("date")
                        args.sort.add("title_sort")
                        args.libraries.add_all(node.instance.libraries)
                        fill_albums_by(node.instance.api.get_albums(args), node, subdue_lossy)
                        pass
                    else
                        // Compilations
                        var args = new Client.API.GetAlbumsArgs()
                        args.album_type = special_type == "playlists" ? AlbumType.SAVED_PLAYLIST : AlbumType.COMPILATION
                        args.sort.add("date")
                        args.sort.add("title_sort")
                        args.libraries.add_all(node.instance.libraries)
                        fill_albums_by(node.instance.api.get_albums(args), node, subdue_lossy)

            else if level == 2
                var album_node = node.as_object
                
                // Try cache
                var tracks = get_array_member_or_null(album_node, "_tracks")
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
                var node_type = node.node_type
                if node_type == Json.NodeType.OBJECT
                    var artist_node = node.as_object
                    
                    // Try cache
                    var albums = get_array_member_or_null(artist_node, "_albums")
                    if albums is not null
                        var albums_list = new Gee.LinkedList of Album
                        for var album_node in new JsonObjects(albums)
                            var path = get_string_member_or_null(album_node, "path")
                            if path is not null
                                var album = node.instance.api.get_album(path)
                                if album is not null
                                    var tracks = get_array_member_or_null(album_node, "tracks")
                                    if tracks is not null
                                        // Transfer tracks cache to album node
                                        album.to_json().set_array_member("_tracks", tracks)
                                    albums_list.add(album)
                                
                        albums_list.sort((CompareFunc) compare_albums_by_date)
                        for var album in albums_list
                            var tracks = get_array_member_or_null(album.to_json(), "_tracks")
                            gather_from_tracks(new JsonTracks(tracks), node, ref paths)
                    else
                        // All paths for artist, one album at a time
                        var artist = new Artist.from_json(artist_node)
                        var name = artist.name
                        if name is not null
                            var args = new Client.API.GetAlbumsArgs()
                            args.by_artist = name
                            args.sort.add("date")
                            args.sort.add("title_sort")
                            args.libraries.add_all(node.instance.libraries)
                            gather_from_albums(node.instance.api.get_albums(args), node, ref paths)
                else
                    // Special
                    var special_type = node.as_string
                    if special_type == "unknownartist"
                        // All paths for unknown artists, one album at a time
                        var args = new Client.API.GetAlbumsArgs()
                        args.by_artist = ""
                        args.album_type = AlbumType.ARTIST
                        args.sort.add("date")
                        args.sort.add("title_sort")
                        args.libraries.add_all(node.instance.libraries)
                        gather_from_albums(node.instance.api.get_albums(args), node, ref paths)
                    else
                        // All paths by compilation type, one album at a time
                        var args = new Client.API.GetAlbumsArgs()
                        args.album_type = node.as_string == "playlist" ? AlbumType.SAVED_PLAYLIST : AlbumType.COMPILATION
                        args.sort.add("date")
                        args.sort.add("title_sort")
                        args.libraries.add_all(node.instance.libraries)
                        gather_from_albums(node.instance.api.get_albums(args), node, ref paths)

            else if level == 2
                var album_node = node.as_object

                // Try cache
                var tracks = get_array_member_or_null(album_node, "_tracks")
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
