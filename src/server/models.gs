[indent=4]

namespace Khovsgol

    const SEPARATOR: string = "/"
    
    def to_sortable(text: string): string
        return text.down()
        
    //
    // Track
    //

    class Track: Object implements Nap.HasJsonObject
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
            JsonUtil.set_string_not_null(json, "path", _path)
            JsonUtil.set_string_not_null(json, "library", _library)
            JsonUtil.set_string_not_null(json, "title", _title)
            JsonUtil.set_string_not_null(json, "title_sort", _title_sort)
            JsonUtil.set_string_not_null(json, "artist", _artist)
            JsonUtil.set_string_not_null(json, "artist_sort", _artist_sort)
            JsonUtil.set_string_not_null(json, "album", _album)
            JsonUtil.set_string_not_null(json, "album_sort", _album_sort)
            JsonUtil.set_string_not_null(json, "album_path", _album_path)
            json.set_int_member("position", _position)
            json.set_double_member("duration", _duration)
            json.set_int_member("date", _date)
            JsonUtil.set_string_not_null(json, "type", _file_type)
            return json
    
    class abstract TrackIterator: Object implements Nap.HasJsonArray
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
                    JsonUtil.set_string_not_null(obj, "album_path", _get_album_path(track))
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

    class TrackPointer: Object implements Nap.HasJsonObject
        prop path: string
        prop position: int
        prop album: string

        def to_json(): Json.Object
            var json = new Json.Object()
            JsonUtil.set_string_not_null(json, "path", _path)
            json.set_int_member("position", _position)
            JsonUtil.set_string_not_null(json, "album", _album)
            return json

    class abstract TrackPointerIterator: Object implements Nap.HasJsonArray
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

    class Album: Object implements Nap.HasJsonObject
        prop path: string
        prop library: string
        prop title: string
        prop title_sort: string
        prop artist: string
        prop artist_sort: string
        prop date: int
        prop compilation_type: CompilationType
        prop file_type: string
        
        def to_json(): Json.Object
            var json = new Json.Object()
            JsonUtil.set_string_not_null(json, "path", _path)
            JsonUtil.set_string_not_null(json, "library", _library)
            JsonUtil.set_string_not_null(json, "title", _title)
            JsonUtil.set_string_not_null(json, "title_sort", _title_sort)
            JsonUtil.set_string_not_null(json, "artist", _artist)
            JsonUtil.set_string_not_null(json, "artist_sort", _artist_sort)
            json.set_int_member("date", _date)
            json.set_int_member("compilation", _compilation_type)
            JsonUtil.set_string_not_null(json, "type", _file_type)
            return json

    class abstract AlbumIterator: Object implements Nap.HasJsonArray
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
    
    class Artist: Object implements Nap.HasJsonArray
        prop artist: string
        prop artist_sort: string
        
        def to_json(): Json.Array
            var json = new Json.Array()
            json.add_string_element(_artist)
            json.add_string_element(_artist_sort)
            return json
    
    class abstract ArtistIterator: Object implements Nap.HasJsonArray
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

    class abstract Libraries: Object implements Nap.HasJsonArray
        prop libraries: dict of string, Library = new dict of string, Library
    
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
                var path = JsonUtil.get_string_element_or_null(paths, i)
                if path is not null
                    var track_pointer = new TrackPointer()
                    track_pointer.path = path
                    track_pointer.album = album_path
                    track_pointer.position = destination++
                    save_track_pointer(track_pointer)
        
        def remove(album_path: string, positions: Json.Array) raises GLib.Error
            // Remove track pointers
            for var i = 0 to (positions.get_length() - 1)
                var position = JsonUtil.get_int_element_or_min(positions, i)
                if position != int.MIN
                    delete_track_pointer(album_path, position)
            
            // Move positions back for all remaining track pointers
            for var i = 0 to (positions.get_length() - 1)
                var position = JsonUtil.get_int_element_or_min(positions, i)
                if position != int.MIN
                    move_track_pointers(album_path, -1, position + 1)
                
                // We need to also move back positions in the array
                for var ii = (i + 1) to (positions.get_length() - 1)
                    var p = JsonUtil.get_int_element_or_min(positions, ii)
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
                var position = JsonUtil.get_int_element_or_min(positions, i)
                if position != int.MIN
                    var track_pointer = get_track_pointer(album_path, position)
                    paths.add(track_pointer.path)
                    delete_track_pointer(album_path, position)
            
            // Move positions back for all remaining track pointers
            for var i = 0 to (positions.get_length() - 1)
                var position = JsonUtil.get_int_element_or_min(positions, i)
                if position != int.MIN
                    move_track_pointers(album_path, -1, position + 1)
                
                // We need to also move back positions in the array
                for var ii = (i + 1) to (positions.get_length() - 1)
                    var p = JsonUtil.get_int_element_or_min(positions, ii)
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
    
    class Library: Object implements Nap.HasJsonObject
        construct(libraries: Libraries, name: string)
            _libraries = libraries
            _name = name
            
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
            JsonUtil.set_string_not_null(json, "name", _name)
            directories: Json.Array = new Json.Array()
            for var directory in _directories.values
                directories.add_object_element(directory.to_json())
            json.set_array_member("directories", directories)
            return json
    
        _libraries: Libraries

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

    class abstract StringIterator: Object implements Nap.HasJsonArray
        def abstract has_next(): bool
        def abstract next(): bool
        def abstract new get(): string

        def to_json(): Json.Array
            var json = new Json.Array()
            while has_next()
                json.add_string_element(get())
                next()
            return json

    class abstract IntIterator: Object implements Nap.HasJsonArray
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
    
    class abstract Directory: Object implements Nap.HasJsonObject
        prop path: string
        prop is_scanning: bool
        
        def abstract scan()

        def to_json(): Json.Object
            var json = new Json.Object()
            JsonUtil.set_string_not_null(json, "path", _path)
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
            return 0
    
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
            return 0

    class Players: Object implements Nap.HasJsonArray
        prop players: dict of string, Player = new dict of string, Player
         
        def get_or_create_player(name: string): Player
            var player = _players[name]
            if player is null
                _players[name] = player = new GStreamer.Player(name)
            return player

        def to_json(): Json.Array
            var json = new Json.Array()
            for var player in _players.values
                json.add_object_element(player.to_json())
            return json
    
    class abstract Player: Object implements Nap.HasJsonObject
        construct()
            _play_list = new PlayList(self)
    
        prop name: string
        prop plugs: list of Plug = new list of Plug
        prop readonly play_list: PlayList

        prop abstract play_mode: PlayMode
        prop abstract cursor_mode: CursorMode
        prop abstract position_in_play_list: int
        prop abstract position_in_track: double
        prop abstract ratio_in_track: double
        
        def abstract prev()
        def abstract next()
        
        def to_json(): Json.Object
            var json = new Json.Object()
            JsonUtil.set_string_not_null(json, "name", _name)
            JsonUtil.set_string_not_null(json, "playMode", "stopped")
            JsonUtil.set_string_not_null(json, "cursorMode", "play_list")
            var plugs = new Json.Object()
            for var plug in _plugs
                plugs.set_object_member(plug.name, plug.to_json())
            json.set_object_member("plugs", plugs)
            var cursor = new Json.Object()
            cursor.set_int_member("positionInPlayList", 1)
            cursor.set_int_member("positionInTrack", 0)
            cursor.set_int_member("trackDuration", 100)
            json.set_object_member("cursor", cursor)
            json.set_object_member("playList", play_list.to_json())
            return json

    //
    // Plug
    //
    
    class Plug: Object implements Nap.HasJsonObject
        prop name: string
        
        def to_json(): Json.Object
            var json = new Json.Object()
            JsonUtil.set_string_not_null(json, "name", _name)
            return json
    
    //
    // PlayList
    //
    
    class PlayList: Object implements Nap.HasJsonObject
        construct(player: Player)
            _player = player
    
        prop id: string
        prop version: double
        prop tracks: list of Track = new list of Track

        def set_paths(paths: Json.Array)
            // blah
            var l = new list of string
            for var i = 0 to (paths.get_length() - 1)
                l.add(paths.get_string_element(i))
                
        def move(position: int, positions: Json.Array)
            // blah
            var l = new list of int
            for var i = 0 to (positions.get_length() - 1)
                l.add((int) positions.get_int_element(i))
        
        def add(position: int, paths: Json.Array)
            pass
        
        def remove(paths: Json.Array)
            pass
        
        def to_json(): Json.Object
            var json = new Json.Object()
            JsonUtil.set_string_not_null(json, "id", _id)
            json.set_double_member("version", _version)
            var tracks = new Json.Array()
            for var track in _tracks
                tracks.add_object_element(track.to_json())
            json.set_array_member("tracks", tracks)
            return json

        _player: Player
