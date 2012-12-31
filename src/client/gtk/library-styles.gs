[indent=4]

uses
    Gtk
    JsonUtil

namespace Khovsgol.Client.GTK

    interface LibraryStyle: Style
        def abstract fill(node: LibraryNode, filter: string?)
        def abstract gather_tracks(node: LibraryNode, ref paths: Json.Array)
    
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
                    if fill_artists(node.instance.api.get_artists(true, "artist_sort"), node)
                        node.append_separator()
        
                    // Compilation section
                    node.append_string("compilations", "compilations", "<b>Compilations</b>", null, true)
                    node.append_string("playlists", "playlists", "<b>Playlists</b>", null, true)
                else
                    // Album artists (with all albums and tracks cached inside each node)
                    first: bool = true
                    current_album_path: string? = null
                    current_albums: Json.Array? = null
                    current_tracks: Json.Array? = null
                    current_letter: unichar = 0
                    last_artist_name: string? = null
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

                    if !first and ((compilations.get_length() > 0) or (playlists.get_length() > 0))
                        node.append_separator()
                    
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
                            fill_albums_by(node.instance.api.get_albums(args), node, subdue_lossy)
                else
                    // Compilations
                    var args = new Client.API.GetAlbumsArgs()
                    args.album_type = node.as_string == "playlist" ? AlbumType.SAVED_PLAYLIST : AlbumType.COMPILATION
                    args.sort.add("date")
                    args.sort.add("title_sort")
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
                            gather_from_albums(node.instance.api.get_albums(args), node, ref paths)
                else
                    // All paths by compilation type, one album at a time
                    var args = new Client.API.GetAlbumsArgs()
                    args.album_type = node.as_string == "playlist" ? 2 : 1
                    args.sort.add("date")
                    args.sort.add("title_sort")
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
                    fill_artists(node.instance.api.get_artists(false, "artist_sort"), node)
                else
                    // Artists (with all tracks cached inside each node)
                    first: bool = true
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
        
        def fill(node: LibraryNode, filter: string?)
            var subdue_lossy = node.instance.configuration.subdue_lossy
            var show_duration = node.instance.configuration.show_duration
            var level = node.level
            if level == 0
                if filter is null
                    // Dates
                    current_decade: int = int.MIN
                    first: bool = true
                    for var date in node.instance.api.get_dates()
                        // Seperate by decade
                        var decade = date / 10
                        if decade != current_decade
                            current_decade = decade
                            if not first
                                node.append_separator()
                    
                        var date_string = date.to_string()
                        node.append_int(date, date_string, date != 0 ? date_string : "Unknown", null, true)
                        first = false
                else
                    // Dates (with all albums and tracks cached inside each node)
                    first: bool = true
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
                    if date != int.MIN
                        var args = new Client.API.GetAlbumsArgs()
                        args.at_date = date
                        args.sort.add("title_sort")
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
                    fill_albums(node.instance.api.get_albums(args), node, subdue_lossy)
                else
                    // Albums (with tracks cached inside each node)
                    first: bool = true
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
    
    //
    // Utilities
    //

    def private fill_artists(artists: IterableOfArtist, node: LibraryNode): bool
        current_letter: unichar = 0
        first: bool = true
        for var artist in artists
            if artist.name is not null
                var sort = artist.sort
                
                // Separate by first letter
                if (sort is not null) and (sort.length > 0)
                    var letter = sort.get_char(0)
                    if letter != current_letter
                        current_letter = letter
                        if not first
                            node.append_separator()
                            
                fill_artist(artist, node)
                
                first = false
        return not first
    
    def private fill_artist(artist: Artist, node: LibraryNode): Json.Object?
        var name = artist.name
        if name is not null
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
        if title is null
            title = album.path
        if title is not null
            var file_type = album.file_type
            var date = album.date
            
            title = Markup.escape_text(title)
            title = format_annotation(title)
            if subdue_lossy and not is_lossless(file_type)
                title = format_washed_out(title)
            var markup = ((date != int64.MIN) && (date != 0)) ? "%lld: %s".printf(date, title) : title
            
            node.append_object(album.to_json(), album.title, markup, null, true)

    def private fill_albums(albums: IterableOfAlbum, node: LibraryNode, subdue_lossy: bool)
        current_letter: unichar = 0
        first: bool = true
        for var album in albums
            var title = album.title
            if title is not null
                var title_sort = album.title_sort

                // Separate by first letter
                if (title_sort is not null) and (title_sort.length > 0)
                    var letter = title_sort.get_char(0)
                    if letter != current_letter
                        current_letter = letter
                        if not first
                            node.append_separator()
                
                fill_album(album, node, subdue_lossy)
                
                first = false

    def private fill_album(album: Album, node: LibraryNode, subdue_lossy: bool)
        var title = album.title
        if title is null
            title = album.path
        if title is not null
            var file_type = album.file_type
            var artist = album.artist

            title = Markup.escape_text(title)
            title = format_annotation(title)
            if subdue_lossy and not is_lossless(file_type)
                title = format_washed_out(title)
            if artist is not null
                artist = Markup.escape_text(artist)
            var markup = artist is not null ? "%s - <i>%s</i>".printf(title, artist) : title
            
            node.append_object(album.to_json(), album.title, markup, null, true)

    def private fill_tracks_in_album(tracks: IterableOfTrack, is_compilation: bool, node: LibraryNode, subdue_lossy: bool, show_duration: bool)
        for var track in tracks
            fill_track_in_album(track, is_compilation, node, subdue_lossy, show_duration)
                
    def private fill_track_in_album(track: Track, is_compilation: bool, node: LibraryNode, subdue_lossy: bool, show_duration: bool)
        var title = track.title
        if title is null
            title = track.path
        if title is not null
            var file_type = track.file_type
            var position = track.position_in_album
            var duration = track.duration
            var artist = is_compilation ? track.artist : null
            
            title = Markup.escape_text(title)
            title = format_annotation(title)
            if subdue_lossy and not is_lossless(file_type)
                title = format_washed_out(title)
            if artist is not null
                artist = Markup.escape_text(artist)
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
        first: bool = true
        for var track in tracks
            var title = track.title
            if title is not null
                var title_sort = track.title_sort

                // Separate by first letter
                if (title_sort is not null) and (title_sort.length > 0)
                    var letter = title_sort.get_char(0)
                    if letter != current_letter
                        current_letter = letter
                        if not first
                            node.append_separator()
                            
                fill_track(track, node, subdue_lossy, show_duration)
                
                first = false

    def private fill_track(track: Track, node: LibraryNode, subdue_lossy: bool, show_duration: bool)
        var title = track.title
        if title is null
            title = track.path
        if title is not null
            var album = track.album
            var file_type = track.file_type
            var duration = track.duration

            title = Markup.escape_text(title)
            title = format_annotation(title)
            if subdue_lossy and not is_lossless(file_type)
                title = format_washed_out(title)
            
            title_markup: string
            if album is not null
                album = Markup.escape_text(album)
                album = format_annotation(album)
                title_markup = "%s - %s".printf(title, album)
            else
                title_markup = title
            var duration_markup = get_duration_markup(duration, show_duration)
            
            node.append_object(track.to_json(), track.title, title_markup, duration_markup)

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
