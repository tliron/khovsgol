[indent=4]

uses
    JsonUtil
    DbusUtil

namespace Khovsgol.GUI.Plugins

    /*
     * MPRIS2 plugin.
     * 
     * Allows controlling of the client over DBus. Often used for
     * for integration with desktop environments.
     */
    class Mpris2Plugin: Object implements Khovsgol.GUI.Plugin
        prop instance: Khovsgol.GUI.Instance
        
        def start()
            _object = new Mpris2(_instance)
            _player = new Mpris2Player(_connection_holder, _instance)
            _logger.info("Connecting to DBus")
            _owner_id = Bus.own_name(BusType.SESSION, "org.mpris.MediaPlayer2.khovsgol", GLib.BusNameOwnerFlags.NONE, on_bus_acquired, on_name_acquired, on_name_lost)
            if _owner_id == 0
                _logger.warning("Could not own name on DBus")
        
        def stop()
            var connection = _connection_holder.connection
            if connection is not null
                if _object_id != 0
                    connection.unregister_object(_object_id)
                    _object_id = 0
                if _player_id != 0
                    connection.unregister_object(_player_id)
                    _player_id = 0
                if _owner_id != 0
                    Bus.unown_name(_owner_id)
                    _owner_id = 0
                _connection_holder.connection = null
            _object = null
            _player = null
            _logger.message("Stopped")
        
        _connection_holder: ConnectionHolder = new ConnectionHolder()
        _owner_id: uint
        _object: Mpris2?
        _object_id: uint
        _player: Mpris2Player?
        _player_id: uint
        
        def private on_bus_acquired(connection: DBusConnection, name: string)
            _logger.info("Connected to DBus")
            _connection_holder.connection = connection
            try
                _object_id = connection.register_object("/org/mpris/MediaPlayer2", _object)
                _player_id = connection.register_object("/org/mpris/MediaPlayer2", _player)
                _logger.message("Started")
            except e: IOError
                _logger.warning(e.message)

        def private on_name_acquired(connection: DBusConnection, name: string)
            pass

        def private on_name_lost(connection: DBusConnection, name: string)
            pass
            
        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.mpris2")

    [DBus(name="org.mpris.MediaPlayer2")]
    class Mpris2: Object
        construct(instance: Khovsgol.GUI.Instance)
            _instance = instance
        
        prop readonly CanQuit: bool
            get
                return true

        prop readonly CanRaise: bool
            get
                return true

        prop readonly HasTrackList: bool
            get
                // TODO: in the future?
                return false

        prop readonly DesktopEntry: string
            owned get
                // Note: this matches the "music.khovsgol" type
                // registered with libindicate
                return "khovsgol"

        prop readonly Identity: string
            owned get
                return "Khövsgöl"

        prop readonly SupportedUriSchemes: array of string
            owned get
                return {"file"}

        prop readonly SupportedMimeTypes: array of string
            owned get
                return {
                    "application/x-ogg",
                    "application/ogg",
                    "audio/x-vorbis+ogg",
                    "audio/x-scpls",
                    "audio/x-mp3",
                    "audio/x-mpeg",
                    "audio/mpeg",
                    "audio/x-mpegurl",
                    "audio/x-flac",
                    "x-content/audio-cdda",
                    "x-content/audio-player"}

        def Quit()
            _instance.stop()

        def Raise()
            _instance.window.deiconify()
        
        _instance: Khovsgol.GUI.Instance

    [DBus(name="org.mpris.MediaPlayer2.Player")]
    class Mpris2Player: Object
        construct(connection_holder: ConnectionHolder, instance: Khovsgol.GUI.Instance)
            _properties = new Properties(connection_holder, "/org/mpris/MediaPlayer2", "org.mpris.MediaPlayer2.Player")
            _instance = instance
            _instance.api.play_mode_change.connect(on_play_mode_changed)
            _instance.api.cursor_mode_change.connect(on_cursor_mode_changed)
            _instance.api.position_in_track_change.connect(on_position_in_track_changed)
            _instance.api.play_list_change.connect(on_play_list_changed)
            _instance.api.position_in_play_list_change.connect(on_position_in_play_list_changed)
        
        final
            _instance.api.play_mode_change.disconnect(on_play_mode_changed)
            _instance.api.cursor_mode_change.disconnect(on_cursor_mode_changed)
            _instance.api.position_in_track_change.disconnect(on_position_in_track_changed)
            _instance.api.play_list_change.disconnect(on_play_list_changed)
            _instance.api.position_in_play_list_change.disconnect(on_position_in_play_list_changed)

        prop PlaybackStatus: string
            owned get
                return _PlaybackStatus
            set
                pass

        prop LoopStatus: string
            owned get
                return _LoopStatus
            set
                _LoopStatus = value
                if value == "None"
                    _instance.api.set_cursor_mode(_instance.player, "play_list")
                else if value == "Playlist"
                    _instance.api.set_cursor_mode(_instance.player, "repeat_play_list")
                else if value == "Track"
                    _instance.api.set_cursor_mode(_instance.player, "repeat_track")

        prop Rate: double
        
        prop Shuffle: bool
            get
                return _Shuffle
            set
                _Shuffle = value
                if value
                    _instance.api.set_cursor_mode(_instance.player, "repeat_track")
                else
                    _instance.api.set_cursor_mode(_instance.player, "play_list")
                    
        prop readonly Metadata: HashTable of string, Variant?
            owned get
                return _Metadata
                
        prop Volume: double

        prop readonly Position: int64
        prop readonly MinimumRate: double
        prop readonly MaximimRate: double
        prop readonly CanGoNext: bool = true
        prop readonly CanGoPrevious: bool = true
        prop readonly CanPlay: bool
        prop readonly CanPause: bool
        prop readonly CanSeek: bool
        prop readonly CanControl: bool = false
        
        event Seeked(position: int64)
        
        def Next()
            _instance.api.set_position_in_play_list_string(_instance.player, "next")

        def Previous()
            _instance.api.set_position_in_play_list_string(_instance.player, "prev")

        def Pause()
             _instance.api.set_play_mode(_instance.player, "paused")

        def PlayPause()
             _instance.api.set_play_mode(_instance.player, "toggle_paused")

        def Stop()
             _instance.api.set_play_mode(_instance.player, "stopped")

        def Play()
             _instance.api.set_play_mode(_instance.player, "playing")

        def Seek(offset: int64)
            if _position_in_track != double.MIN
                var position = _position_in_track + (offset / 1000000.0)
                _instance.api.set_position_in_track(_instance.player, position)

        def SetPosition(obj: string, position: int64)
            pass

        def OpenUri(uri: string)
            pass
        
        _instance: Khovsgol.GUI.Instance
        _position_in_track: double = double.MIN
        _tracks: IterableOfTrack
        _Shuffle: bool
        _PlaybackStatus: string = "Stopped"
        _LoopStatus: string = "None"
        _Metadata: HashTable of string, Variant? = new HashTable of string, Variant(str_hash, str_equal)

        def private on_play_mode_changed(play_mode: string?, old_play_mode: string?)
            if play_mode == "playing"
                _PlaybackStatus = "Playing"
                _CanPause = true
                _CanPlay = false
            else if play_mode == "paused"
                _PlaybackStatus = "Paused"
                _CanPause = false
                _CanPlay = true
            else
                _PlaybackStatus = "Stopped"
                _CanPause = false
                _CanPlay = true
            _properties.set("PlaybackStatus", _PlaybackStatus)
            _properties.set("CanPause", _CanPause)
            _properties.set("CanPlay", _CanPlay)
            _properties.emit_changes()

        def private on_cursor_mode_changed(cursor_mode: string?, old_cursor_mode: string?)
            if cursor_mode == "album"
                _LoopStatus = "None"
                _Shuffle = false
            else if cursor_mode == "play_list"
                _LoopStatus = "None"
                _Shuffle = false
            else if cursor_mode == "repeat_track"
                _LoopStatus = "Track"
                _Shuffle = false
            else if cursor_mode == "repeat_album"
                _LoopStatus = "None"
                _Shuffle = false
            else if cursor_mode == "repeat_play_list"
                _LoopStatus = "Playlist"
                _Shuffle = false
            else if cursor_mode == "shuffle"
                _LoopStatus = "None"
                _Shuffle = true
            else if cursor_mode == "repeat_shuffle"
                _LoopStatus = "Playlist"
                _Shuffle = true
            _properties.set("LoopStatus", _LoopStatus)
            _properties.set("Shuffle", _Shuffle)
            _properties.emit_changes()
            
        def private on_position_in_track_changed(position_in_track: double, old_position_in_track: double, track_duration: double)
            _position_in_track = position_in_track
            if position_in_track != double.MIN
                _Position = (int64) (position_in_track * 1000000)
            else
                _Position = 0
            _properties.set("Position", _Position)
            _properties.emit_changes()

        def private on_play_list_changed(id: string?, version: int64, old_id: string?, old_version: int64, tracks: IterableOfTrack)
            _tracks = tracks

        def private on_position_in_play_list_changed(position_in_play_list: int, old_position_in_play_list: int)
            for var track in _tracks
                var position = track.position
                if position == position_in_play_list
                    var path = track.path
                    if path is not null
                        var title = track.title
                        var artist = track.artist
                        var album = track.album
                        var duration = track.duration
                        
                        _Metadata.remove_all()
                        _Metadata.@set("mpris:trackid", path)
                        _Metadata.@set("xesam:title", title)
                        _Metadata.@set("xesam:artist", artist)
                        _Metadata.@set("xesam:album", album)
                        if duration != double.MIN
                            _Metadata.@set("mpris:length", (int) duration * 1000000)
                            
                        _properties.set("Metadata", _Metadata)
                        _properties.emit_changes()
                        break
        
        _properties: Properties
