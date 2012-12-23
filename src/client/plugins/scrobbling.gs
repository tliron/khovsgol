[indent=4]

uses
    Scrobbling

namespace Khovsgol.Client.Plugins

    // These are for Khövsgöl only, please DO NOT use them in other applications!
    const LAST_FM_API_KEY: string = "1ef211ea88ffba1e15a5d63c1cc623d8"
    const LAST_FM_API_SECRET: string = "42bf0581d4fdce799edd93794becb20d"

    /*
     * Scrobbling plugin.
     */
    class ScrobblingPlugin: Object implements Plugin
        prop readonly name: string = "scrobbling"
        prop instance: Instance
        prop readonly state: PluginState
            get
                return (PluginState) AtomicInt.@get(ref _state)
        
        def start()
            if state == PluginState.STOPPED
                set_state(PluginState.STARTING)

                if _first_start and not _instance.configuration.scrobbling_autostart
                    _first_start = false
                    return
                _first_start = false
                
                var service = _instance.configuration.scrobbling_service
                var username = _instance.configuration.scrobbling_username
                var password = _instance.configuration.scrobbling_password

                if (username is null) or (password is null)
                    set_state(PluginState.STOPPED)
                    return

                try
                    if service == "last.fm"
                        _session = new Session(LAST_FM_API, LAST_FM_AUTH_API, LAST_FM_API_KEY, LAST_FM_API_SECRET)
                    else
                        _logger.warningf("Unsupported service: %s", service)
                        set_state(PluginState.STOPPED)
                        return
                        
                    _session.connection.connect(on_connection)
                    _logger.message("Connecting")
                    _session.@connect(username, password)
                except e: GLib.Error
                    _logger.exception(e)
                    set_state(PluginState.STOPPED)
        
        def stop()
            if state == PluginState.STARTED
                set_state(PluginState.STOPPING)
                _instance.api.track_change.disconnect(on_track_changed)
                _instance.api.position_in_track_change.disconnect(on_position_in_track_changed)
                set_state(PluginState.STOPPED)
                _logger.message("Stopped")
        
        _state: int = PluginState.STOPPED
        _first_start: bool = true
        _session: Session?
        _track: Track
        _timestamp: int64

        def private set_state(state: PluginState)
            AtomicInt.@set(ref _state, state)

        def private on_connection(success: bool)
            if success
                set_state(PluginState.STARTED)
                _instance.api.track_change.connect(on_track_changed)
                _instance.api.position_in_track_change.connect(on_position_in_track_changed)
                _instance.api.reset_watch()
                _logger.message("Started")
            else
                _logger.warning("Could not connect")
                _instance.api.error(new IOError.FAILED("Could not connect to Last.fm"))

        def private on_track_changed(track: Track?, old_track: Track?)
            _timestamp = get_real_time()
            _track = track

            if track is not null
                try
                    _session.track_updateNowPlaying(track.title, track.artist, track.album, track.position_in_album, track.duration != double.MIN ? (int) track.duration : int.MIN)
                    _logger.infof("Updated now playing: %s", track.path)
                except e: GLib.Error
                    _logger.exception(e)
        
        def private on_position_in_track_changed(position_in_track: double, old_position_in_track: double, track_duration: double)
            // See: http://www.last.fm/api/scrobbling#when-is-a-scrobble-a-scrobble
            if (_track is not null) and (track_duration > 30) and ((position_in_track > track_duration / 2) or (position_in_track > 240))
                var track = _track
                _track = null
                
                // Note: we are preferring the duration reported here rather than the one tagged in the track
                try
                    _session.track_scrobble((int) (_timestamp / 1000000L), track.title, track.artist, track.album, track.position_in_album, track_duration != double.MIN ? (int) track.duration : int.MIN)
                    _logger.infof("Scrobbled: %s", track.path)
                except e: GLib.Error
                    _logger.exception(e)

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.scrobbling")
