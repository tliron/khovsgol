[indent=4]

uses
    LastFm

namespace Khovsgol.Client.Plugins

    /*
     * Last.fm Scrobbling plugin.
     */
    class LastFmPlugin: Object implements Plugin
        construct() raises GLib.Error
            _session = new Session("1ef211ea88ffba1e15a5d63c1cc623d8", "42bf0581d4fdce799edd93794becb20d")
            _session.connection.connect(on_connection)
    
        prop instance: Instance

        def start()
            if _instance.configuration.last_fm
                var username = _instance.configuration.last_fm_username
                var password = _instance.configuration.last_fm_password
                if (username is not null) and (password is not null)
                    try
                        _session.@connect(username, password)
                    except e: GLib.Error
                        _logger.exception(e)
        
        def stop()
            if _connected
                _connected = false
                _instance.api.track_change.disconnect(on_track_changed)
                _instance.api.position_in_track_change.disconnect(on_position_in_track_changed)
                _logger.message("Stopped")
        
        def private on_connection(success: bool)
            if success
                _connected = true
                _instance.api.track_change.connect(on_track_changed)
                _instance.api.position_in_track_change.connect(on_position_in_track_changed)
                _instance.api.reset_watch()
                _logger.messagef("Started for \"%s\"", "emblemparade")
            else
                _logger.warningf("Could not authenticate \"%s\"", "emblemparade")

        def private on_track_changed(track: Track?, old_track: Track?)
            _started = get_real_time()
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
                    _session.track_scrobble((int) (_started / 1000000L), track.title, track.artist, track.album, track.position_in_album, track_duration != double.MIN ? (int) track.duration : int.MIN)
                    _logger.infof("Scrobbled: %s", track.path)
                except e: GLib.Error
                    _logger.exception(e)

        _session: Session?
        _connected: bool
        _track: Track
        _started: int64

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.last-fm")
