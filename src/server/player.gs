[indent=4]

uses
    JsonUtil

namespace Khovsgol.Server

    enum PlayMode
        NULL = 0 // GLib requires a 0 value for the default
        STOPPED = 1
        PLAYING = 2
        PAUSED = 3
        TOGGLE_PAUSED = 10
    
    def get_play_mode_from_name(name: string): PlayMode
        if name == "stopped"
            return PlayMode.STOPPED
        else if name == "playing"
            return PlayMode.PLAYING
        else if name == "paused"
            return PlayMode.PAUSED
        else if name == "toggle_paused"
            return PlayMode.TOGGLE_PAUSED
        else
            return PlayMode.NULL

    def get_name_from_play_mode(mode: PlayMode): string?
        if mode == PlayMode.STOPPED
            return "stopped"
        else if mode == PlayMode.PLAYING
            return "playing"
        else if mode == PlayMode.PAUSED
            return "paused"
        else if mode == PlayMode.TOGGLE_PAUSED
            return "toggle_paused"
        else
            return null
    
    enum CursorMode
        NULL = 0 // GLib requires a 0 value for the default
        TRACK = 1
        ALBUM = 2
        PLAY_LIST = 3
        REPEAT_TRACK = 4
        REPEAT_ALBUM = 5
        REPEAT_PLAY_LIST = 6
        SHUFFLE = 7
        REPEAT_SHUFFLE = 8

    def get_cursor_mode_from_name(name: string): CursorMode
        if name == "track"
            return CursorMode.TRACK
        else if name == "album"
            return CursorMode.ALBUM
        else if name == "play_list"
            return CursorMode.PLAY_LIST
        else if name == "repeat_track"
            return CursorMode.REPEAT_TRACK
        else if name == "repeat_album"
            return CursorMode.REPEAT_ALBUM
        else if name == "repeat_play_list"
            return CursorMode.REPEAT_PLAY_LIST
        else if name == "shuffle"
            return CursorMode.SHUFFLE
        else if name == "repeat_shuffle"
            return CursorMode.REPEAT_SHUFFLE
        else
            return CursorMode.NULL
    
    def get_name_from_cursor_mode(mode: CursorMode): string?
        if mode == CursorMode.TRACK
            return "track"
        else if mode == CursorMode.ALBUM
            return "album"
        else if mode == CursorMode.PLAY_LIST
            return "play_list"
        else if mode == CursorMode.REPEAT_TRACK
            return "repeat_track"
        else if mode == CursorMode.REPEAT_ALBUM
            return "repeat_album"
        else if mode == CursorMode.REPEAT_PLAY_LIST
            return "repeat_play_list"
        else if mode == CursorMode.SHUFFLE
            return "shuffle"
        else if mode == CursorMode.REPEAT_SHUFFLE
            return "repeat_shuffle"
        else
            return null

    class Players: Object implements HasJsonArray
        prop crucible: Crucible
        prop players: dict of string, Player = new dict of string, Player
         
        def get_or_create_player(name: string): Player
            var player = _players[name]
            if player is null
                _players[name] = player = crucible.create_player()
                player.name = name
            return player

        def to_json(): Json.Array
            return to_object_array(_players.values)
    
    class abstract Player: Object implements HasJsonObject
        construct()
            cursor_mode = CursorMode.PLAY_LIST
    
        prop crucible: Crucible
        prop name: string
        prop plugs: list of Plug = new list of Plug

        prop readonly play_list: PlayList
            get
                if _play_list is null
                    _play_list = _crucible.create_play_list()
                    _play_list.player = self
                    try
                        _play_list.initialize()
                    except e: GLib.Error
                        Logging.get_logger("khovsgol.playlist").warning(e.message)
                return _play_list

        prop position_in_play_list: int
            get
                return _position_in_play_list
            set
                _position_in_play_list = value
                
                if _position_in_play_list < 1
                    _position_in_play_list = int.MIN
                    path = null
                else
                    var tracks = play_list.tracks
                    if _position_in_play_list > tracks.size
                        _position_in_play_list = int.MIN
                        path = null
                    else
                        var track = tracks[_position_in_play_list - 1]
                        path = track.path

        prop abstract path: string?
        prop abstract volume: double
        prop abstract play_mode: PlayMode
        prop abstract cursor_mode: CursorMode
        prop abstract position_in_track: double
        prop abstract ratio_in_track: double
        prop abstract readonly track_duration: double
        
        def prev()
            // TODO: different behavior for shuffle...
        
            position_in_play_list = _position_in_play_list - 1
            
        def next()
            var tracks = _play_list.tracks
            var size = tracks.size
            var mode = cursor_mode
            
            if mode == CursorMode.TRACK
                // Play first track if we are not pointing anywhere
                if _position_in_play_list == int.MIN
                    position_in_play_list = 1
                    return

            else if mode == CursorMode.ALBUM
                // Play first track if we are not pointing anywhere
                if _position_in_play_list == int.MIN
                    position_in_play_list = 1
                    return
                
                // Play subsequent track if it's in the same album
                else if _position_in_play_list < size
                    var current = tracks[_position_in_play_list - 1]
                    var next = tracks[_position_in_play_list]
                    if current.album_path == next.album_path
                        position_in_play_list = _position_in_play_list + 1
                        return
                
            else if mode == CursorMode.PLAY_LIST
                // Play first track if we are not pointing anywhere
                if _position_in_play_list == int.MIN
                    position_in_play_list = 1
                    return
                
                // Otherwise, play subsequent track
                else
                    position_in_play_list = _position_in_play_list + 1
                    return
                
            else if mode == CursorMode.REPEAT_TRACK
                // Play first track if we are not pointing anywhere
                if _position_in_play_list == int.MIN
                    position_in_play_list = 1
                    return
                
                // Otherwise, repeat our track
                else
                    position_in_play_list = _position_in_play_list
                    return
                
            else if mode == CursorMode.REPEAT_ALBUM
                // TODO
                pass
                
            else if mode == CursorMode.REPEAT_PLAY_LIST
                // Play first track if we are not pointing anywhere
                // Or if we're at the end
                if (_position_in_play_list == int.MIN) or (_position_in_play_list == size)
                    position_in_play_list = 1
                    return

                // Otherwise, play subsequent track
                else
                    position_in_play_list = _position_in_play_list + 1
                    return
                
            else if mode == CursorMode.SHUFFLE
                // TODO
                pass
                
            else if mode == CursorMode.REPEAT_SHUFFLE
                // TODO
                pass

            // Default to point nowhere
            position_in_play_list = int.MIN
        
        def to_json(): Json.Object
            var json = new Json.Object()
            set_string_member_not_null(json, "name", _name)
            set_double_member_not_min(json, "volume", volume)
            set_string_member_not_null(json, "playMode", get_name_from_play_mode(play_mode))
            set_string_member_not_null(json, "cursorMode", get_name_from_cursor_mode(cursor_mode))
            var plugs = new Json.Object()
            for var plug in _plugs
                plugs.set_object_member(plug.name, plug.to_json())
            json.set_object_member("plugs", plugs)
            var cursor = new Json.Object()
            set_int_member_not_min(cursor, "positionInPlayList", position_in_play_list)
            set_double_member_not_min(cursor, "positionInTrack", position_in_track)
            set_double_member_not_min(cursor, "trackDuration", track_duration)
            json.set_object_member("cursor", cursor)
            json.set_object_member("playList", play_list.to_json())
            return json
        
        _play_list: PlayList
        _position_in_play_list: int = int.MIN

    //
    // Plug
    //
    
    class Plug: Object implements HasJsonObject
        prop name: string
        
        def to_json(): Json.Object
            var json = new Json.Object()
            set_string_member_not_null(json, "name", _name)
            return json
