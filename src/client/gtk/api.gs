[indent=4]

uses
    Nap
    JsonUtil

namespace Khovsgol.Client.GTK

    /*
     * Adds a "_gdk" version to all events. These are called within the GDK thread,
     * via Gdk.threads_add_idle(), guaranteeing them for safe use with GTK+.
     */
    class API: Client.API
        construct()
            connection_change.connect(on_connection_change)
            error.connect(on_error)
            volume_change.connect(on_volume_change)
            play_mode_change.connect(on_play_mode_change)
            cursor_mode_change.connect(on_cursor_mode_change)
            position_in_playlist_change.connect(on_position_in_playlist_change)
            position_in_track_change.connect(on_position_in_track_change)
            playlist_change.connect(on_playlist_change)
            track_change.connect(on_track_change)

        event connection_change_gdk(host: string?, port: uint, player: string?, old_host: string?, old_port: uint, old_player: string?)
        event error_gdk(e: GLib.Error)
        event volume_change_gdk(volume: double, old_volume: double)
        event play_mode_change_gdk(play_mode: string?, old_play_mode: string?)
        event cursor_mode_change_gdk(cursor_mode: string?, old_cursor_mode: string?)
        event position_in_playlist_change_gdk(position_in_playlist: int, old_position_in_playlist: int)
        event position_in_track_change_gdk(position_in_track: double, old_position_in_track: double, track_duration: double)
        event playlist_change_gdk(id: string?, version: int64, old_id: string?, old_version: int64, tracks: IterableOfTrack, albums: IterableOfAlbum)
        event track_change_gdk(track: Track?, old_track: Track?)
        
        prop static in_gdk: bool
            get
                return AtomicInt.get(ref _in_gdk) == 1
            set
                AtomicInt.set(ref _in_gdk, value ? 1 : 0)

        _in_gdk: static int = 0

        def private on_connection_change(host: string?, port: uint, player: string?, old_host: string?, old_port: uint, old_player: string?)
            if in_gdk
                connection_change_gdk(host, port, player, old_host, old_port, old_player)
            else
                new ConnectionChangeGdk(self, host, port, player, old_host, old_port, old_player)
        
        def private on_error(e: GLib.Error)
            if in_gdk
                error_gdk(e)
            else
                new ErrorGdk(self, e)
            
        def private on_volume_change(volume: double, old_volume: double)
            if in_gdk
                volume_change_gdk(volume, old_volume)
            else
                new VolumeChangeGdk(self, volume, old_volume)
            
        def private on_play_mode_change(play_mode: string?, old_play_mode: string?)
            if in_gdk
                play_mode_change_gdk(play_mode, old_play_mode)
            else
                new PlayModeChangeGdk(self, play_mode, old_play_mode)
            
        def private on_cursor_mode_change(cursor_mode: string?, old_cursor_mode: string?)
            if in_gdk
                cursor_mode_change_gdk(cursor_mode, old_cursor_mode)
            else
                new CursorModeChangeGdk(self, cursor_mode, old_cursor_mode)
            
        def private on_position_in_playlist_change(position_in_playlist: int, old_position_in_playlist: int)
            if in_gdk
                position_in_playlist_change_gdk(position_in_playlist, old_position_in_playlist)
            else
                new PositionInPlaylistChangeGdk(self, position_in_playlist, old_position_in_playlist)
            
        def private on_position_in_track_change(position_in_track: double, old_position_in_track: double, track_duration: double)
            if in_gdk
                position_in_track_change_gdk(position_in_track, old_position_in_track, track_duration)
            else
                new PositionInTrackChangeGdk(self, position_in_track, old_position_in_track, track_duration)
            
        def private on_playlist_change(id: string?, version: int64, old_id: string?, old_version: int64, tracks: IterableOfTrack, albums: IterableOfAlbum)
            if in_gdk
                playlist_change_gdk(id, version, old_id, old_version, tracks, albums)
            else
                new PlaylistChangeGdk(self, id, version, old_id, old_version, tracks, albums)

        def private on_track_change(track: Track?, old_track: Track?)
            if in_gdk
                track_change_gdk(track, old_track)
            else
                new TrackChangeGdk(self, track, old_track)

        class private ConnectionChangeGdk: Object
            construct(api: API, host: string?, port: uint, player: string?, old_host: string?, old_port: uint, old_player: string?)
                _api = api
                _host = host
                _port = port
                _player = player
                _old_host = old_host
                _old_port = old_port
                _old_player = old_player
                ref()
                Gdk.threads_add_idle(idle)

            _api: API
            _host: string?
            _port: uint
            _player: string?
            _old_host: string?
            _old_port: uint
            _old_player: string?

            def private idle(): bool
                _api.connection_change_gdk(_host, _port, _player, _old_host, _old_port, _old_player)
                unref()
                return false

        class private ErrorGdk: Object
            construct(api: API, e: GLib.Error)
                _api = api
                _e = e
                ref()
                Gdk.threads_add_idle(idle)

            _api: API
            _e: GLib.Error

            def private idle(): bool
                _api.error_gdk(_e)
                unref()
                return false

        class private VolumeChangeGdk: Object
            construct(api: API, volume: double, old_volume: double)
                _api = api
                _volume = volume
                _old_volume = old_volume
                ref()
                Gdk.threads_add_idle(idle)

            _api: API
            _volume: double
            _old_volume: double

            def private idle(): bool
                _api.volume_change_gdk(_volume, _old_volume)
                unref()
                return false

        class private PlayModeChangeGdk: Object
            construct(api: API, play_mode: string?, old_play_mode: string?)
                _api = api
                _play_mode = play_mode
                _old_play_mode = old_play_mode
                ref()
                Gdk.threads_add_idle(idle)

            _api: API
            _play_mode: string?
            _old_play_mode: string?

            def private idle(): bool
                _api.play_mode_change_gdk(_play_mode, _old_play_mode)
                unref()
                return false

        class private CursorModeChangeGdk: Object
            construct(api: API, cursor_mode: string?, old_cursor_mode: string?)
                _api = api
                _cursor_mode = cursor_mode
                _old_cursor_mode = old_cursor_mode
                ref()
                Gdk.threads_add_idle(idle)

            _api: API
            _cursor_mode: string?
            _old_cursor_mode: string?

            def private idle(): bool
                _api.cursor_mode_change_gdk(_cursor_mode, _old_cursor_mode)
                unref()
                return false

        class private PositionInPlaylistChangeGdk: Object
            construct(api: API, position_in_playlist: int, old_position_in_playlist: int)
                _api = api
                _position_in_playlist = position_in_playlist
                _old_position_in_playlist = old_position_in_playlist
                ref()
                Gdk.threads_add_idle(idle)

            _api: API
            _position_in_playlist: int
            _old_position_in_playlist: int

            def private idle(): bool
                _api.position_in_playlist_change_gdk(_position_in_playlist, _old_position_in_playlist)
                unref()
                return false

        class private PositionInTrackChangeGdk: Object
            construct(api: API, position_in_track: double, old_position_in_track: double, track_duration: double)
                _api = api
                _position_in_track = position_in_track
                _old_position_in_track = old_position_in_track
                _track_duration = track_duration
                ref()
                Gdk.threads_add_idle(idle)

            _api: API
            _position_in_track: double
            _old_position_in_track: double
            _track_duration: double

            def private idle(): bool
                _api.position_in_track_change_gdk(_position_in_track, _old_position_in_track, _track_duration)
                unref()
                return false

        class private PlaylistChangeGdk: Object
            construct(api: API, id: string?, version: int64, old_id: string?, old_version: int64, tracks: IterableOfTrack, albums: IterableOfAlbum)
                _api = api
                _id = id
                _version = version
                _old_id = old_id
                _old_version = old_version
                _tracks = tracks
                _albums = albums
                ref()
                Gdk.threads_add_idle(idle)

            _api: API
            _id: string?
            _version: int64
            _old_id: string?
            _old_version: int64
            _tracks: IterableOfTrack
            _albums: IterableOfAlbum

            def private idle(): bool
                _api.playlist_change_gdk(_id, _version, _old_id, _old_version, _tracks, _albums)
                unref()
                return false

        class private TrackChangeGdk: Object
            construct(api: API, track: Track?, old_track: Track?)
                _api = api
                _track = track
                _old_track = old_track
                ref()
                Gdk.threads_add_idle(idle)

            _api: API
            _track: Track?
            _old_track: Track?

            def private idle(): bool
                _api.track_change_gdk(_track, _old_track)
                unref()
                return false
