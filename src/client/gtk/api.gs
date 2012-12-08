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
            server_change.connect(on_server_change)
            play_mode_change.connect(on_play_mode_change)
            cursor_mode_change.connect(on_cursor_mode_change)
            position_in_play_list_change.connect(on_position_in_play_list_change)
            position_in_track_change.connect(on_position_in_track_change)
            play_list_change.connect(on_play_list_change)

        event server_change_gdk(base_url: string?, old_base_url: string?)
        event play_mode_change_gdk(play_mode: string?, old_play_mode: string?)
        event cursor_mode_change_gdk(cursor_mode: string?, old_cursor_mode: string?)
        event position_in_play_list_change_gdk(position_in_play_list: int, old_position_in_play_list: int)
        event position_in_track_change_gdk(position_in_track: double, old_position_in_track: double, track_duration: double)
        event play_list_change_gdk(id: string?, version: int64, old_id: string?, old_version: int64, tracks: IterableOfTrack)
        
        prop static in_gdk: bool
            get
                return AtomicInt.get(ref _in_gdk) == 1
            set
                AtomicInt.set(ref _in_gdk, value ? 1 : 0)

        _in_gdk: static int = 0

        def private on_server_change(base_url: string?, old_base_url: string?)
            if in_gdk
                server_change_gdk(base_url, old_base_url)
            else
                new ServerChangeGdk(self, base_url, old_base_url)
            
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
            
        def private on_position_in_play_list_change(position_in_play_list: int, old_position_in_play_list: int)
            if in_gdk
                position_in_play_list_change_gdk(position_in_play_list, old_position_in_play_list)
            else
                new PositionInPlayListChangeGdk(self, position_in_play_list, old_position_in_play_list)
            
        def private on_position_in_track_change(position_in_track: double, old_position_in_track: double, track_duration: double)
            if in_gdk
                position_in_track_change_gdk(position_in_track, old_position_in_track, track_duration)
            else
                new PositionInTrackChangeGdk(self, position_in_track, old_position_in_track, track_duration)
            
        def private on_play_list_change(id: string?, version: int64, old_id: string?, old_version: int64, tracks: IterableOfTrack)
            if in_gdk
                play_list_change_gdk(id, version, old_id, old_version, tracks)
            else
                new PlayListChangeGdk(self, id, version, old_id, old_version, tracks)

        class private ServerChangeGdk: Object
            construct(api: API, base_url: string?, old_base_url: string?)
                _api = api
                _base_url = base_url
                _old_base_url = old_base_url
                ref()
                Gdk.threads_add_idle(idle)

            _api: API
            _base_url: string?
            _old_base_url: string?

            def private idle(): bool
                _api.server_change_gdk(_base_url, _old_base_url)
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

        class private PositionInPlayListChangeGdk: Object
            construct(api: API, position_in_play_list: int, old_position_in_play_list: int)
                _api = api
                _position_in_play_list = position_in_play_list
                _old_position_in_play_list = old_position_in_play_list
                ref()
                Gdk.threads_add_idle(idle)

            _api: API
            _position_in_play_list: int
            _old_position_in_play_list: int

            def private idle(): bool
                _api.position_in_play_list_change_gdk(_position_in_play_list, _old_position_in_play_list)
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

        class private PlayListChangeGdk: Object
            construct(api: API, id: string?, version: int64, old_id: string?, old_version: int64, tracks: IterableOfTrack)
                _api = api
                _id = id
                _version = version
                _old_id = old_id
                _old_version = old_version
                _tracks = tracks
                ref()
                Gdk.threads_add_idle(idle)

            _api: API
            _id: string?
            _version: int64
            _old_id: string?
            _old_version: int64
            _tracks: IterableOfTrack

            def private idle(): bool
                _api.play_list_change_gdk(_id, _version, _old_id, _old_version, _tracks)
                unref()
                return false
