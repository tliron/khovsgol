[indent=4]

uses
    JsonUtil

namespace Khovsgol

    const SEPARATOR: string = "/"
    
    def to_sortable(text: string): string
        return text.down()
    
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
    // Track
    //

    class Track: Object implements HasJsonObject
        prop path: string
        prop library: string
        prop title: string
        prop title_sort: string
        prop artist: string
        prop artist_sort: string
        prop album: string
        prop album_sort: string
        prop album_path: string
        prop position: int
        prop duration: double
        prop date: int
        prop file_type: string

        def to_json(): Json.Object
            var json = new Json.Object()
            set_string_member_not_null(json, "path", _path)
            set_string_member_not_null(json, "library", _library)
            set_string_member_not_null(json, "title", _title)
            set_string_member_not_null(json, "title_sort", _title_sort)
            set_string_member_not_null(json, "artist", _artist)
            set_string_member_not_null(json, "artist_sort", _artist_sort)
            set_string_member_not_null(json, "album", _album)
            set_string_member_not_null(json, "album_sort", _album_sort)
            set_string_member_not_null(json, "album_path", _album_path)
            set_int_member_not_min(json, "position", _position)
            set_double_member_not_min(json, "duration", _duration)
            set_int_member_not_min(json, "date", _date == 0 ? int.MIN : _date)
            set_string_member_not_null(json, "type", _file_type)
            return json
    
    class abstract TrackIterator: Object implements HasJsonArray
        def abstract has_next(): bool
        def abstract next(): bool
        def abstract new get(): Track
        
        prop get_album_path: unowned GetAlbumPath?
        
        def to_json(): Json.Array
            var json = new Json.Array()
            while has_next()
                var track = get()
                var obj = track.to_json()
                if get_album_path is not null
                    set_string_member_not_null(obj, "album_path", _get_album_path(track))
                json.add_object_element(obj)
                next()
            return json

        delegate GetAlbumPath(track: Track): string

        def static get_album_path_dynamic(track: Track): string
            var path = File.new_for_path(track.path)
            return path.get_parent().get_path()

        class static AlbumPathConstant
            construct(album_path: string)
                _album_path = album_path
        
            def get_album_path(track: Track): string
                return _album_path
                
            _album_path: string
    
    //
    // TrackPointer
    //

    class TrackPointer: Object implements HasJsonObject
        prop path: string
        prop position: int
        prop album: string

        def to_json(): Json.Object
            var json = new Json.Object()
            set_string_member_not_null(json, "path", _path)
            set_int_member_not_min(json, "position", _position)
            set_string_member_not_null(json, "album", _album)
            return json

    class abstract TrackPointerIterator: Object implements HasJsonArray
        def abstract has_next(): bool
        def abstract next(): bool
        def abstract new get(): TrackPointer
        
        def to_json(): Json.Array
            var json = new Json.Array()
            while has_next()
                json.add_object_element(get().to_json())
                next()
            return json
            
    //
    // Album
    //
    
    enum CompilationType
        ANY = -1
        NOT = 0
        COMPILATION = 1
        CUSTOM_COMPILATION = 2

    class Album: Object implements HasJsonObject
        prop path: string
        prop library: string
        prop title: string
        prop title_sort: string
        prop artist: string
        prop artist_sort: string
        prop date: int64 = int64.MIN
        prop compilation_type: CompilationType
        prop file_type: string
        
        def to_json(): Json.Object
            var json = new Json.Object()
            set_string_member_not_null(json, "path", _path)
            set_string_member_not_null(json, "library", _library)
            set_string_member_not_null(json, "title", _title)
            set_string_member_not_null(json, "title_sort", _title_sort)
            set_string_member_not_null(json, "artist", _artist)
            set_string_member_not_null(json, "artist_sort", _artist_sort)
            set_int64_member_not_min(json, "date", _date == 0 ? int64.MIN : _date)
            set_int_member_not_min(json, "compilation", _compilation_type)
            set_string_member_not_null(json, "type", _file_type)
            return json

    class abstract AlbumIterator: Object implements HasJsonArray
        def abstract has_next(): bool
        def abstract next(): bool
        def abstract new get(): Album
        
        def to_json(): Json.Array
            var json = new Json.Array()
            while has_next()
                json.add_object_element(get().to_json())
                next()
            return json    
    
    //
    // Artist
    //
    
    class Artist: Object implements HasJsonArray
        prop artist: string
        prop artist_sort: string
        
        def to_json(): Json.Array
            var json = new Json.Array()
            json.add_string_element(_artist)
            json.add_string_element(_artist_sort)
            return json
    
    class abstract ArtistIterator: Object implements HasJsonArray
        def abstract has_next(): bool
        def abstract next(): bool
        def abstract new get(): Artist
        
        def to_json(): Json.Array
            var json = new Json.Array()
            while has_next()
                json.add_array_element(get().to_json())
                next()
            return json

    //
    // Library
    //

    class abstract Libraries: Object implements HasJsonArray
        prop libraries: dict of string, Library = new dict of string, Library
    
        def abstract initialize() raises GLib.Error
    
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
        def abstract iterate_tracks(args: IterateTracksArgs): TrackIterator raises GLib.Error
        def abstract iterate_tracks_in_album(args: IterateForAlbumArgs): TrackIterator raises GLib.Error
        def abstract iterate_tracks_by_artist(args: IterateForArtistArgs): TrackIterator raises GLib.Error
        def abstract iterate_track_paths(path: string): Khovsgol.StringIterator raises GLib.Error
        
        // Iterate track pointers
        def abstract iterate_raw_track_pointers_in_album(args: IterateForAlbumArgs): TrackPointerIterator raises GLib.Error
        def abstract iterate_track_pointers_in_album(args: IterateForAlbumArgs): Khovsgol.TrackIterator raises GLib.Error
        def abstract iterate_track_pointers(args: IterateTracksArgs): Khovsgol.TrackIterator raises GLib.Error
        
        // Iterate albums
        def abstract iterate_albums(args: IterateAlbumsArgs): Khovsgol.AlbumIterator raises GLib.Error
        def abstract iterate_album_paths(path: string): Khovsgol.StringIterator raises GLib.Error
        def abstract iterate_albums_with_artist(args: IterateForArtistArgs): Khovsgol.AlbumIterator raises GLib.Error
        def abstract iterate_albums_by_artist(args: IterateForArtistArgs): Khovsgol.AlbumIterator raises GLib.Error
        def abstract iterate_albums_at(args: IterateForDateArgs): Khovsgol.AlbumIterator raises GLib.Error
        
        // Iterate artists
        def abstract iterate_artists(args: IterateByAlbumsOrTracksArgs): Khovsgol.ArtistIterator raises GLib.Error

        // Iterate dates
        def abstract iterate_dates(args: IterateByAlbumsOrTracksArgs): Khovsgol.IntIterator raises GLib.Error
        
        // Timestamps
        def abstract get_timestamp(path: string): double raises GLib.Error
        def abstract set_timestamp(path: string, timestamp: double) raises GLib.Error
        
        def add(album_path: string, destination: int, paths: Json.Array) raises GLib.Error
            if destination == int.MIN
                // Set destination position at end of current track pointers
                destination = 0
                var args = new IterateForAlbumArgs()
                args.album = album_path
                var iterator = iterate_raw_track_pointers_in_album(args)
                while iterator.has_next()
                    var position = iterator.get().position
                    if position > destination
                        destination = position
                    iterator.next()
                destination++

            // Make room by moving the track pointers after us forward
            move_track_pointers(album_path, (int) paths.get_length(), destination)
            
            // Add the track pointers at the destination
            for var i = 0 to (paths.get_length() - 1)
                var path = get_string_element_or_null(paths, i)
                if path is not null
                    var track_pointer = new TrackPointer()
                    track_pointer.path = path
                    track_pointer.album = album_path
                    track_pointer.position = destination++
                    save_track_pointer(track_pointer)
        
        def remove(album_path: string, positions: Json.Array) raises GLib.Error
            // Remove track pointers
            for var i = 0 to (positions.get_length() - 1)
                var position = get_int_element_or_min(positions, i)
                if position != int.MIN
                    delete_track_pointer(album_path, position)
            
                    // Move positions back for all remaining track pointers
                    move_track_pointers(album_path, -1, position + 1)
                
                    // We need to also move back positions in the array
                    for var ii = (i + 1) to (positions.get_length() - 1)
                        var p = get_int_element_or_min(positions, ii)
                        if p > position
                            positions.get_element(ii).set_int(p - 1)
        
        def move(album_path: string, destination: int, positions: Json.Array) raises GLib.Error
            if destination == int.MIN
                // Set destination position at end of current track pointers
                destination = 0
                var args = new IterateForAlbumArgs()
                args.album = album_path
                var iterator = iterate_raw_track_pointers_in_album(args)
                while iterator.has_next()
                    var position = iterator.get().position
                    if position > destination
                        destination = position
                    iterator.next()
                destination++
                
            // Remove the track pointers
            var paths = new list of string
            for var i = 0 to (positions.get_length() - 1)
                var position = get_int_element_or_min(positions, i)
                if position != int.MIN
                    var track_pointer = get_track_pointer(album_path, position)
                    paths.add(track_pointer.path)
                    delete_track_pointer(album_path, position)
            
                    // Move positions back for all remaining track pointers
                    move_track_pointers(album_path, -1, position + 1)
                
                    // We need to also move back positions in the array
                    for var ii = (i + 1) to (positions.get_length() - 1)
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

        def to_json(): Json.Array
            var json = new Json.Array()
            for var library in _libraries.values
                json.add_object_element(library.to_json())
            return json
    
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
            directories: Json.Array = new Json.Array()
            for var directory in _directories.values
                directories.add_object_element(directory.to_json())
            json.set_array_member("directories", directories)
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

    class abstract StringIterator: Object implements HasJsonArray
        def abstract has_next(): bool
        def abstract next(): bool
        def abstract new get(): string

        def to_json(): Json.Array
            var json = new Json.Array()
            while has_next()
                json.add_string_element(get())
                next()
            return json

    class abstract IntIterator: Object implements HasJsonArray
        def abstract has_next(): bool
        def abstract next(): bool
        def abstract new get(): int

        def to_json(): Json.Array
            var json = new Json.Array()
            while has_next()
                json.add_int_element(get())
                next()
            return json
    
    //
    // Directory
    //
    
    class abstract Directory: Object implements HasJsonObject
        prop crucible: Crucible
        prop path: string
        prop is_scanning: bool
        
        def abstract scan()

        def to_json(): Json.Object
            var json = new Json.Object()
            set_string_member_not_null(json, "path", _path)
            json.set_boolean_member("scanning", _is_scanning)
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
        else if name == "togglePaused"
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
            return "togglePaused"
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
            var json = new Json.Array()
            for var player in _players.values
                json.add_object_element(player.to_json())
            return json
    
    class abstract Player: Object implements HasJsonObject
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
                
                if _position_in_play_list < 0
                    _position_in_play_list = int.MIN
                    path = null
                else
                    var tracks = play_list.tracks
                    if _position_in_play_list >= tracks.size
                        _position_in_play_list = int.MIN
                        path = null
                    else
                        var track = tracks[_position_in_play_list]
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
            
            if mode == CursorMode.ALBUM
                // Play first track if we are not pointing anywhere
                if _position_in_play_list == int.MIN
                    position_in_play_list = 0
                    return
                
                // Play subsequent track if it's in the same album
                else if _position_in_play_list + 1 < size
                    var current = tracks[_position_in_play_list]
                    var next = tracks[_position_in_play_list + 1]
                    if current.album_path == next.album_path
                        position_in_play_list = _position_in_play_list + 1
                        return
                
            else if mode == CursorMode.PLAY_LIST
                // Play first track if we are not pointing anywhere
                if _position_in_play_list == int.MIN
                    position_in_play_list = 0
                    return
                
                // Otherwise, play subsequent track
                else
                    position_in_play_list = _position_in_play_list + 1
                    return
                
            else if mode == CursorMode.REPEAT_TRACK
                // Play first track if we are not pointing anywhere
                if _position_in_play_list == int.MIN
                    position_in_play_list = 0
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
                if (_position_in_play_list == int.MIN) || (_position_in_play_list == size - 1)
                    position_in_play_list = 0
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
                
            else // (Default behavior is CursorMode.TRACK)
                // Play first track if we are not pointing anywhere
                if _position_in_play_list == int.MIN
                    position_in_play_list = 0
                    return

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
        prop version: int64 = int64.MIN

        prop readonly tracks: list of Track
            get
                try
                    validate_tracks()
                except e: GLib.Error
                    Logging.get_logger("khovsgol.playlist").warning(e.message)
                return _tracks

        def initialize() raises GLib.Error
            if _album_path is null
                // Magic prefix for playlist "albums"
                _album_path = "?" + player.name
                _id = DBus.generate_guid()
        
        def set_paths(paths: Json.Array) raises GLib.Error
            // Stop player
            player.position_in_play_list = int.MIN
            
            _crucible.libraries.delete_track_pointers(_album_path)
            add(0, paths)
            
        def add(position: int, paths: Json.Array) raises GLib.Error
            _crucible.libraries.add(_album_path, position, paths)
            update_version()
        
        def remove(positions: Json.Array) raises GLib.Error
            // Stop player if we are removing its current track,
            // or update its position if our removal will affect its number
            var position_in_play_list = _player.position_in_play_list
            var final_position_in_play_list = position_in_play_list
            for var i = 0 to (positions.get_length() - 1)
                var position = get_int_element_or_min(positions, i)
                if position != int.MIN
                    if position == position_in_play_list
                        final_position_in_play_list = int.MIN
                        break
                    else if position < position_in_play_list
                        final_position_in_play_list--
            if final_position_in_play_list != position_in_play_list
                player.position_in_play_list = final_position_in_play_list

            _crucible.libraries.remove(_album_path, positions)
            update_version()

        def move(position: int, positions: Json.Array) raises GLib.Error
            // TODO: player cursor...
        
            _crucible.libraries.move(_album_path, position, positions)
            update_version()

        def to_json(): Json.Object
            var json = new Json.Object()
            try
                validate_tracks()
                json.set_string_member("id", _id)
                json.set_int_member("version", _version)
                var tracks = new Json.Array()
                for var track in _tracks
                    tracks.add_object_element(track.to_json())
                json.set_array_member("tracks", tracks)
            except e: GLib.Error
                Logging.get_logger("khovsgol.playlist").warning(e.message)
            return json
            
        _album_path: string
        _tracks: list of Track = new list of Track

        def private get_stored_version(): int64 raises GLib.Error
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
                _tracks.clear()
                var args = new IterateForAlbumArgs()
                args.album = _album_path
                args.sort.add("position")
                var iterator = _crucible.libraries.iterate_raw_track_pointers_in_album(args)
                while iterator.has_next()
                    var track = crucible.libraries.get_track(iterator.get().path)
                    track.album_path = TrackIterator.get_album_path_dynamic(track)
                    _tracks.add(track)
                    iterator.next()
                _version = stored_version
