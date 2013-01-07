[indent=4]

namespace Khovsgol.Client.GTK.Styles

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
                if (title is null) or (title.length == 0)
                    title = get_title_from_path(track.path)
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
                    if (artist is not null) and (artist.length > 0)
                        artist = Markup.escape_text(artist)
                    else
                        artist = null
                    if (album is not null) and (album.length > 0)
                        album = Markup.escape_text(album)
                        album = format_annotation(album)
                    else
                        album = null

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
                    var duration_markup = get_duration_markup(duration, show_duration)
                    
                    node.append_object(track.to_json(), position_in_playlist, track.title, title_markup, duration_markup)
