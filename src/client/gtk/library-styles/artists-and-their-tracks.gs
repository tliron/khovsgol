[indent=4]

uses
    Gtk
    JsonUtil

namespace Khovsgol.Client.GTK.Styles

    /*
     * Artists and their tracks ordered alphabetically.
     */
    class ArtistsAndTheirTracks: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "artists_tracks"
        prop readonly label: string = "Artists and their tracks"
        
        def fill(node: LibraryNode, filter: string?)
            var subdue_lossy = node.instance.configuration.subdue_lossy
            var show_duration = node.instance.configuration.show_duration
            var level = node.level
            if level == 0
                if filter is null
                    // Artists
                    var args = new Client.API.GetArtistsArgs()
                    args.album_artists = false
                    args.sort.add("artist_sort")
                    args.libraries.add_all(node.instance.libraries)
                    fill_artists(node.instance.api.get_artists(args), node)
                else
                    // Artists (with all tracks cached inside each node)
                    var first = true
                    current_tracks: Json.Array? = null
                    current_letter: unichar = 0
                    last_artist_name: string? = null

                    var args = new Client.API.GetTracksArgs()
                    var like = "%" + filter + "%"
                    args.search_artist = like
                    args.search_album = like
                    args.search_title = like
                    args.album_type = AlbumType.ARTIST
                    args.sort.add("artist_sort")
                    args.sort.add("title_sort")
                    args.libraries.add_all(node.instance.libraries)
                    for var track in node.instance.api.get_tracks(args)
                        var artist_name = track.artist
                        
                        if artist_name != last_artist_name
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
                            var json = fill_artist(artist, node)
                            if json is not null
                                current_tracks = new Json.Array()
                                json.set_array_member("_tracks", current_tracks)
                            else
                                current_tracks = null
                            
                            first = false

                        if current_tracks is not null
                            current_tracks.add_object_element(track.to_json())

            else if level == 1
                var artist_node = node.as_object
            
                // Try cache
                var tracks = get_array_member_or_null(artist_node, "_tracks")
                if tracks is not null
                    // Tracks with artist (from cache)
                    for var track in new JsonTracks(tracks)
                        fill_track(track, node, subdue_lossy, show_duration)
                else
                    // Tracks with artist
                    var artist = new Artist.from_json(artist_node)
                    var name = artist.name
                    if name is not null
                        var args = new Client.API.GetTracksArgs()
                        args.by_artist = name
                        args.sort.add("title_sort")
                        args.libraries.add_all(node.instance.libraries)
                        fill_tracks(node.instance.api.get_tracks(args), node, subdue_lossy, show_duration)
        
        def gather_tracks(node: LibraryNode, ref paths: Json.Array)
            var level = node.level
            if level == 1
                var artist_node = node.as_object
            
                // Try cache
                var tracks = get_array_member_or_null(artist_node, "_tracks")
                if tracks is not null
                    gather_from_tracks(new JsonTracks(tracks), node, ref paths)
                else
                    // All tracks for artist
                    var artist = new Artist.from_json(node.as_object)
                    var name = artist.name
                    if name is not null
                        var args = new Client.API.GetTracksArgs()
                        args.by_artist = name
                        args.sort.add("title_sort")
                        args.libraries.add_all(node.instance.libraries)
                        gather_from_tracks(node.instance.api.get_tracks(args), node, ref paths)

            else if level == 2
                // The track's path
                gather_from_track(node, ref paths)
