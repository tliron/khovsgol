[indent=4]

uses
    Gtk
    JsonUtil

namespace Khovsgol.Client.GTK.Styles

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
