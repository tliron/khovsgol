[indent=4]

namespace Khovsgol.Client.GTK.Styles

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
                if (title is null) or (title.length == 0)
                    title = get_title_from_path(track.path)
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
                    if (artist is not null) and (artist.length > 0)
                        artist = Markup.escape_text(artist)
                        title_markup = "%d\t%s - <i>%s</i>".printf(position, title, artist)
                    else
                        title_markup = "%d\t%s".printf(position, title)
                    var duration_markup = get_duration_markup(duration, show_duration)
                    
                    node.append_object(track.to_json(), position, track.title, title_markup, duration_markup)
