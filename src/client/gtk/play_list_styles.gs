[indent=4]

uses
    Gtk
    JsonUtil

namespace Khovsgol.Client.GUI
    
    interface PlayListStyle: Style
        def abstract fill(node: PlayListNode)
        def abstract gather_positions(node: PlayListNode, ref positions: Json.Array)
        def abstract get_first_position(node: PlayListNode): int
    
    /*
     * Uses header rows for all subsequent tracks of the same album,
     * allowing for a clutter-free view for users who tend to listen
     * to whole albums.
     */
    class GroupByAlbums: GLib.Object implements Style, PlayListStyle
        const private ALBUM_POSITION: int = -2

        prop readonly name: string = "group_by_albums"
        prop readonly label: string = "Group by albums"
        
        def fill(node: PlayListNode)
            current_album_path: string? = null
            current_album_positions: Json.Array? = null
            show_artist: bool = true
            first: bool = true
            var albums = new dict of string, Album
            for var track in node.tracks
                if track.album_path != current_album_path
                    current_album_path = track.album_path
                    current_album_positions = null
                    var album = albums[current_album_path]
                    if album is null
                        album = node.instance.api.get_album(current_album_path)
                    if album is not null
                        albums[current_album_path] = album
                        var compilation = album.compilation_type
                        if compilation != int.MIN
                            show_artist = compilation != 0
                        
                        var title = album.title
                        if title is not null
                            title = Markup.escape_text(title)
                            title = format_annotation(title)
                            var artist = album.artist
                            markup1: string
                            if artist is not null
                                artist = Markup.escape_text(artist)
                                markup1 = "%s - <i>%s</i>".printf(title, artist)
                            else
                                markup1 = title
                            markup1 = "<span size=\"smaller\" weight=\"bold\">%s</span>".printf(markup1)
                            if !first
                                node.append_separator()
                            node.append_object(album.to_json(), ALBUM_POSITION, album.title, markup1)
                            
                            current_album_positions = new Json.Array()
                            album.to_json().set_array_member("positions", current_album_positions)
                            first = false
                        
                var title = track.title
                if title is not null
                    var position = track.position
                    var duration = track.duration
                    title = Markup.escape_text(title)
                    title = format_annotation(title)
                    markup1: string
                    if show_artist
                        var artist = track.artist
                        if artist is not null
                            artist = Markup.escape_text(artist)
                            markup1 = "%d\t%s - <i>%s</i>".printf(position, title, artist)
                        else
                            markup1 = "%d\t%s".printf(position, title)
                    else
                        markup1 = "%d\t%s".printf(position, title)
                    var markup2 = format_duration(duration)
                    node.append_object(track.to_json(), position, track.title, markup1, markup2)
                    if current_album_positions is not null
                        current_album_positions.add_int_element(position)
                        
        def gather_positions(node: PlayListNode, ref positions: Json.Array)
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
                    var track_position = new Track.from_json(track).position
                    if track_position != int.MIN
                        positions.add_int_element(track_position)

        def get_first_position(node: PlayListNode): int
            var position = node.position
            if position == ALBUM_POSITION
                var album = node.as_object
                if album is not null
                    var album_positions = get_array_member_or_null(album, "positions")
                    if (album_positions is not null) && (album_positions.get_length() > 0)
                        return get_int_element_or_min(album_positions, 0)
                    
            else if position > 0
                var track = node.as_object
                if track is not null
                    return new Track.from_json(track).position
            
            return int.MIN
    
    /*
     * One line per track with minimal information.
     */
    class Compact: GLib.Object implements Style, PlayListStyle
        prop readonly name: string = "compact"
        prop readonly label: string = "Compact"
        
        def fill(node: PlayListNode)
            for var track in node.tracks
                var title = track.title
                if title is not null
                    var position = track.position
                    var duration = track.duration
                    var artist = track.artist
                    title = Markup.escape_text(title)
                    title = format_annotation(title)
                    markup1: string
                    if artist is not null
                        artist = Markup.escape_text(artist)
                        markup1 = "%d\t%s - <i>%s</i>".printf(position, title, artist)
                    else
                        markup1 = "%d\t%s".printf(position, title)
                    var markup2 = Markup.escape_text(format_duration(duration))
                    node.append_object(track.to_json(), position, track.title, markup1, markup2)

        def gather_positions(node: PlayListNode, ref positions: Json.Array)
            var track = node.as_object
            if track is not null
                var track_position = new Track.from_json(track).position
                if track_position != int.MIN
                    positions.add_int_element(track_position)

        def get_first_position(node: PlayListNode): int
            var track = node.as_object
            if track is not null
                return new Track.from_json(track).position
            else
                return int.MIN
    
    /*
     * Three lines per track with extended information.
     */
    class Extended: GLib.Object implements Style, PlayListStyle
        prop readonly name: string = "extended"
        prop readonly label: string = "Extended"
        
        def fill(node: PlayListNode)
            for var track in node.tracks
                var title = track.title
                if title is not null
                    var position = track.position
                    var duration = track.duration
                    var artist = track.artist
                    var album = track.album
                    title = Markup.escape_text(title)
                    title = format_annotation(title)
                    if artist is not null
                        artist = Markup.escape_text(artist)
                    if album is not null
                        album = Markup.escape_text(album)
                        album = format_annotation(album)
                    markup1: string
                    if (artist is not null) and (album is not null)
                        markup1 = "%d\t%s\r\t<span size=\"smaller\">By <i>%s</i></span>\r\t<span size=\"smaller\">In %s</span>".printf(position, title, artist, album)
                    else if (artist is not null) and (album is null)
                        markup1 = "%d\t%s\r\t<span size=\"smaller\">By <i>%s</i></span>".printf(position, title, artist)
                    else if (artist is null) and (album is not null)
                        markup1 = "%d\t%s\r\t<span size=\"smaller\">In %s</span>".printf(position, title, album)
                    else
                        markup1 = "%d\t%s".printf(position, title)
                    var markup2 = Markup.escape_text(format_duration(duration))
                    node.append_object(track.to_json(), position, track.title, markup1, markup2)

        def gather_positions(node: PlayListNode, ref positions: Json.Array)
            var track = node.as_object
            if track is not null
                var track_position = new Track.from_json(track).position
                if track_position != int.MIN
                    positions.add_int_element(track_position)

        def get_first_position(node: PlayListNode): int
            var track = node.as_object
            if track is not null
                return new Track.from_json(track).position
            else
                return int.MIN
