[indent=4]

uses
    JsonUtil

namespace Khovsgol.Client.GTK.Styles

    /*
     * Base for styles that have albums and their tracks.
     */
    class abstract CommonAlbums: GLib.Object implements Style, LibraryStyle
        construct(album_type: AlbumType = AlbumType.ANY)
            _album_type = album_type
    
        prop abstract readonly name: string
        prop abstract readonly label: string

        def fill(node: LibraryNode, filter: string?)
            var subdue_lossy = node.instance.configuration.subdue_lossy
            var show_duration = node.instance.configuration.show_duration
            var level = node.level
            if level == 0
                if filter is null
                    // Albums
                    var args = new Client.API.GetAlbumsArgs()
                    if _album_type != AlbumType.ANY
                        args.album_type = _album_type
                    args.sort.add("title_sort")
                    args.libraries.add_all(node.instance.libraries)
                    fill_albums(node.instance.api.get_albums(args), node, subdue_lossy)
                else
                    // Albums (with tracks cached inside each node)
                    var first = true
                    current_album_path: string? = null
                    current_tracks: Json.Array? = null
                    current_letter: unichar = 0

                    var args = new Client.API.GetTracksArgs()
                    var like = "%" + filter + "%"
                    args.search_artist = like
                    args.search_album = like
                    args.search_title = like
                    if _album_type != AlbumType.ANY
                        args.album_type = _album_type
                    args.sort.add("album_sort")
                    args.sort.add("position")
                    args.libraries.add_all(node.instance.libraries)
                    for var track in node.instance.api.get_tracks(args)
                        var album_path = track.album_path
                        
                        if (album_path is not null) and (current_album_path != album_path)
                            // New album
                            current_album_path = album_path
                            current_tracks = new Json.Array()
                            
                            var album = node.instance.api.get_album(current_album_path)
                            if album is not null
                                var sort = album.title_sort
                            
                                // Separate by first letter
                                if (sort is not null) and (sort.length > 0)
                                    var letter = sort.get_char(0)
                                    if letter != current_letter
                                        current_letter = letter
                                        if not first
                                            node.append_separator()

                                album.to_json().set_array_member("_tracks", current_tracks)
                                fill_album(album, node, subdue_lossy)
                            
                                first = false
                        
                        if current_tracks is not null
                            current_tracks.add_object_element(track.to_json())

            else if level == 1
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
                var album_node = node.as_object

                // Try cache
                var tracks = get_array_member_or_null(album_node, "_tracks")
                if tracks is not null
                    gather_from_tracks(new JsonTracks(tracks), node, ref paths)
                else
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
                
        _album_type: AlbumType
    
    /*
     * All albums ordered alphabetically.
     */
    class AllAlbums: CommonAlbums
        prop override readonly name: string = "albums"
        prop override readonly label: string = "Albums and playlists"
    
    /*
     * Playlists only.
     */
    class Playlists: CommonAlbums
        construct()
            super(AlbumType.SAVED_PLAYLIST)
    
        prop override readonly name: string = "playlists"
        prop override readonly label: string = "Playlists"
