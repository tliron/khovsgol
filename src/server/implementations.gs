[indent=4]

uses
    JsonUtil

namespace Khovsgol

    const SEPARATOR: string = "/"
    
    def to_sortable(text: string): string
        return text.down()

    def get_album_path_dynamic(obj: Json.Object)
        var track = new Track.from_json(obj)
        track.album_path = File.new_for_path(track.path).get_parent().get_path()

    class static AlbumPathConstant
        construct(album_path: string)
            _album_path = album_path
    
        def do_on_json_object(obj: Json.Object)
            var track = new Track.from_json(obj)
            track.album_path = _album_path
            
        _album_path: string

    //
    // Crucible
    //
    
    interface Crucible: Object
        prop abstract readonly libraries: Libraries
        prop abstract readonly players: Players
        
        def abstract create_library(): Library
        def abstract create_directory(): Directory
        def abstract create_player(): Player
        def abstract create_play_list(): PlayList

    //
    // Library
    //

    class abstract Libraries: Object implements HasJsonArray
        prop libraries: dict of string, Library = new dict of string, Library
    
        def abstract initialize() raises GLib.Error
        def abstract begin() raises GLib.Error
        def abstract commit() raises GLib.Error
        def abstract rollback() raises GLib.Error

        // Tracks
        def abstract get_track(path: string): Track? raises GLib.Error
        def abstract save_track(track: Track) raises GLib.Error
        def abstract delete_track(path: string) raises GLib.Error
        
        // Track pointers
        def abstract get_track_pointer(album: string, position: int): TrackPointer? raises GLib.Error
        def abstract save_track_pointer(track_pointer: TrackPointer) raises GLib.Error
        def abstract delete_track_pointer(album: string, position: int) raises GLib.Error
        def abstract delete_track_pointers(album: string) raises GLib.Error
        def abstract move_track_pointers(album: string, delta: int, from_position: int = int.MIN) raises GLib.Error
        
        // Albums
        def abstract get_album(path: string): Album? raises GLib.Error
        def abstract save_album(album: Album) raises GLib.Error
        def abstract delete_album(path: string) raises GLib.Error

        // Iterate tracks
        def abstract iterate_tracks(args: IterateTracksArgs): IterableOfTrack raises GLib.Error
        def abstract iterate_tracks_in_album(args: IterateForAlbumArgs): IterableOfTrack raises GLib.Error
        def abstract iterate_tracks_by_artist(args: IterateForArtistArgs): IterableOfTrack raises GLib.Error
        def abstract iterate_track_paths(path: string): IterableOfString raises GLib.Error
        
        // Iterate track pointers
        def abstract iterate_raw_track_pointers_in_album(args: IterateForAlbumArgs): IterableOfTrackPointer raises GLib.Error
        def abstract iterate_track_pointers_in_album(args: IterateForAlbumArgs): IterableOfTrack raises GLib.Error
        def abstract iterate_track_pointers(args: IterateTracksArgs): IterableOfTrack raises GLib.Error
        
        // Iterate albums
        def abstract iterate_albums(args: IterateAlbumsArgs): IterableOfAlbum raises GLib.Error
        def abstract iterate_album_paths(path: string): IterableOfString raises GLib.Error
        def abstract iterate_albums_with_artist(args: IterateForArtistArgs): IterableOfAlbum raises GLib.Error
        def abstract iterate_albums_by_artist(args: IterateForArtistArgs): IterableOfAlbum raises GLib.Error
        def abstract iterate_albums_at(args: IterateForDateArgs): IterableOfAlbum raises GLib.Error
        
        // Iterate artists
        def abstract iterate_artists(args: IterateByAlbumsOrTracksArgs): IterableOfArtist raises GLib.Error

        // Iterate dates
        def abstract iterate_dates(args: IterateByAlbumsOrTracksArgs): IterableOfInt raises GLib.Error
        
        // Timestamps
        def abstract get_timestamp(path: string): double raises GLib.Error
        def abstract set_timestamp(path: string, timestamp: double) raises GLib.Error
        
        def add(album_path: string, destination: int, paths: Json.Array) raises GLib.Error
            var length = paths.get_length()
            if length == 0
                return
            
            if destination == int.MIN
                // Set destination position at end of current track pointers
                destination = 0
                var args = new IterateForAlbumArgs()
                args.album = album_path
                for var track_pointer in iterate_raw_track_pointers_in_album(args)
                    var position = track_pointer.position
                    if position > destination
                        destination = position
                destination++

            begin()
            try
                // Make room by moving the track pointers after us forward
                move_track_pointers(album_path, (int) length, destination)
                
                // Add the track pointers at the destination
                for var path in new JsonStrings(paths)
                    var track_pointer = new TrackPointer()
                    track_pointer.path = path
                    track_pointer.album = album_path
                    track_pointer.position = destination++
                    save_track_pointer(track_pointer)
            except e: GLib.Error
                rollback()
                raise e
            commit()
        
        def remove(album_path: string, positions: Json.Array) raises GLib.Error
            var length = positions.get_length()
            if length == 0
                return
            var last = length - 1

            begin()
            try
                for var i = 0 to last
                    var position = get_int_element_or_min(positions, i)
                    if position != int.MIN
                        delete_track_pointer(album_path, position)
                
                        // Move positions back for all remaining track pointers
                        move_track_pointers(album_path, -1, position + 1)
                    
                        // We need to also move back positions in the array
                        if i < last
                            for var ii = (i + 1) to last
                                var p = get_int_element_or_min(positions, ii)
                                if p > position
                                    positions.get_element(ii).set_int(p - 1)
            except e: GLib.Error
                rollback()
                raise e
            commit()
        
        def move(album_path: string, destination: int, positions: Json.Array) raises GLib.Error
            var length = positions.get_length()
            if length == 0
                return
            var last = length - 1

            if destination == int.MIN
                // Set destination position at end of current track pointers
                destination = 0
                var args = new IterateForAlbumArgs()
                args.album = album_path
                for var track_pointer in iterate_raw_track_pointers_in_album(args)
                    var position = track_pointer.position
                    if position > destination
                        destination = position
                destination++
                
            // Remove the track pointers
            begin()
            try
                var paths = new list of string
                for var i = 0 to last
                    var position = get_int_element_or_min(positions, i)
                    if position != int.MIN
                        var track_pointer = get_track_pointer(album_path, position)
                        paths.add(track_pointer.path)
                        delete_track_pointer(album_path, position)
                
                        // Move positions back for all remaining track pointers
                        move_track_pointers(album_path, -1, position + 1)
                    
                        // We need to also move back positions in the array
                        if i < last
                            for var ii = (i + 1) to last
                                var p = get_int_element_or_min(positions, ii)
                                if p > position
                                    positions.get_element(ii).set_int(p - 1)
                                
                        // We need to also move back the destination position
                        if destination > position
                            destination--

                // Make room by moving the remaining track pointers forward
                move_track_pointers(album_path, paths.size, destination)
                
                // Add the removed track pointers at the destination
                for var path in paths
                    var track_pointer = new TrackPointer()
                    track_pointer.path = path
                    track_pointer.album = album_path
                    track_pointer.position = destination++
                    save_track_pointer(track_pointer)
            except e: GLib.Error
                rollback()
                raise e
            commit()

        def to_json(): Json.Array
            return to_object_array(_libraries.values)
    
    class Library: Object implements HasJsonObject
        prop crucible: Crucible
        prop name: string
        prop directories: dict of string, Directory = new dict of string, Directory
        
        def scan_all()
            for directory in _directories.values
                if !directory.is_scanning
                    directory.scan()
                else
                    pass // TODO: log?
    
        def to_json(): Json.Object
            var json = new Json.Object()
            set_string_member_not_null(json, "name", _name)
            json.set_array_member("directories", to_object_array(_directories.values))
            return json

    class IterateForDateArgs
        prop date: int = int.MIN
        prop like: bool = false
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string
    
    class IterateTracksArgs
        prop title_like: string? = null
        prop artist_like: string? = null
        prop album_like: string? = null
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string
        
    class IterateForAlbumArgs
        prop album: string? = null
        prop sort: list of string = new list of string

    class IterateForArtistArgs
        prop artist: string? = null
        prop like: bool = false
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string
    
    class IterateAlbumsArgs
        prop compilation_type: CompilationType = CompilationType.ANY
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string

    class IterateByAlbumsOrTracksArgs
        prop album_artist: bool = true
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string

    //
    // Directory
    //
    
    class abstract Directory: Object implements HasJsonObject
        prop crucible: Crucible
        prop path: string
        
        prop abstract readonly is_scanning: bool
        
        def abstract scan()

        def to_json(): Json.Object
            var json = new Json.Object()
            set_string_member_not_null(json, "path", path)
            json.set_boolean_member("scanning", is_scanning)
            return json

    //
    // Player
    //
    
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
                if (_position_in_play_list == int.MIN) || (_position_in_play_list == size)
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
    
    //
    // PlayList
    //
    
    class PlayList: Object implements HasJsonObject
        prop crucible: Crucible
        prop player: Player
        prop id: string
        prop version: uint64 = uint64.MIN

        prop readonly tracks: list of Track
            get
                try
                    validate_tracks()
                except e: GLib.Error
                    _logger.warning(e.message)
                return _tracks

        prop readonly tracks_json: Json.Array
            get
                try
                    validate_tracks()
                except e: GLib.Error
                    _logger.warning(e.message)
                if _tracks_json is null
                    _tracks_json = to_object_array(_tracks)
                return _tracks_json

        def initialize() raises GLib.Error
            if _album_path is null
                // Magic prefix for playlist "albums"
                _album_path = "?" + player.name
                _id = DBus.generate_guid()
        
        def set_paths(paths: Json.Array) raises GLib.Error
            _player.position_in_play_list = int.MIN
            _crucible.libraries.delete_track_pointers(_album_path)
            _crucible.libraries.add(_album_path, 0, paths)
            update_version()
            _player.next()
            
        def add(position: int, paths: Json.Array) raises GLib.Error
            var was_empty = tracks.size == 0
            _crucible.libraries.add(_album_path, position, paths)
            update_version()
            if was_empty
                _player.next()
        
        def remove(positions: Json.Array) raises GLib.Error
            var length = positions.get_length()
            if length == 0
                return
            var last = length - 1
        
            // Reset player if we are removing its current track,
            // or update its position if our removal will affect its number
            var position_in_play_list = _player.position_in_play_list
            var final_position_in_play_list = position_in_play_list
            for var i = 0 to last
                var position = get_int_element_or_min(positions, i)
                if position != int.MIN
                    if position == position_in_play_list
                        final_position_in_play_list = int.MIN
                        break
                    else if position < position_in_play_list
                        final_position_in_play_list--

            _crucible.libraries.remove(_album_path, positions)
            update_version()

            if final_position_in_play_list != position_in_play_list
                player.position_in_play_list = final_position_in_play_list

        def move(position: int, positions: Json.Array) raises GLib.Error
            // TODO: player cursor...
        
            _crucible.libraries.move(_album_path, position, positions)
            update_version()

        def to_json(): Json.Object
            var json = new Json.Object()
            json.set_string_member("id", _id)
            json.set_int_member("version", (int64) _version)
            json.set_array_member("tracks", tracks_json)
            return json
            
        _album_path: string
        _tracks: list of Track = new list of Track
        _tracks_json: Json.Array?

        def private get_stored_version(): uint64 raises GLib.Error
            var album = _crucible.libraries.get_album(_album_path)
            if (album is not null) && (album.date != int64.MIN) && (album.date != 0)
                return album.date
            else
                update_version()
                return _version

        def private update_version() raises GLib.Error
            var timestamp = get_monotonic_time()
            var album = new Album()
            album.path = _album_path
            album.date = timestamp
            _crucible.libraries.save_album(album)
        
        /*
         * If the stored version is newer, refresh our track list.
         */
        def private validate_tracks() raises GLib.Error
            var stored_version = get_stored_version()
            if stored_version > _version
                var tracks = new list of Track
                var args = new IterateForAlbumArgs()
                args.album = _album_path
                args.sort.add("position")
                for var track_pointer in _crucible.libraries.iterate_raw_track_pointers_in_album(args)
                    // We may have the track info in memory already
                    track: Track = null
                    var path = track_pointer.path
                    if path is null
                        _logger.warning("Null track")
                        continue
                    for var t in _tracks
                        if t.path == path
                            track = t.clone()
                            break
                    if track is null
                        track = crucible.libraries.get_track(path)
                        if track is null
                            _logger.warningf("Unknown track: %s", path)
                            continue
                    
                    // Fix track to fit in playlist
                    track.position = track_pointer.position
                    get_album_path_dynamic(track.to_json())
                    tracks.add(track)
                    
                _version = stored_version
                _tracks = tracks
                _tracks_json = null

        _logger: Logging.Logger

        init
            _logger = Logging.get_logger("khovsgol.playlist")
