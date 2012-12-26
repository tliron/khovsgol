[indent=4]

uses
    Gtk
    JsonUtil

namespace Khovsgol.Client.GTK
    
    interface PlaylistStyle: Style
        def abstract fill(node: PlaylistNode)
        def abstract gather_positions(node: PlaylistNode, ref positions: Json.Array)
        def abstract gather_paths(node: PlaylistNode, ref positions: Json.Array)
        def abstract get_first_position(node: PlaylistNode): int
    
    /*
     * Uses header rows for all subsequent tracks of the same album,
     * allowing for a clutter-free view for users who tend to listen
     * to whole albums.
     */
    class GroupByAlbums: GLib.Object implements Style, PlaylistStyle
        const private ALBUM_POSITION: int = -2

        prop readonly name: string = "group_by_albums"
        prop readonly label: string = "Group by albums"
        
        def fill(node: PlaylistNode)
            var subdue_lossy = node.instance.configuration.subdue_lossy
            var show_duration = node.instance.configuration.show_duration
            current_album_path: string? = null
            current_album_positions: Json.Array? = null
            current_album_paths: Json.Array? = null
            show_artist: bool = true
            first: bool = true
            var albums = new dict of string, Album
            for var track in node.tracks
                if track.album_path != current_album_path
                    current_album_path = track.album_path
                    current_album_positions = null
                    current_album_paths = null
                    var album = albums[current_album_path]
                    if album is null
                        album = node.get_album(current_album_path)
                    if album is not null
                        albums[current_album_path] = album
                        var compilation = album.album_type
                        if compilation != int.MIN
                            show_artist = compilation != 0
                        
                        var title = album.title
                        if title is not null
                            var file_type = album.file_type

                            title = Markup.escape_text(title)
                            title = format_annotation(title)
                            if subdue_lossy and not is_lossless(file_type)
                                title = format_washed_out(title)
                            var artist = album.artist

                            title_markup: string
                            if artist is not null
                                artist = Markup.escape_text(artist)
                                title_markup = "%s - <i>%s</i>".printf(title, artist)
                            else
                                title_markup = title
                            title_markup = "<span size=\"smaller\" weight=\"bold\">%s</span>".printf(title_markup)
                            
                            if not first
                                node.append_separator()
                                
                            node.append_object(album.to_json(), ALBUM_POSITION, album.title, title_markup)
                            
                            current_album_positions = new Json.Array()
                            current_album_paths = new Json.Array()
                            var json = album.to_json()
                            json.set_array_member("positions", current_album_positions)
                            json.set_array_member("paths", current_album_paths)
                            first = false
                        
                var title = track.title
                if title is not null
                    var path = track.path
                    var position = track.position_in_playlist
                    var duration = track.duration
                    var file_type = track.file_type
                    
                    title = Markup.escape_text(title)
                    title = format_annotation(title)
                    if subdue_lossy and not is_lossless(file_type)
                        title = format_washed_out(title)

                    title_markup: string
                    if show_artist
                        var artist = track.artist
                        if artist is not null
                            artist = Markup.escape_text(artist)
                            title_markup = "%d\t%s - <i>%s</i>".printf(position, title, artist)
                        else
                            title_markup = "%d\t%s".printf(position, title)
                    else
                        title_markup = "%d\t%s".printf(position, title)
                    var duration_markup = (show_duration and duration != int.MIN) ? format_duration(duration) : ""
                    
                    node.append_object(track.to_json(), position, track.title, title_markup, duration_markup)
                    
                    if (current_album_positions is not null) and (position != int.MIN)
                        current_album_positions.add_int_element(position)
                    if (current_album_paths is not null) and (path is not null)
                        current_album_paths.add_string_element(path)
                        
        def gather_positions(node: PlaylistNode, ref positions: Json.Array)
            var position = node.position
            if position == ALBUM_POSITION
                var album = node.as_object
                if album is not null
                    var album_positions = get_array_member_or_null(album, "positions")
                    if album_positions is not null
                        array_concat(positions, album_positions)
                    
            else if position > 0
                var track = node.as_object
                if track is not null
                    var track_position = new Track.from_json(track).position_in_playlist
                    if track_position != int.MIN
                        positions.add_int_element(track_position)

        def gather_paths(node: PlaylistNode, ref positions: Json.Array)
            var position = node.position
            if position == ALBUM_POSITION
                var album = node.as_object
                if album is not null
                    var album_positions = get_array_member_or_null(album, "paths")
                    if album_positions is not null
                        array_concat(positions, album_positions)
                    
            else if position > 0
                var track = node.as_object
                if track is not null
                    var path = new Track.from_json(track).path
                    if path is not null
                        positions.add_string_element(path)

        def get_first_position(node: PlaylistNode): int
            var position = node.position
            if position == ALBUM_POSITION
                var album = node.as_object
                if album is not null
                    var album_positions = get_array_member_or_null(album, "positions")
                    if (album_positions is not null) and (album_positions.get_length() > 0)
                        return get_int_element_or_min(album_positions, 0)
                    
            else if position > 0
                var track = node.as_object
                if track is not null
                    return new Track.from_json(track).position_in_playlist
            
            return int.MIN
    
    /*
     * Base for styles which have one track per line.
     */
    class abstract CommonPlaylistStyle: GLib.Object implements Style, PlaylistStyle
        prop abstract readonly name: string
        prop abstract readonly label: string
        
        def abstract fill(node: PlaylistNode)

        def gather_positions(node: PlaylistNode, ref positions: Json.Array)
            var track = node.as_object
            if track is not null
                var position = new Track.from_json(track).position_in_playlist
                if position != int.MIN
                    positions.add_int_element(position)

        def gather_paths(node: PlaylistNode, ref positions: Json.Array)
            var track = node.as_object
            if track is not null
                var path = new Track.from_json(track).path
                if path is not null
                    positions.add_string_element(path)

        def get_first_position(node: PlaylistNode): int
            var track = node.as_object
            if track is not null
                return new Track.from_json(track).position_in_playlist
            else
                return int.MIN
    
    /*
     * One line per track with minimal information.
     */
    class Compact: CommonPlaylistStyle
        prop override readonly name: string = "compact"
        prop override readonly label: string = "Compact"
        
        def override fill(node: PlaylistNode)
            var subdue_lossy = node.instance.configuration.subdue_lossy
            var show_duration = node.instance.configuration.show_duration
            for var track in node.tracks
                var title = track.title
                if title is not null
                    var position = track.position_in_playlist
                    var duration = track.duration
                    var artist = track.artist
                    var file_type = track.file_type
                    
                    title = Markup.escape_text(title)
                    title = format_annotation(title)
                    if subdue_lossy and not is_lossless(file_type)
                        title = format_washed_out(title)

                    title_markup: string
                    if artist is not null
                        artist = Markup.escape_text(artist)
                        title_markup = "%d\t%s - <i>%s</i>".printf(position, title, artist)
                    else
                        title_markup = "%d\t%s".printf(position, title)
                    var duration_markup = (show_duration and duration != int.MIN) ? Markup.escape_text(format_duration(duration)) : ""
                    
                    node.append_object(track.to_json(), position, track.title, title_markup, duration_markup)
    
    /*
     * Three lines per track with extended information.
     */
    class Extended: CommonPlaylistStyle
        prop override readonly name: string = "extended"
        prop override readonly label: string = "Extended"
        
        def override fill(node: PlaylistNode)
            var subdue_lossy = node.instance.configuration.subdue_lossy
            var show_duration = node.instance.configuration.show_duration
            for var track in node.tracks
                var title = track.title
                if title is not null
                    var position_in_playlist = track.position_in_playlist
                    var position_in_album = track.position_in_album
                    var duration = track.duration
                    var artist = track.artist
                    var album = track.album
                    var file_type = track.file_type
                    
                    title = Markup.escape_text(title)
                    title = format_annotation(title)
                    if subdue_lossy and not is_lossless(file_type)
                        title = format_washed_out(title)
                    if artist is not null
                        artist = Markup.escape_text(artist)
                    if album is not null
                        album = Markup.escape_text(album)
                        album = format_annotation(album)

                    title_markup: string
                    if (artist is not null) and (album is not null) and (position_in_album != int.MIN)
                        title_markup = "%d\t%s\r\t<span size=\"smaller\">By <i>%s</i></span>\r\t<span size=\"smaller\">%s in %s</span>".printf(position_in_playlist, title, artist, format_ordinal(position_in_album), album)
                    else if (artist is not null) and (album is not null)
                        title_markup = "%d\t%s\r\t<span size=\"smaller\">By <i>%s</i></span>\r\t<span size=\"smaller\">In %s</span>".printf(position_in_playlist, title, artist, album)
                    else if (artist is not null) and (album is null)
                        title_markup = "%d\t%s\r\t<span size=\"smaller\">By <i>%s</i></span>".printf(position_in_playlist, title, artist)
                    else if (artist is null) and (album is not null)
                        title_markup = "%d\t%s\r\t<span size=\"smaller\">In %s</span>".printf(position_in_playlist, title, album)
                    else
                        title_markup = "%d\t%s".printf(position_in_playlist, title)
                    var duration_markup = (show_duration and duration != int.MIN) ? Markup.escape_text(format_duration(duration)) : ""
                    
                    node.append_object(track.to_json(), position_in_playlist, track.title, title_markup, duration_markup)
