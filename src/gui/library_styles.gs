[indent=4]

uses
    Gtk
    JsonUtil
    Khovsgol

namespace Khovsgol.GUI
    
    interface LibraryStyle: Style
        def abstract fill(node: LibraryNode)
        def abstract gather_tracks(node: LibraryNode, ref tracks: Json.Array)
    
    class ArtistsAndTheirAlbums: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "artists_albums"
        prop readonly label: string = "Artists and their albums"

        def fill(node: LibraryNode)
            var level = node.level
            if level == 0
                // Album artists
                var artists = node.instance.api.get_artists(true, "artist_sort")
                if (artists is not null) && (artists.get_length() > 0)
                    for var i = 0 to (artists.get_length() - 1)
                        var artist = get_array_element_or_null(artists, i)
                        if (artist is not null) && (artist.get_length() >= 2)
                            var name = get_string_element_or_null(artist, 0)
                            var name_sort = get_string_element_or_null(artist, 1)
                            var markup = Markup.escape_text(name)
                            if name is not null
                                node.append_array(artist, name_sort, markup, null, true)
            
            else if level == 1
                // Albums by artist
                var artist = node.as_array
                if (artist is not null) && (artist.get_length() > 0)
                    var name = get_string_element_or_null(artist, 0)
                    if name is not null
                        var args = new Client.API.GetAlbumsArgs()
                        args.by_artist = name
                        args.sort.add("date")
                        args.sort.add("title_sort")
                        var albums = node.instance.api.get_albums(args)
                        if (albums is not null) && (albums.get_length() > 0)
                            for var i = 0 to (albums.get_length() - 1)
                                var album = get_object_element_or_null(albums, i)
                                if album is not null
                                    var date = get_int_member_or_min(album, "date")
                                    var title = get_string_member_or_null(album, "title")
                                    var title_sort = get_string_member_or_null(album, "title_sort")
                                    var file_type = get_string_member_or_null(album, "type")
                                    var markup = date != int.MIN ? "%d: %s".printf(date, title) : title
                                    markup = Markup.escape_text(markup)
                                    if file_type != "flac"
                                        markup = "<span color=\"#888888\">%s</span>".printf(markup)
                                    node.append_object(album, title_sort, markup, null, true)

            else if level == 2
                // Tracks in album
                var album = node.as_object
                if album is not null
                    var path = get_string_member_or_null(album, "path")
                    if path is not null
                        var args = new Client.API.GetTracksArgs()
                        args.in_album = path
                        args.sort.add("position")
                        var tracks = node.instance.api.get_tracks(args)
                        if (tracks is not null) && (tracks.get_length() > 0)
                            for var i = 0 to (tracks.get_length() - 1)
                                var track = get_object_element_or_null(tracks, i)
                                if track is not null
                                    var title = get_string_member_or_null(track, "title")
                                    var title_sort = get_string_member_or_null(track, "title_sort")
                                    var file_type = get_string_member_or_null(album, "type")
                                    var position = get_int_member_or_min(track, "position")
                                    var markup = position != int.MIN ? "%d\t%s".printf(position, title) : title
                                    markup = Markup.escape_text(markup)
                                    if file_type != "flac"
                                        markup = "<span color=\"#888888\">%s</span>".printf(markup)
                                    node.append_object(track, title_sort, markup)

        def gather_tracks(node: LibraryNode, ref tracks: Json.Array)
            var level = node.level
            if level == 1
                // Artist
                var artist = node.as_array
                if (artist is not null) && (artist.get_length() > 0)
                    var name = get_string_element_or_null(artist, 0)
                    if name is not null
                        var args = new Client.API.GetAlbumsArgs()
                        args.by_artist = name
                        args.sort.add("date")
                        args.sort.add("title_sort")
                        var albums = node.instance.api.get_albums(args)
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
                                                        tracks.add_string_element(track_path)

            else if level == 2
                // Album
                var album = node.as_object
                if album is not null
                    var path = get_string_member_or_null(album, "path")
                    if path is not null
                        var args = new Client.API.GetTracksArgs()
                        args.in_album = path
                        args.sort.add("position")
                        var tracks2 = node.instance.api.get_tracks(args)
                        if (tracks2 is not null) && (tracks2.get_length() > 0)
                            for var i = 0 to (tracks2.get_length() - 1)
                                var track = get_object_element_or_null(tracks2, i)
                                if track is not null
                                    var track_path = get_string_member_or_null(track, "path")
                                    if track_path is not null
                                        tracks.add_string_element(track_path)

            else if level == 3
                // Track
                var track = node.as_object
                if track is not null
                    var path = get_string_member_or_null(track, "path")
                    if path is not null
                        tracks.add_string_element(path)
     
    class ArtistsAndTheirTracks: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "artists_tracks"
        prop readonly label: string = "Artists and their tracks"
        
        def fill(node: LibraryNode)
            pass

        def gather_tracks(node: LibraryNode, ref tracks: Json.Array)
            pass
     
    class YearsAndAlbums: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "years_albums"
        prop readonly label: string = "Years and albums"
        
        def fill(node: LibraryNode)
            pass

        def gather_tracks(node: LibraryNode, ref tracks: Json.Array)
            pass
     
    class AllAlbums: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "albums"
        prop readonly label: string = "All albums"
        
        def fill(node: LibraryNode)
            pass

        def gather_tracks(node: LibraryNode, ref tracks: Json.Array)
            pass
     
    class CustomCompilations: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "custom_albums"
        prop readonly label: string = "Custom compilations"
        
        def fill(node: LibraryNode)
            pass

        def gather_tracks(node: LibraryNode, ref tracks: Json.Array)
            pass
