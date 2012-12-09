[indent=4]

uses
    Gtk
    JsonUtil

namespace Khovsgol.Client.GTK

    interface LibraryStyle: Style
        def abstract fill(node: LibraryNode)
        def abstract filter(node: LibraryNode, filter: string)
        def abstract gather_tracks(node: LibraryNode, ref paths: Json.Array)
    
    /*
     * Classic view of artists with their albums ordered by date.
     * Separate sections are added to the bottom for compilations
     * and custom compilation.
     */
    class ArtistsAndTheirAlbums: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "artists_albums"
        prop readonly label: string = "Artists and their albums"
        
        def fill(node: LibraryNode)
            var level = node.level
            if level == 0
                // Album artists
                if fill_artists(node.instance.api.get_artists(true, "artist_sort"), node)
                    node.append_separator()
    
                // Compilation section
                node.append_string("compilations", "compilations", "<b>Compilations</b>", null, true)
                node.append_string("custom", "customcompilations", "<b>Custom Compilations</b>", null, true)
            
            else if level == 1
                var node_type = node.node_type
                if node_type == Json.NodeType.OBJECT
                    // Albums by artist
                    var artist = new Artist.from_json(node.as_object)
                    var name = artist.name
                    if name is not null
                        var args = new Client.API.GetAlbumsArgs()
                        args.by_artist = name
                        args.sort.add("date")
                        args.sort.add("title_sort")
                        fill_albums_by(node.instance.api.get_albums(args), node)
                else
                    // Compilations
                    var args = new Client.API.GetAlbumsArgs()
                    args.album_type = node.as_string == "custom" ? 2 : 1
                    args.sort.add("date")
                    args.sort.add("title_sort")
                    fill_albums_by(node.instance.api.get_albums(args), node)

            else if level == 2
                // Tracks in album
                var album = new Album.from_json(node.as_object)
                var path = album.path
                if path is not null
                    var compilation = album.album_type
                    var args = new Client.API.GetTracksArgs()
                    args.in_album = path
                    args.sort.add("position")
                    fill_tracks_in_album(node.instance.api.get_tracks(args), compilation > 0, node)
        
        def filter(node: LibraryNode, filter: string)
            var level = node.level
            if level == 0
                // Album artists (with all albums and tracks cached inside its node)
                first: bool = true
                current_album_path: string? = null
                current_albums: Json.Array? = null
                current_tracks: Json.Array? = null
                current_letter: unichar = 0
                last_artist_name: string? = null
                var compilations = new Json.Array()
                var custom_compilations = new Json.Array()

                var args = new Client.API.GetTracksArgs()
                var like = "%" + filter + "%"
                args.search_artist = like
                args.search_album = like
                args.search_title = like
                args.album_type = AlbumType.ARTIST
                args.sort.add("album")
                args.sort.add("position")
                for var track in node.instance.api.get_tracks(args)
                    var artist_name = track.artist
                    var album_path = track.album_path
                    var album_type = track.album_type
                    
                    if (album_type == AlbumType.ARTIST) && (artist_name != last_artist_name)
                        // New artist
                        var sort = track.artist_sort
                        last_artist_name = artist_name

                        // Separate by first letter
                        if (sort is not null) && (sort.length > 0)
                            var letter = sort.get_char(0)
                            if letter != current_letter
                                current_letter = letter
                                if !first
                                    node.append_separator()

                        var artist = new Artist()
                        artist.name = artist_name
                        artist.sort = sort
                        var json = fill_artist(artist, node)
                        if json is not null
                            current_albums = new Json.Array()
                            json.set_array_member("albums", current_albums)
                        else
                            current_albums = null
                        
                        first = false

                    if (album_path is not null) && (current_album_path != album_path)
                        // New album
                        current_album_path = album_path
                        current_tracks = new Json.Array()
                        
                        var album_node = new Json.Object()
                        album_node.set_string_member("path", current_album_path)
                        album_node.set_array_member("tracks", current_tracks)
                        
                        if album_type == AlbumType.COMPILATION
                            compilations.add_object_element(album_node)
                        if album_type == AlbumType.CUSTOM_COMPILATION
                            custom_compilations.add_object_element(album_node)
                        else if current_albums is not null
                            current_albums.add_object_element(album_node)
                    
                    if current_tracks is not null
                        current_tracks.add_object_element(track.to_json())

                if !first && ((compilations.get_length() > 0) || (custom_compilations.get_length() > 0))
                    node.append_separator()
                
                if compilations.get_length() > 0
                    var special = new Json.Object()
                    special.set_array_member("albums", compilations)
                    node.append_object(special, "compilations", "<b>Compilations</b>", null, true)

                if custom_compilations.get_length() > 0
                    var special = new Json.Object()
                    special.set_array_member("albums", custom_compilations)
                    node.append_object(special, "customcompilations", "<b>Custom Compilations</b>", null, true)

            else if level == 1
                // Albums by artist (from cache)
                var artist_node = node.as_object
                var albums = get_array_member_or_null(artist_node, "albums")
                if albums is not null
                    var length = albums.get_length()
                    if length > 0
                        var albums_list = new Gee.LinkedList of Album
                        var last = length - 1
                        for var i = 0 to last
                            var album_node = get_object_element_or_null(albums, i)
                            if album_node is not null
                                var path = get_string_member_or_null(album_node, "path")
                                if path is not null
                                    var album = node.instance.api.get_album(path)
                                    if album is not null
                                        var tracks = get_array_member_or_null(album_node, "tracks")
                                        if tracks is not null
                                            // Transfer tracks cache to album node
                                            album.to_json().set_array_member("tracks", tracks)
                                        albums_list.add(album)
                        
                        albums_list.sort((CompareFunc) compare_albums_by_date)
                        for var album in albums_list
                            fill_album_by(album, node)

            else if level == 2
                // Tracks in album (from cache)
                var album_node = node.as_object
                var tracks = get_array_member_or_null(album_node, "tracks")
                if tracks is not null
                    var length = tracks.get_length()
                    if length > 0
                        var last = length - 1
                        for var i = 0 to last
                            var track_node = get_object_element_or_null(tracks, i)
                            if track_node is not null
                                var track = new Track.from_json(track_node)
                                fill_track_in_album(track, false, node)
        
        def gather_tracks(node: LibraryNode, ref paths: Json.Array)
            var level = node.level
            if level == 1
                var node_type = node.node_type
                if node_type == Json.NodeType.OBJECT
                    // All paths for artist, one album at a time
                    var artist = new Artist.from_json(node.as_object)
                    var name = artist.name
                    if name is not null
                        var args = new Client.API.GetAlbumsArgs()
                        args.by_artist = name
                        args.sort.add("date")
                        args.sort.add("title_sort")
                        gather_from_albums(node.instance.api.get_albums(args), node, ref paths)
                else
                    // All paths by compilation type, one album at a time
                    var args = new Client.API.GetAlbumsArgs()
                    args.album_type = node.as_string == "custom" ? 2 : 1
                    args.sort.add("date")
                    args.sort.add("title_sort")
                    gather_from_albums(node.instance.api.get_albums(args), node, ref paths)

            else if level == 2
                // All paths in album
                var album = new Album.from_json(node.as_object)
                var path = album.path
                if path is not null
                    var args = new Client.API.GetTracksArgs()
                    args.in_album = path
                    args.sort.add("position")
                    gather_from_tracks(node.instance.api.get_tracks(args), node, ref paths)

            else if level == 3
                // The track's path
                gather_from_track(node, ref paths)

    /*
     * Artists and their tracks ordered alphabetically.
     */
    class ArtistsAndTheirTracks: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "artists_tracks"
        prop readonly label: string = "Artists and their tracks"
        
        def fill(node: LibraryNode)
            var level = node.level
            if level == 0
                // Artists
                fill_artists(node.instance.api.get_artists(false, "artist_sort"), node)

            else if level == 1
                // Tracks with artist
                var artist = new Artist.from_json(node.as_object)
                var name = artist.name
                if name is not null
                    var args = new Client.API.GetTracksArgs()
                    args.by_artist = name
                    args.sort.add("title_sort")
                    fill_tracks(node.instance.api.get_tracks(args), node)

        def filter(node: LibraryNode, filter: string)
            pass
        
        def gather_tracks(node: LibraryNode, ref paths: Json.Array)
            var level = node.level
            if level == 1
                // All tracks for artist
                var artist = new Artist.from_json(node.as_object)
                var name = artist.name
                if name is not null
                    var args = new Client.API.GetTracksArgs()
                    args.by_artist = name
                    args.sort.add("title_sort")
                    gather_from_tracks(node.instance.api.get_tracks(args), node, ref paths)

            else if level == 2
                // The track's path
                gather_from_track(node, ref paths)
    
    /*
     * Years and albums ordered alphabetically, with separators between
     * decades.
     */
    class YearsAndAlbums: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "years_albums"
        prop readonly label: string = "Years and albums"
        
        def fill(node: LibraryNode)
            var level = node.level
            if level == 0
                // Dates
                current_decade: int = int.MIN
                first: bool = true
                for var date in node.instance.api.get_dates()
                    // Seperate by decade
                    var decade = date / 10
                    if decade != current_decade
                        current_decade = decade
                        if !first
                            node.append_separator()
                
                    var date_string = date.to_string()
                    node.append_int(date, date_string, date_string, null, true)
                    first = false

            else if level == 1
                // Albums at date
                var date = node.as_int
                if date != int.MIN
                    var args = new Client.API.GetAlbumsArgs()
                    args.at_date = date
                    args.sort.add("title_sort")
                    fill_albums(node.instance.api.get_albums(args), node)

            else if level == 2
                // Tracks in album
                var album = new Album.from_json(node.as_object)
                var path = album.path
                if path is not null
                    var compilation = album.album_type
                    var args = new Client.API.GetTracksArgs()
                    args.in_album = path
                    args.sort.add("position")
                    fill_tracks_in_album(node.instance.api.get_tracks(args), compilation > 0, node)

        def filter(node: LibraryNode, filter: string)
            pass
        
        def gather_tracks(node: LibraryNode, ref paths: Json.Array)
            var level = node.level
            if level == 1
                // All tracks at date, one album at a time
                var date = node.as_int
                if date != int.MIN
                    var args = new Client.API.GetAlbumsArgs()
                    args.at_date = date
                    args.sort.add("title_sort")
                    gather_from_albums(node.instance.api.get_albums(args), node, ref paths)

            else if level == 2
                // All paths in album
                var album = new Album.from_json(node.as_object)
                var path = album.path
                if path is not null
                    var args = new Client.API.GetTracksArgs()
                    args.in_album = path
                    args.sort.add("position")
                    gather_from_tracks(node.instance.api.get_tracks(args), node, ref paths)

            else if level == 3
                // The track's path
                gather_from_track(node, ref paths)
    
    /*
     * All albums ordered alphabetically.
     */
    class AllAlbums: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "albums"
        prop readonly label: string = "All albums"
        
        def fill(node: LibraryNode)
            var level = node.level
            if level == 0
                // Albums
                var args = new Client.API.GetAlbumsArgs()
                args.sort.add("title_sort")
                fill_albums(node.instance.api.get_albums(args), node)

            else if level == 1
                // Tracks in album
                var album = new Album.from_json(node.as_object)
                var path = album.path
                if path is not null
                    var compilation = album.album_type
                    var args = new Client.API.GetTracksArgs()
                    args.in_album = path
                    args.sort.add("position")
                    fill_tracks_in_album(node.instance.api.get_tracks(args), compilation > 0, node)

        def filter(node: LibraryNode, filter: string)
            pass
        
        def gather_tracks(node: LibraryNode, ref paths: Json.Array)
            var level = node.level
            if level == 1
                // All paths in album
                var album = new Album.from_json(node.as_object)
                var path = album.path
                if path is not null
                    var args = new Client.API.GetTracksArgs()
                    args.in_album = path
                    args.sort.add("position")
                    gather_from_tracks(node.instance.api.get_tracks(args), node, ref paths)

            else if level == 2
                // The track's path
                gather_from_track(node, ref paths)
    
    /*
     * Custom compilations only.
     */
    class CustomCompilations: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "custom_compilations"
        prop readonly label: string = "Custom compilations only"
        
        def fill(node: LibraryNode)
            var level = node.level
            if level == 0
                // Albums
                var args = new Client.API.GetAlbumsArgs()
                args.album_type = 2
                args.sort.add("title_sort")
                fill_albums(node.instance.api.get_albums(args), node)

            else if level == 1
                // Tracks in album
                var album = new Album.from_json(node.as_object)
                var path = album.path
                if path is not null
                    var args = new Client.API.GetTracksArgs()
                    args.in_album = path
                    args.sort.add("position")
                    fill_tracks_in_album(node.instance.api.get_tracks(args), true, node)

        def filter(node: LibraryNode, filter: string)
            pass
        
        def gather_tracks(node: LibraryNode, ref paths: Json.Array)
            var level = node.level
            if level == 1
                // All paths in album
                var album = new Album.from_json(node.as_object)
                var path = album.path
                if path is not null
                    var args = new Client.API.GetTracksArgs()
                    args.in_album = path
                    args.sort.add("position")
                    gather_from_tracks(node.instance.api.get_tracks(args), node, ref paths)

            else if level == 2
                // The track's path
                gather_from_track(node, ref paths)

    def private fill_artists(artists: IterableOfArtist, node: LibraryNode): bool
        current_letter: unichar = 0
        first: bool = true
        for var artist in artists
            if artist.name is not null
                var sort = artist.sort
                
                // Separate by first letter
                if (sort is not null) && (sort.length > 0)
                    var letter = sort.get_char(0)
                    if letter != current_letter
                        current_letter = letter
                        if !first
                            node.append_separator()
                            
                fill_artist(artist, node)
                
                first = false
        return !first
    
    def private fill_artist(artist: Artist, node: LibraryNode): Json.Object?
        var name = artist.name
        if name is not null
            var markup = Markup.escape_text(name)
            var json = artist.to_json()
            node.append_object(json, name, markup, null, true)
            return json
        else
            return null
 
    def private fill_albums_by(albums: IterableOfAlbum, node: LibraryNode)
        for var album in albums
            fill_album_by(album, node)
            
    def private fill_album_by(album: Album, node: LibraryNode)
        var title = album.title
        if title is not null
            var file_type = album.file_type
            var date = album.date
            
            title = Markup.escape_text(title)
            title = format_annotation(title)
            if !is_lossless(file_type)
                title = format_washed_out(title)
            var markup = date != int64.MIN ? "%d: %s".printf((int) date, title) : title
            
            node.append_object(album.to_json(), album.title, markup, null, true)

    def private fill_albums(albums: IterableOfAlbum, node: LibraryNode)
        current_letter: unichar = 0
        first: bool = true
        for var album in albums
            var title = album.title
            if title is not null
                var title_sort = album.title_sort
                var file_type = album.file_type
                var artist = album.artist

                // Separate by first letter
                if (title_sort is not null) && (title_sort.length > 0)
                    var letter = title_sort.get_char(0)
                    if letter != current_letter
                        current_letter = letter
                        if !first
                            node.append_separator()

                title = Markup.escape_text(title)
                title = format_annotation(title)
                if artist is not null
                    artist = Markup.escape_text(artist)
                if !is_lossless(file_type)
                    title = format_washed_out(title)
                var markup = artist is not null ? "%s - <i>%s</i>".printf(title, artist) : title
                
                node.append_object(album.to_json(), album.title, markup, null, true)
                
                first = false

    def private fill_tracks_in_album(tracks: IterableOfTrack, is_compilation: bool, node: LibraryNode)
        for var track in tracks
            fill_track_in_album(track, is_compilation, node)
                
    def private fill_track_in_album(track: Track, is_compilation: bool, node: LibraryNode)
        var title = track.title
        if title is not null
            var file_type = track.file_type
            var position = track.position
            var duration = track.duration
            var artist = is_compilation ? track.artist : null
            
            title = Markup.escape_text(title)
            title = format_annotation(title)
            if artist is not null
                artist = Markup.escape_text(artist)
            if !is_lossless(file_type)
                title = format_washed_out(title)
            markup1: string
            if (position != int.MIN) && (artist is not null)
                markup1 = "%d\t%s - <i>%s</i>".printf(position, title, artist)
            else if position != int.MIN
                markup1 = "%d\t%s".printf(position, title)
            else if artist is not null
                markup1 = "%s - <i>%s</i>".printf(title, artist)
            else
                markup1 = title
            var markup2 = duration != double.MIN ? format_duration(duration) : null
            
            node.append_object(track.to_json(), track.title, markup1, markup2)

    def private fill_tracks(tracks: IterableOfTrack, node: LibraryNode)
        current_letter: unichar = 0
        first: bool = true
        for var track in tracks
            var title = track.title
            if title is not null
                var title_sort = track.title_sort
                var album = track.album
                var file_type = track.file_type
                var duration = track.duration

                // Separate by first letter
                if (title_sort is not null) && (title_sort.length > 0)
                    var letter = title_sort.get_char(0)
                    if letter != current_letter
                        current_letter = letter
                        if !first
                            node.append_separator()

                title = Markup.escape_text(title)
                title = format_annotation(title)
                if !is_lossless(file_type)
                    title = format_washed_out(title)
                
                markup1: string
                if album is not null
                    album = Markup.escape_text(album)
                    album = format_annotation(album)
                    markup1 = "%s - %s".printf(title, album)
                else
                    markup1 = title
                var markup2 = duration != double.MIN ? format_duration(duration) : null
                
                node.append_object(track.to_json(), track.title, markup1, markup2)
                
                first = false

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
