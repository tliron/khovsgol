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
                    var artist = node.as_array
                    if (artist is not null) && (artist.get_length() > 0)
                        var name = get_string_element_or_null(artist, 0)
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
                var album = node.as_object
                if album is not null
                    var path = get_string_member_or_null(album, "path")
                    if path is not null
                        var compilation = get_int_member_or_min(album, "compilation")
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
                    var artist = node.as_array
                    if (artist is not null) && (artist.get_length() > 0)
                        var name = get_string_element_or_null(artist, 0)
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
                var album = node.as_object
                if album is not null
                    var path = get_string_member_or_null(album, "path")
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
                var artist = node.as_array
                if (artist is not null) && (artist.get_length() > 0)
                    var name = get_string_element_or_null(artist, 0)
                    if name is not null
                        var args = new Client.API.GetTracksArgs()
                        args.by_artist = name
                        args.sort.add("title_sort")
                        fill_tracks(node.instance.api.get_tracks(args), node)

        def gather_tracks(node: LibraryNode, ref paths: Json.Array)
            var level = node.level
            if level == 1
                // All tracks for artist
                var artist = node.as_array
                if (artist is not null) && (artist.get_length() > 0)
                    var name = get_string_element_or_null(artist, 0)
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
                var dates = node.instance.api.get_dates()
                if (dates is not null) && (dates.get_length() > 0)
                    current_decade: int = int.MIN
                    for var i = 0 to (dates.get_length() - 1)
                        var date = get_int_element_or_min(dates, i)
                        if date != int.MIN
                            // Seperate by decade
                            var decade = date / 10
                            if decade != current_decade
                                current_decade = decade
                                if i > 0
                                    node.append_separator()
                        
                            var date_string = date.to_string()
                            node.append_int(date, date_string, date_string, null, true)

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
                var album = node.as_object
                if album is not null
                    var path = get_string_member_or_null(album, "path")
                    if path is not null
                        var compilation = get_int_member_or_min(album, "compilation")
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
                var album = node.as_object
                if album is not null
                    var path = get_string_member_or_null(album, "path")
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
                var album = node.as_object
                if album is not null
                    var path = get_string_member_or_null(album, "path")
                    if path is not null
                        var compilation = get_int_member_or_min(album, "compilation")
                        var args = new Client.API.GetTracksArgs()
                        args.in_album = path
                        args.sort.add("position")
                        fill_tracks_in_album(node.instance.api.get_tracks(args), compilation > 0, node)

        def gather_tracks(node: LibraryNode, ref paths: Json.Array)
            var level = node.level
            if level == 1
                // All paths in album
                var album = node.as_object
                if album is not null
                    var path = get_string_member_or_null(album, "path")
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
                var album = node.as_object
                if album is not null
                    var path = get_string_member_or_null(album, "path")
                    if path is not null
                        var args = new Client.API.GetTracksArgs()
                        args.in_album = path
                        args.sort.add("position")
                        fill_tracks_in_album(node.instance.api.get_tracks(args), true, node)

        def gather_tracks(node: LibraryNode, ref paths: Json.Array)
            var level = node.level
            if level == 1
                // All paths in album
                var album = node.as_object
                if album is not null
                    var path = get_string_member_or_null(album, "path")
                    if path is not null
                        var args = new Client.API.GetTracksArgs()
                        args.in_album = path
                        args.sort.add("position")
                        gather_from_tracks(node.instance.api.get_tracks(args), node, ref paths)

            else if level == 2
                // The track's path
                gather_from_track(node, ref paths)

    def private fill_artists(artists: Json.Array?, node: LibraryNode)
        if (artists is not null) && (artists.get_length() > 0)
            current_letter: unichar = 0
            for var i = 0 to (artists.get_length() - 1)
                var artist = get_array_element_or_null(artists, i)
                if (artist is not null) && (artist.get_length() >= 2)
                    var name = get_string_element_or_null(artist, 0)
                    if name is not null
                        var name_sort = get_string_element_or_null(artist, 1)
                        
                        // Separate by first letter
                        if (name_sort is not null) && (name_sort.length > 0)
                            var letter = name_sort.get_char(0)
                            if letter != current_letter
                                current_letter = letter
                                if i > 0
                                    node.append_separator()
                                    
                        var markup = Markup.escape_text(name)
                        node.append_array(artist, name_sort, markup, null, true)
 
    def private fill_albums_by(albums: Json.Array?, node: LibraryNode)
        if (albums is not null) && (albums.get_length() > 0)
            for var i = 0 to (albums.get_length() - 1)
                var album = get_object_element_or_null(albums, i)
                if album is not null
                    var title = get_string_member_or_null(album, "title")
                    if title is not null
                        var title_sort = get_string_member_or_null(album, "title_sort")
                        var file_type = get_string_member_or_null(album, "type")
                        var date = get_int_member_or_min(album, "date")
                        title = Markup.escape_text(title)
                        title = format_annotation(title)
                        if !is_lossless(file_type)
                            title = format_washed_out(title)
                        var markup = date != int.MIN ? "%d: %s".printf(date, title) : title
                        node.append_object(album, title_sort, markup, null, true)

    def private fill_albums(albums: Json.Array?, node: LibraryNode)
        if (albums is not null) && (albums.get_length() > 0)
            current_letter: unichar = 0
            for var i = 0 to (albums.get_length() - 1)
                var album = get_object_element_or_null(albums, i)
                if album is not null
                    var title = get_string_member_or_null(album, "title")
                    if title is not null
                        var title_sort = get_string_member_or_null(album, "title_sort")
                        var file_type = get_string_member_or_null(album, "type")
                        var artist = get_string_member_or_null(album, "artist")

                        // Separate by first letter
                        if (title_sort is not null) && (title_sort.length > 0)
                            var letter = title_sort.get_char(0)
                            if letter != current_letter
                                current_letter = letter
                                if i > 0
                                    node.append_separator()

                        title = Markup.escape_text(title)
                        title = format_annotation(title)
                        if artist is not null
                            artist = Markup.escape_text(artist)
                        if !is_lossless(file_type)
                            title = format_washed_out(title)
                        var markup = artist is not null ? "%s - <i>%s</i>".printf(title, artist) : title
                        node.append_object(album, title_sort, markup, null, true)

    def private fill_tracks_in_album(tracks: Json.Array?, is_compilation: bool, node: LibraryNode)
        if (tracks is not null) && (tracks.get_length() > 0)
            for var i = 0 to (tracks.get_length() - 1)
                var track = get_object_element_or_null(tracks, i)
                if track is not null
                    var title = get_string_member_or_null(track, "title")
                    if title is not null
                        var title_sort = get_string_member_or_null(track, "title_sort")
                        var file_type = get_string_member_or_null(track, "type")
                        var position = get_int_member_or_min(track, "position")
                        var duration = get_double_member_or_min(track, "duration")
                        var artist = is_compilation ? get_string_member_or_null(track, "artist") : null
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
                        node.append_object(track, title_sort, markup1, markup2)

    def private fill_tracks(tracks: Json.Array?, node: LibraryNode)
        if (tracks is not null) && (tracks.get_length() > 0)
            current_letter: unichar = 0
            for var i = 0 to (tracks.get_length() - 1)
                var track = get_object_element_or_null(tracks, i)
                if track is not null
                    var title = get_string_member_or_null(track, "title")
                    if title is not null
                        var title_sort = get_string_member_or_null(track, "title_sort")
                        var file_type = get_string_member_or_null(track, "type")
                        var duration = get_double_member_or_min(track, "duration")

                        // Separate by first letter
                        if (title_sort is not null) && (title_sort.length > 0)
                            var letter = title_sort.get_char(0)
                            if letter != current_letter
                                current_letter = letter
                                if i > 0
                                    node.append_separator()

                        title = Markup.escape_text(title)
                        title = format_annotation(title)
                        if !is_lossless(file_type)
                            title = format_washed_out(title)

                        var markup2 = duration != double.MIN ? format_duration(duration) : null
                        node.append_object(track, title_sort, title, markup2)

    def private gather_from_albums(albums: Json.Array?, node: LibraryNode, ref paths: Json.Array)
        if (albums is not null) && (albums.get_length() > 0)
            for var i = 0 to (albums.get_length() - 1)
                var album = get_object_element_or_null(albums, i)
                if album is not null
                    var path = get_string_member_or_null(album, "path")
                    if path is not null
                        var args2 = new Client.API.GetTracksArgs()
                        args2.in_album = path
                        args2.sort.add("position")
                        var tracks2 = node.instance.api.get_tracks(args2)
                        if (tracks2 is not null) && (tracks2.get_length() > 0)
                            for var i2 = 0 to (tracks2.get_length() - 1)
                                var track = get_object_element_or_null(tracks2, i2)
                                if track is not null
                                    var track_path = get_string_member_or_null(track, "path")
                                    if track_path is not null
                                        paths.add_string_element(track_path)

    def private gather_from_tracks(tracks: Json.Array?, node: LibraryNode, ref paths: Json.Array)
        if (tracks is not null) && (tracks.get_length() > 0)
            for var i = 0 to (tracks.get_length() - 1)
                var track = get_object_element_or_null(tracks, i)
                if track is not null
                    var path = get_string_member_or_null(track, "path")
                    if path is not null
                        paths.add_string_element(path)

    def private gather_from_track(node: LibraryNode, ref paths: Json.Array)
        var track = node.as_object
        if track is not null
            var path = get_string_member_or_null(track, "path")
            if path is not null
                paths.add_string_element(path)
