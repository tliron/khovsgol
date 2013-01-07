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
        else if name == "playlist"
            return CursorMode.PLAY_LIST
        else if name == "repeat_track"
            return CursorMode.REPEAT_TRACK
        else if name == "repeat_album"
            return CursorMode.REPEAT_ALBUM
        else if name == "repeat_playlist"
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
            return "playlist"
        else if mode == CursorMode.REPEAT_TRACK
            return "repeat_track"
        else if mode == CursorMode.REPEAT_ALBUM
            return "repeat_album"
        else if mode == CursorMode.REPEAT_PLAY_LIST
            return "repeat_playlist"
        else if mode == CursorMode.SHUFFLE
            return "shuffle"
        else if mode == CursorMode.REPEAT_SHUFFLE
            return "repeat_shuffle"
        else
            return null

    class Players: Object implements HasJsonArray
        prop crucible: Crucible
        prop configuration: Configuration
        prop players: dict of string, Player = new dict of string, Player
    
        def virtual initialize()
            for var name in _configuration.players
                get_or_create_player(name)
         
        def get_or_create_player(name: string): Player
            var player = _players[name]
            if player is null
                _logger.messagef("Creating player: %s", name)
                _players[name] = player = crucible.create_player()
                player.crucible = _crucible
                player.configuration = _configuration
                player.name = name
                player.initialize()
            return player

        def to_json(): Json.Array
            return to_object_array(_players.values)
    
    class abstract Player: Object implements HasJsonObject
        construct()
            cursor_mode = CursorMode.PLAY_LIST
    
        prop crucible: Crucible
        prop configuration: Configuration
        prop name: string
        prop plugs: Gee.Iterable of Plug
            get
                return _plugs

        prop readonly playlist: Playlist
            get
                if _playlist is null
                    _playlist = _crucible.create_playlist()
                    _playlist.player = self
                    try
                        _playlist.initialize()
                    except e: GLib.Error
                        _logger.warning(e.message)
                return _playlist

        /*
         * Setting this to a valid value will switch the play mode to PLAYING.
         */
        prop position_in_playlist: int
            get
                return _position_in_playlist
            set
                _position_in_playlist = value
                
                if _position_in_playlist < 1
                    _position_in_playlist = int.MIN
                    path = null
                else
                    var tracks = playlist.tracks
                    if _position_in_playlist > tracks.size
                        _position_in_playlist = int.MIN
                        path = null
                    else
                        var track = tracks[_position_in_playlist - 1]
                        path = track.path
                        play_mode = PlayMode.PLAYING
                
                if _position_in_playlist != _configuration.get_position_in_playlist(_name)
                    _configuration.set_position_in_playlist(_name, _position_in_playlist)
                    _configuration.save()

        prop abstract path: string?
        prop abstract volume: double
        prop abstract play_mode: PlayMode
        prop abstract cursor_mode: CursorMode
        prop abstract position_in_track: double
        prop abstract ratio_in_track: double
        prop abstract readonly track_duration: double
        
        def virtual initialize()
            for var spec in _configuration.get_plugs(_name)
                var plug = new Plug(spec)
                _plugs.add(plug)
                _logger.messagef("Set plug: %s, %s", _name, spec)
            
            _position_in_playlist = _configuration.get_position_in_playlist(_name)

            var tracks = playlist.tracks
            if _position_in_playlist > tracks.size
                _position_in_playlist = int.MIN
            else if _position_in_playlist > 0
                var track = tracks[_position_in_playlist - 1]
                path = track.path
                
            var volume = _configuration.get_volume(name)
            if volume != double.MIN
                self.volume = volume

            var play_mode = _configuration.get_play_mode(_name)
            if play_mode is not null
                self.play_mode = get_play_mode_from_name(play_mode)
         
        def prev()
            // TODO: different behavior for shuffle...
        
            position_in_playlist = _position_in_playlist - 1
            
        def next()
            var tracks = _playlist.tracks
            var size = tracks.size
            var mode = cursor_mode
            
            if mode == CursorMode.TRACK
                // Play first track if we are not pointing anywhere
                if _position_in_playlist == int.MIN
                    position_in_playlist = 1
                    return

            else if mode == CursorMode.ALBUM
                // Play first track if we are not pointing anywhere
                if _position_in_playlist == int.MIN
                    position_in_playlist = 1
                    return
                
                // Play subsequent track if it's in the same album
                else if _position_in_playlist < size
                    var current = tracks[_position_in_playlist - 1]
                    var next = tracks[_position_in_playlist]
                    if current.album_path == next.album_path
                        position_in_playlist = _position_in_playlist + 1
                        return
                
            else if mode == CursorMode.PLAY_LIST
                // Play first track if we are not pointing anywhere
                if _position_in_playlist == int.MIN
                    position_in_playlist = 1
                    return
                
                // Otherwise, play subsequent track
                else
                    position_in_playlist = _position_in_playlist + 1
                    return
                
            else if mode == CursorMode.REPEAT_TRACK
                // Play first track if we are not pointing anywhere
                if _position_in_playlist == int.MIN
                    position_in_playlist = 1
                    return
                
                // Otherwise, repeat our track
                else
                    position_in_playlist = _position_in_playlist
                    return
                
            else if mode == CursorMode.REPEAT_ALBUM
                // TODO
                pass
                
            else if mode == CursorMode.REPEAT_PLAY_LIST
                // Play first track if we are not pointing anywhere
                // Or if we're at the end
                if (_position_in_playlist == int.MIN) or (_position_in_playlist == size)
                    position_in_playlist = 1
                    return

                // Otherwise, play subsequent track
                else
                    position_in_playlist = _position_in_playlist + 1
                    return
                
            else if mode == CursorMode.SHUFFLE
                // TODO
                pass
                
            else if mode == CursorMode.REPEAT_SHUFFLE
                // TODO
                pass

            // Default to point nowhere
            position_in_playlist = int.MIN
        
        def abstract validate_spec(spec: string, default_host: string?): string?
        
        def virtual get_plug(spec: string, default_host: string?): Plug?
            var valid_spec = validate_spec(spec, default_host)
            if valid_spec is not null
                for var plug in _plugs
                    if plug.spec == valid_spec
                        return plug
            return null
        
        def virtual set_plug(spec: string, default_host: string?): Plug?
            var plug = get_plug(spec, default_host)
            if plug is null
                var valid_spec = validate_spec(spec, default_host)
                if valid_spec is not null
                    plug = new Plug(valid_spec)
                    _plugs.add(plug)
                    _configuration.add_plug(_name, valid_spec)
                    _configuration.save()
                    _logger.messagef("Set plug: %s, %s", _name, valid_spec)
            return plug
        
        def virtual remove_plug(spec: string, default_host: string?): bool
            var valid_spec = validate_spec(spec, default_host)
            if valid_spec is not null
                var i = _plugs.iterator()
                while i.next()
                    var plug = i.@get()
                        if plug.spec == valid_spec
                            i.remove()
                            _configuration.delete_plug(_name, valid_spec)
                            _configuration.save()
                            _logger.messagef("Removed plug: %s, %s", _name, valid_spec)
                            return true
            return false
        
        def to_json(): Json.Object
            var json = new Json.Object()
            set_string_member_not_empty(json, "name", _name)
            set_double_member_not_min(json, "volume", volume)
            set_string_member_not_empty(json, "playMode", get_name_from_play_mode(play_mode))
            set_string_member_not_empty(json, "cursorMode", get_name_from_cursor_mode(cursor_mode))
            var plugs = new Json.Array()
            for var plug in _plugs
                plugs.add_object_element(plug.to_json())
            json.set_array_member("plugs", plugs)
            var cursor = new Json.Object()
            set_int_member_not_min(cursor, "positionInPlaylist", position_in_playlist)
            set_double_member_not_min(cursor, "positionInTrack", position_in_track)
            set_double_member_not_min(cursor, "trackDuration", track_duration)
            json.set_object_member("cursor", cursor)
            json.set_object_member("playList", playlist.to_json())
            return json
        
        _plugs: list of Plug = new list of Plug
        _playlist: Playlist
        _position_in_playlist: int = int.MIN

    //
    // Plug
    //
    
    class Plug: Object implements HasJsonObject
        construct(spec: string)
            _spec = spec
        
        prop spec: string
        
        def to_json(): Json.Object
            var json = new Json.Object()
            set_string_member_not_null(json, "spec", _spec)
            return json
