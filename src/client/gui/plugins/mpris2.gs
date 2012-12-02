[indent=4]

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
            _logger.info("Connecting to DBus")
            _owner_id = Bus.own_name(BusType.SESSION, "org.mpris.MediaPlayer2.khovsgol", GLib.BusNameOwnerFlags.NONE, on_bus_acquired, on_name_acquired, on_name_lost)
            if _owner_id == 0
                _logger.warning("Could not own name on DBus")
        
        def stop()
            if _connection is not null
                if _object_id != 0
                    _connection.unregister_object(_object_id)
                if _player_id != 0
                    _connection.unregister_object(_player_id)
                if _owner_id != 0
                    Bus.unown_name(_owner_id)
                _logger.message("Stopped")
                    
        _owner_id: uint
        _connection: DBusConnection
        _object: Mpris2
        _object_id: uint
        _player: Mpris2Player
        _player_id: uint
        
        def private on_bus_acquired(connection: DBusConnection, name: string)
            _connection = connection
            _object = new Mpris2(_instance)
            _player = new Mpris2Player(_instance)
            try
                _object_id = _connection.register_object("/org/mpris/MediaPlayer2", _object)
                _player_id = _connection.register_object("/org/mpris/MediaPlayer2", _player)
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
                return false

        prop readonly DesktopEntry: string
            get
                return "khovsgol"

        prop readonly Identity: string
            owned get
                return "Khövsgöl"

        prop readonly SupportedUriSchemes: array of string
            owned get
                return {"file"}

        prop readonly SupportedMimeTypes: array of string
            owned get
                return {"application/x-ogg",
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
        construct(instance: Khovsgol.GUI.Instance)
            _instance = instance

        prop readonly PlaybackStatus: string
            owned get
                // Stopped, Playing, Paused, Stopped
                return ""

        prop readonly LoopStatus: string
            owned get
                // None, Track, Playlist
                return ""

        prop Rate: double
        prop Shuffle: bool
        prop Metadata: HashTable of string, Variant? = new HashTable of string, Variant(str_hash, str_equal)
        prop Volume: double
        prop Position: int64
        prop MinimumRate: double
        prop MaximimRate: double
        prop CanGoNext: bool
        prop CanGoPrevious: bool
        prop CanPlay: bool
        prop CanPause: bool
        prop CanSeek: bool
        prop CanControl: bool
        
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
            pass

        def SetPosition(obj: string, position: int64)
            pass

        def OpenUri(uri: string)
            pass
        
        _instance: Khovsgol.GUI.Instance
