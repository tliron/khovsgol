[indent=4]

uses
    Gtk
    JsonUtil
    Khovsgol

namespace Khovsgol.GUI

    interface LibraryStyle: Style
        def abstract fill(node: LibraryNode)
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
                fill_artists(node.instance.api.get_artists(true, "artist_sort"), node)

                // Compilation section
                node.append_separator()
                node.append_string("compilations", "compilations", "<b>Compilations</b>", null, true)
                node.append_string("custom", "customcompilations", "<b>Custom Compilations</b>", null, true)
            
            else if level == 1
                var node_type = node.node_type
                if node_type == Json.NodeType.ARRAY
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
                    args.compilation_type = node.as_string == "custom" ? 2 : 1
                    args.sort.add("date")
                    args.sort.add("title_sort")
                    fill_albums_by(node.instance.api.get_albums(args), node)

            else if level == 2
                // Tracks in album
                var album = new Album.from_json(node.as_object)
                var path = album.path
                if path is not null
                    var compilation = album.compilation_type
                    var args = new Client.API.GetTracksArgs()
                    args.in_album = path
                    args.sort.add("position")
                    fill_tracks_in_album(node.instance.api.get_tracks(args), compilation > 0, node)
        
        def gather_tracks(node: LibraryNode, ref paths: Json.Array)
            var level = node.level
            if level == 1
                var node_type = node.node_type
                if node_type == Json.NodeType.ARRAY
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
                    args.compilation_type = node.as_string == "custom" ? 2 : 1
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
                    var compilation = album.compilation_type
                    var args = new Client.API.GetTracksArgs()
                    args.in_album = path
                    args.sort.add("position")
                    fill_tracks_in_album(node.instance.api.get_tracks(args), compilation > 0, node)

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
                    var compilation = album.compilation_type
                    var args = new Client.API.GetTracksArgs()
                    args.in_album = path
                    args.sort.add("position")
                    fill_tracks_in_album(node.instance.api.get_tracks(args), compilation > 0, node)

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
                args.compilation_type = 2
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

    def private fill_artists(artists: IterableOfArtist, node: LibraryNode)
        current_letter: unichar = 0
        first: bool = true
        for var artist in artists
            var name = artist.name
            if name is not null
                var sort = artist.sort
                
                // Separate by first letter
                if (sort is not null) && (sort.length > 0)
                    var letter = sort.get_char(0)
                    if letter != current_letter
                        current_letter = letter
                        if !first
                            node.append_separator()
                            
                var markup = Markup.escape_text(name)
                node.append_object(artist.to_json(), sort, markup, null, true)
                first = false
 
    def private fill_albums_by(albums: IterableOfAlbum, node: LibraryNode)
        for var album in albums
            var title = album.title
            if title is not null
                var title_sort = album.title_sort
                var file_type = album.file_type
                var date = album.date
                title = Markup.escape_text(title)
                title = format_annotation(title)
                if !is_lossless(file_type)
                    title = format_washed_out(title)
                var markup = date != int64.MIN ? "%d: %s".printf((int) date, title) : title
                node.append_object(album.to_json(), title_sort, markup, null, true)

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
                node.append_object(album.to_json(), title_sort, markup, null, true)
                first = false

    def private fill_tracks_in_album(tracks: IterableOfTrack, is_compilation: bool, node: LibraryNode)
        for var track in tracks
            var title = track.title
            if title is not null
                var title_sort = track.title_sort
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
                node.append_object(track.to_json(), title_sort, markup1, markup2)

    def private fill_tracks(tracks: IterableOfTrack, node: LibraryNode)
        current_letter: unichar = 0
        first: bool = true
        for var track in tracks
            var title = track.title
            if title is not null
                var title_sort = track.title_sort
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

                var markup2 = duration != double.MIN ? format_duration(duration) : null
                node.append_object(track.to_json(), title_sort, title, markup2)
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
