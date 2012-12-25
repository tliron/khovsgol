[indent=4]

uses
    Scrobbling

namespace Khovsgol.Client.Features

    // These are for Khövsgöl only, please DO NOT use them in other applications!
    const LAST_FM_API_KEY: string = "1ef211ea88ffba1e15a5d63c1cc623d8"
    const LAST_FM_API_SECRET: string = "42bf0581d4fdce799edd93794becb20d"

    /*
     * Scrobbling feature.
     */
    class ScrobblingFeature: Object implements Feature
        prop readonly name: string = "scrobbling"
        prop readonly label: string = "Scrobble to online service"
        prop readonly persistent: bool = true
        prop readonly state: FeatureState
            get
                return (FeatureState) AtomicInt.@get(ref _state)

        prop instance: Instance
        
        def start()
            if state == FeatureState.STOPPED
                set_state(FeatureState.STARTING)
                
                var service = _instance.configuration.scrobbling_service
                var username = _instance.configuration.scrobbling_username
                var password = _instance.configuration.scrobbling_password

                if (username is null) or (password is null)
                    set_state(FeatureState.STOPPED)
                    return

                try
                    if service == "last.fm"
                        _session = new Session(LAST_FM_API, LAST_FM_AUTH_API, LAST_FM_API_KEY, LAST_FM_API_SECRET)
                    else
                        _logger.warningf("Unsupported service: %s", service)
                        set_state(FeatureState.STOPPED)
                        return
                        
                    _session.connection.connect(on_connection)
                    _session.@connect(username, password)
                except e: GLib.Error
                    _logger.exception(e)
                    set_state(FeatureState.STOPPED)
        
        def stop()
            if state == FeatureState.STARTED
                set_state(FeatureState.STOPPING)
                _instance.api.track_change.disconnect(on_track_changed)
                _instance.api.position_in_track_change.disconnect(on_position_in_track_changed)
                _session = null
                set_state(FeatureState.STOPPED)
        
        _state: int = FeatureState.STOPPED
        _session: Session?
        _track: Track
        _timestamp: int64

        def private set_state(state: FeatureState)
            AtomicInt.@set(ref _state, state)
            _logger.message(get_name_from_feature_state(state))
            state_change(state)

        def private on_connection(success: bool)
            if success
                set_state(FeatureState.STARTED)
                _instance.api.track_change.connect(on_track_changed)
                _instance.api.position_in_track_change.connect(on_position_in_track_changed)
                _instance.api.reset_watch()
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
            _logger = Logging.get_logger("khovsgol.scrobbling")
