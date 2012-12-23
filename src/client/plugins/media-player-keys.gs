[indent=4]

namespace Khovsgol.Client.Plugins

    /*
     * GNOME Media Player Keys plugin.
     * 
     * Grabs the media player keys for us and forwards commands to
     * the current player.
     * 
     * Supports a fallback for the GNOME 2.20 interface.
     */
    class MediaPlayerKeysPlugin: Object implements Plugin
        prop readonly name: string = "media-player-keys"
        prop instance: Instance
        prop readonly started: bool
        
        def start()
            if _media_keys is null
                try
                    _media_keys = new MediaKeysWrapper()
                except e: IOError
                    _logger.exception(e)
        
            if _media_keys is not null
                try
                    _media_keys.grab_media_player_keys("Khövsgöl", 0)
                    _media_keys.media_player_key_pressed.connect(on_key_pressed)
                    _started = true
                    _logger.message("Started")
                except e: IOError
                    _logger.exception(e)
        
        def stop()
            if _started
                try
                    _media_keys.media_player_key_pressed.disconnect(on_key_pressed)
                    _media_keys.release_media_player_keys("Khövsgöl")
                    _media_keys = null
                    _started = false
                    _logger.message("Stopped")
                except e: IOError
                    _logger.exception(e)
        
        _media_keys: MediaKeysWrapper

        def private on_key_pressed(application: string, key: string)
            _logger.infof("Pressed: %s", key)
            if key == "Play"
                // For many keyboards the play button is identical to the play/pause button
                _instance.api.set_play_mode(_instance.player, "toggle_paused")
            else if key == "Pause"
                _instance.api.set_play_mode(_instance.player, "toggle_paused")
            else if key == "Stop"
                _instance.api.set_play_mode(_instance.player, "stopped")
            else if key == "Previous"
                _instance.api.set_position_in_playlist_string(_instance.player, "prev")
            else if key == "Next"
                _instance.api.set_position_in_playlist_string(_instance.player, "next")

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.media-player-keys")

        /*
         * Wrapper that fallbacks to legacy interface.
         */
        class private MediaKeysWrapper
            construct() raises IOError
                try
                    _media_keys = Bus.get_proxy_sync(BusType.SESSION, "org.gnome.SettingsDaemon", "/org/gnome/SettingsDaemon/MediaKeys")
                    _media_keys.media_player_key_pressed.connect(on_key_pressed)
                except e: IOError
                    _media_keys_legacy = Bus.get_proxy_sync(BusType.SESSION, "org.gnome.SettingsDaemon", "/org/gnome/SettingsDaemon")
                    _media_keys_legacy.media_player_key_pressed.connect(on_key_pressed)
            
            def grab_media_player_keys(application: string, time: uint32) raises IOError
                if _media_keys is not null
                    _media_keys.grab_media_player_keys(application, time)
                else
                    _media_keys_legacy.grab_media_player_keys(application, time)

            def release_media_player_keys(application: string) raises IOError
                if _media_keys is not null
                    _media_keys.release_media_player_keys(application)
                else
                    _media_keys_legacy.release_media_player_keys(application)
            
            event media_player_key_pressed(application: string, key: string)
            
            _media_keys: MediaKeys
            _media_keys_legacy: MediaKeysLegacy
            
            def private on_key_pressed(application: string, key: string)
                media_player_key_pressed(application, key)

    // GNOME 2.22+
    [DBus(name="org.gnome.SettingsDaemon.MediaKeys")]
    interface private MediaKeys: Object
        def abstract grab_media_player_keys(application: string, time: uint32) raises IOError
        def abstract release_media_player_keys(application: string) raises IOError
        event abstract media_player_key_pressed(application: string, key: string)
            
    // GNOME 2.20
    [DBus(name="org.gnome.SettingsDaemon")]
    interface private MediaKeysLegacy: Object
        def abstract grab_media_player_keys(application: string, time: uint32) raises IOError
        def abstract release_media_player_keys(application: string) raises IOError
        event abstract media_player_key_pressed(application: string, key: string)
