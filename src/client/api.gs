[indent=4]

uses
    Nap
    JsonUtil

namespace Khovsgol.Client

    /*
     * Unified client-side API. Internally uses a Nap client to access
     * the server remotely over HTTP. The instance can be reconnected
     * to other servers after created.
     * 
     * All return values are in JSON object or array types.
     * 
     * Supports watching a player, such that changes to the player data
     * will trigger signal emissions. All signals have "_gdk" versions
     * that are called within the GDK thread, via
     * Gdk.threads_add_idle(), guaranteeing them for safe use with GTK+.
     * 
     * A polling thread can be started to regularly watch the player.
     */
    class API: GLib.Object
        construct()
            _client = new _Soup.Client()
            _client.timeout = 5

        prop watching_player: string?
            get
                _watching_lock.lock()
                try
                    return _watching_player
                finally
                    _watching_lock.unlock()
            set
                _watching_lock.lock()
                try
                    _watching_player = value
                    reset_watch()
                    watch()
                finally
                    _watching_lock.unlock()

        prop readonly is_watching: bool
            get
                return AtomicInt.@get(ref _is_watching) == 1

        event connection_change(host: string?, port: uint, player: string?, old_host: string?, old_port: uint, old_player: string?)
        event volume_change(volume: double, old_volume: double)
        event play_mode_change(play_mode: string?, old_last_play_mode: string?)
        event cursor_mode_change(cursor_mode: string?, old_last_cursor_mode: string?)
        event position_in_playlist_change(position_in_last_playlist: int, old_position_in_last_playlist: int)
        event position_in_track_change(position_in_last_track: double, old_position_in_last_track: double, track_duration: double)
        event playlist_change(id: string?, version: int64, old_id: string?, old_version: int64, tracks: IterableOfTrack, albums: IterableOfAlbum)
        event track_change(track: Track?, old_last_track: Track?)
        event error(e: GLib.Error)
        
        def get_connection(out host: string, out port: uint)
            _watching_lock.lock()
            try
                host = _host
                port = _port
            finally
                _watching_lock.unlock()

        def new connect(host: string, port: uint)
            _watching_lock.lock()
            try
                _host = host
                _port = port
                _client.base_url = "http://%s:%u".printf(_host, _port)
                reset_watch()
                watch()
            finally
                _watching_lock.unlock()

        def update()
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/player/{player}/"
                conversation.variables["player"] = watching_player
                conversation.committed.connect(on_committed)
                conversation.commit(true)
            except e: GLib.Error
                on_error(e)
        
        def reset_watch()
            _watching_lock.lock()
            try
                _last_watching_player = null
                _last_host = null
                _last_port = 0
                _last_volume = double.MIN
                _last_play_mode = null
                _last_cursor_mode = null
                _last_position_in_last_playlist = int.MIN
                _last_position_in_last_track = double.MIN
                _last_playlist_id = null
                _last_playlist_version = int64.MIN
                _last_tracks = null
                _last_track = null
            finally
                _watching_lock.unlock()
            
        def start_watch_thread(): bool
            AtomicInt.@set(ref _is_poll_stopping, 0)
            AtomicInt.@set(ref _is_watching, 1)
            _poll_thread = new Thread of bool("PollPlayer", poll)
            return false
        
        def stop_watch_thread(block: bool = false)
            AtomicInt.@set(ref _is_poll_stopping, 1)
            if block
                _poll_thread.join()
        
        /*
         * receive [=get_library, ...]
         */
        def get_libraries(): IterableOfJsonObject
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/libraries/"
                conversation.commit()
                return new JsonObjects(conversation.response_json_array)
            except e: GLib.Error
                on_error(e)
                return new JsonObjects()

        class GetTracksArgs
            prop by_artist: string?
            prop by_artist_like: string?
            prop in_album: string?
            prop search_title: string?
            prop search_artist: string?
            prop search_album: string?
            prop album_type: int = int.MIN
            prop sort: list of string = new list of string

        /*
         * receive [=get_track, ...]
         */
        def get_tracks(args: GetTracksArgs): IterableOfTrack
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/libraries/tracks/"
                if args.by_artist is not null
                    conversation.query["artist"] = args.by_artist
                else if args.by_artist_like is not null
                    conversation.query["artist"] = args.by_artist_like
                    conversation.query["like"] = "true"
                else if args.in_album is not null
                    conversation.query["album"] = args.in_album
                else
                    if args.search_title is not null
                        conversation.query["titlelike"] = args.search_title
                    if args.search_artist is not null
                        conversation.query["artistlike"] = args.search_artist
                    if args.search_album is not null
                        conversation.query["albumlike"] = args.search_album
                    if args.album_type != int.MIN
                        conversation.query["type"] = args.album_type.to_string()
                if not args.sort.is_empty
                    conversation.query["sort"] = join(",", args.sort)
                conversation.commit()
                return new JsonTracks(conversation.response_json_array)
            except e: GLib.Error
                on_error(e)
                return new JsonTracks()
        
        class GetAlbumsArgs
            prop by_artist: string?
            prop with_artist: string?
            prop at_date: int = int.MIN
            prop album_type: int = int.MIN
            prop sort: list of string = new list of string

        /*
         * receive [=get_album, ...]
         */
        def get_albums(args: GetAlbumsArgs? = null): IterableOfAlbum
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/libraries/albums/"
                if args is not null
                    if args.by_artist is not null
                        conversation.query["albumartist"] = args.by_artist
                    else if args.with_artist is not null
                        conversation.query["artist"] = args.with_artist
                    else if args.at_date != int.MIN
                        conversation.query["date"] = args.at_date.to_string()
                    if args.album_type != int.MIN
                        conversation.query["type"] = args.album_type.to_string()
                    if not args.sort.is_empty
                        conversation.query["sort"] = join(",", args.sort)
                conversation.commit()
                return new JsonAlbums(conversation.response_json_array)
            except e: GLib.Error
                on_error(e)
                return new JsonAlbums()

        /*
         * receive [
         *  {
         *   artist: string,
         *   artist_sort: string
         *  },
         *  ...
         * ]
         */
        def get_artists(album_artists: bool = false, sort: string? = null): IterableOfArtist
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/libraries/artists/"
                if album_artists
                    conversation.query["album"] = "true"
                if sort is not null
                    conversation.query["sort"] = sort
                conversation.commit()
                return new JsonArtists(conversation.response_json_array)
            except e: GLib.Error
                on_error(e)
                return new JsonArtists()

        /*
         * receive [int, ...]
         */
        def get_dates(by_album: bool = true): IterableOfInt
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/libraries/dates/"
                if by_album
                    conversation.query["album"] = "true"
                conversation.commit()
                return new JsonInts(conversation.response_json_array)
            except e: GLib.Error
                on_error(e)
                return new JsonInts()

        /*
         * receive {
         *  path: string,
         *  library: string,
         *  title: string,
         *  title_sort: string,
         *  artist: string,
         *  artist_sort: string,
         *  album: string,
         *  album_sort: string,
         *  position: int,
         *  duration: double,
         *  date: int,
         *  type: string
         * }
         */
        def get_track(path: string): Track?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/libraries/track/{path}/"
                conversation.variables["path"] = path
                conversation.commit()
                var obj = conversation.response_json_object
                if obj is not null
                    return new Track.from_json(obj)
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * receive {
         *  path: string,
         *  library: string,
         *  title: string,
         *  title_sort: string,
         *  artist: string,
         *  artist_sort: string,
         *  date: int,
         *  compilation: int,
         *  type: string
         * }
         */
        def get_album(path: string): Album?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/libraries/album/{path}/"
                conversation.variables["path"] = path
                conversation.commit()
                var obj = conversation.response_json_object
                if obj is not null
                    return new Album.from_json(obj)
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {move: [int, ...]}
         * send {move: {to: int, positions: [int, ...]}}
         * 
         * receive =get_album
         */
        def move_in_album(path: string, destination: int, positions: Json.Array): Json.Object?
            try
                var payload = new Json.Object()
                if destination != int.MIN
                    var move = new Json.Object()
                    move.set_int_member("to", destination)
                    move.set_array_member("positions", positions)
                    payload.set_object_member("move", move)
                else
                    payload.set_array_member("move", positions)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/libraries/album/{path}/"
                conversation.variables["path"] = path
                conversation.request_json_object = payload
                conversation.commit()
                return conversation.response_json_object
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {add: [string, ...]}
         * send {add: {position: int, paths: [string, ...]}}
         * 
         * receive =get_album
         */
        def add_to_album(path: string, destination: int, paths: Json.Array): Json.Object?
            try
                var payload = new Json.Object()
                if destination != int.MIN
                    var add = new Json.Object()
                    add.set_int_member("to", destination)
                    add.set_array_member("paths", paths)
                    payload.set_object_member("add", add)
                else
                    payload.set_array_member("add", paths)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/libraries/album/{path}/"
                conversation.variables["path"] = path
                conversation.request_json_object = payload
                conversation.commit()
                return conversation.response_json_object
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {remove: [int, ...]}
         * 
         * receive =get_album
         */
        def remove_from_album(path: string, positions: Json.Array): Json.Object?
            try
                var payload = new Json.Object()
                payload.set_array_member("remove", positions)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/libraries/album/{path}/"
                conversation.variables["path"] = path
                conversation.request_json_object = payload
                conversation.commit()
                return conversation.response_json_object
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {title: string, library: string, tracks: [string, ...]}
         * 
         * receive =get_album
         */
        def create_album(path: string, title: string, library: string, paths: Json.Array): Json.Object?
            try
                var payload = new Json.Object()
                payload.set_string_member("title", title)
                payload.set_string_member("library", library)
                payload.set_array_member("tracks", paths)

                var conversation = _client.create_conversation()
                conversation.method = Method.PUT
                conversation.path = "/libraries/album/{path}/"
                conversation.variables["path"] = path
                conversation.request_json_object = payload
                conversation.commit()
                return conversation.response_json_object
            except e: GLib.Error
                on_error(e)
                return null

        def delete_album(path: string)
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.DELETE
                conversation.path = "/libraries/album/{path}/"
                conversation.variables["path"] = path
                conversation.commit()
            except e: GLib.Error
                on_error(e)

        /*
         * receive {
         *  name: string,
         *  directories: [=get_directory, ...]
         * }
         */
        def get_library(name: string): Json.Object?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/library/{library}/"
                conversation.variables["library"] = name
                conversation.commit()
                return conversation.response_json_object
            except e: GLib.Error
                on_error(e)
                return null
            
        /*
         * send {add: string}
         * 
         * receive =get_library
         */
        def add_directory_to_library(name: string, path: string): Json.Object?
            try
                var payload = new Json.Object()
                payload.set_string_member("add", path)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/library/{library}/"
                conversation.variables["library"] = name
                conversation.request_json_object = payload
                conversation.commit()
                return conversation.response_json_object
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {remove: string}
         * 
         * receive =get_library
         */
        def remove_directory_from_library(name: string, path: string): Json.Object?
            try
                var payload = new Json.Object()
                payload.set_string_member("remove", path)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/library/{library}/"
                conversation.variables["library"] = name
                conversation.request_json_object = payload
                conversation.commit()
                return conversation.response_json_object
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {action: string}
         * send {action: {type: string, ...}}
         * 
         * receive =get_library
         */
        def library_action(name: string, action: string): Json.Object?
            try
                var payload = new Json.Object()
                payload.set_string_member("action", action)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/library/{library}/"
                conversation.variables["library"] = name
                conversation.request_json_object = payload
                conversation.commit()
                return conversation.response_json_object
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * receive =get_library
         */
        def create_library(name: string): Json.Object?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.PUT
                conversation.path = "/library/{library}/"
                conversation.variables["library"] = name
                conversation.commit()
                return conversation.response_json_object
            except e: GLib.Error
                on_error(e)
                return null

        def delete_library(name: string)
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.DELETE
                conversation.path = "/library/{library}/"
                conversation.variables["library"] = name
                conversation.commit()
            except e: GLib.Error
                on_error(e)

        /*
         * receive {
         *  path: string,
         *  scanning: bool
         * }
         */
        def get_directory(name: string, path: string): Json.Object?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/library/{library}/directory/{path}/"
                conversation.variables["library"] = name
                conversation.variables["path"] = path
                conversation.commit()
                return conversation.response_json_object
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {action: string}
         * send {action: {type: string, ...}}
         * 
         * receive =get_directory
         */
        def directory_action(name: string, path: string, action: string): Json.Object?
            try
                var payload = new Json.Object()
                payload.set_string_member("action", action)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/library/{library}/directory/{path}/"
                conversation.variables["library"] = name
                conversation.variables["path"] = path
                conversation.request_json_object = payload
                conversation.commit()
                return conversation.response_json_object
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * receive =get_directory
         */
        def create_directory(name: string, path: string): Json.Object?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.PUT
                conversation.path = "/library/{library}/directory/{path}/"
                conversation.variables["library"] = name
                conversation.variables["path"] = path
                conversation.commit()
                return conversation.response_json_object
            except e: GLib.Error
                on_error(e)
                return null

        def delete_directory(name: string, path: string)
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.DELETE
                conversation.path = "/library/{library}/directory/{path}/"
                conversation.variables["library"] = name
                conversation.variables["path"] = path
                conversation.commit()
            except e: GLib.Error
                on_error(e)

        /*
         * receive [=get_player, ...]
         */
        def get_players(): IterableOfJsonObject
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/players/"
                conversation.commit()
                return new JsonObjects(conversation.response_json_array)
            except e: GLib.Error
                on_error(e)
                return new JsonObjects()

        /* receive {
         *  name: string,
         *  volume: double,
         *  playMode: string,
         *  cursorMode: string,
         *  plugs: {},
         *  cursor: {
         *   positionInPlaylist: int,
         *   positionInTrack: int,
         *   trackDuration: int
         *  },
         *  playList: =get_playlist
         * }
         */
        def get_player(player: string): Json.Object?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/player/{player}/"
                conversation.variables["player"] = player
                conversation.commit()
                var player_object = conversation.response_json_object
                if player_object is not null
                    watch(player_object)
                    return player_object
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null
        
        /*
         * send {volume: double}
         * 
         * receive =get_player
         */
        def set_volume(player: string, volume: double): Json.Object?
            try
                var payload = new Json.Object()
                payload.set_double_member("volume", volume)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/player/{player}/"
                conversation.variables["player"] = player
                conversation.request_json_object = payload
                conversation.commit()
                var player_object = conversation.response_json_object
                if player_object is not null
                    watch(player_object)
                    return player_object
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {playMode: string}
         * 
         * receive =get_player
         */
        def set_play_mode(player: string, play_mode: string): Json.Object?
            try
                var payload = new Json.Object()
                payload.set_string_member("playMode", play_mode)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/player/{player}/"
                conversation.variables["player"] = player
                conversation.request_json_object = payload
                conversation.commit()
                var player_object = conversation.response_json_object
                if player_object is not null
                    watch(player_object)
                    return player_object
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {cursorMode: string}
         * 
         * receive =get_player
         */
        def set_cursor_mode(player: string, cursor_mode: string): Json.Object?
            try
                var payload = new Json.Object()
                payload.set_string_member("cursorMode", cursor_mode)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/player/{player}/"
                conversation.variables["player"] = player
                conversation.request_json_object = payload
                conversation.commit()
                var player_object = conversation.response_json_object
                if player_object is not null
                    watch(player_object)
                    return player_object
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {cursor: {positionInPlaylist: int}}
         * 
         * receive =get_player
         */
        def set_position_in_playlist(player: string, position: int): Json.Object?
            try
                var payload = new Json.Object()
                var cursor = new Json.Object()
                cursor.set_int_member("positionInPlaylist", position)
                payload.set_object_member("cursor", cursor)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/player/{player}/"
                conversation.variables["player"] = player
                conversation.request_json_object = payload
                conversation.commit()
                var player_object = conversation.response_json_object
                if player_object is not null
                    watch(player_object)
                    return player_object
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null
        
        /*
         * send {cursor: {positionInPlaylist: string}}
         * 
         * receive =get_player
         */
        def set_position_in_playlist_string(player: string, position: string): Json.Object?
            try
                var payload = new Json.Object()
                var cursor = new Json.Object()
                cursor.set_string_member("positionInPlaylist", position)
                payload.set_object_member("cursor", cursor)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/player/{player}/"
                conversation.variables["player"] = player
                conversation.request_json_object = payload
                conversation.commit()
                var player_object = conversation.response_json_object
                if player_object is not null
                    watch(player_object)
                    return player_object
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {cursor: {positionInTrack: double}}
         * 
         * receive =get_player
         */
        def set_position_in_track(player: string, position: double): Json.Object?
            try
                var payload = new Json.Object()
                var cursor = new Json.Object()
                cursor.set_double_member("positionInTrack", position)
                payload.set_object_member("cursor", cursor)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/player/{player}/"
                conversation.variables["player"] = player
                conversation.request_json_object = payload
                conversation.commit()
                var player_object = conversation.response_json_object
                if player_object is not null
                    watch(player_object)
                    return player_object
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {cursor: {ratioInTrack: double}}
         * 
         * receive =get_player
         */
        def set_ratio_in_track(player: string, ratio: double): Json.Object?
            try
                var payload = new Json.Object()
                var cursor = new Json.Object()
                cursor.set_double_member("ratioInTrack", ratio)
                payload.set_object_member("cursor", cursor)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/player/{player}/"
                conversation.variables["player"] = player
                conversation.request_json_object = payload
                conversation.commit()
                var player_object = conversation.response_json_object
                if player_object is not null
                    watch(player_object)
                    return player_object
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {addPlug: {name: string, ...}}
         * 
         * receive =get_player
         */
        def add_plug_to_player(player: string, plug: string): Json.Object?
            return null

        /*
         * send {removePlug: string}
         * 
         * receive =get_player
         */
        def remove_plug_from_player(player: string, plug: string): Json.Object?
            return null

        /*
         * receive (fullrepresentation=true)
         *  =get_player
         * 
         * receive (fullrepresentation=false) {
         *  id: string
         *  version: double,
         *  tracks: =get_tracks,
         *  albums: =get_albums
         * }
         */
        def get_playlist(player: string, full: bool = false): Json.Object?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/player/{player}/playlist/"
                conversation.variables["player"] = player
                if full
                    conversation.query["fullrepresentation"] = "true"
                conversation.commit()
                var entity = conversation.response_json_object
                if entity is not null
                    if full
                        watch(entity)
                    return entity
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {paths: [string, ...]}
         * 
         * receive =get_playlist
         */
        def set_playlist_paths(player: string, paths: Json.Array, full: bool = false): Json.Object?
            try
                var payload = new Json.Object()
                payload.set_array_member("paths", paths)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/player/{player}/playlist/"
                conversation.variables["player"] = player
                if full
                    conversation.query["fullrepresentation"] = "true"
                conversation.request_json_object = payload
                conversation.commit()
                var entity = conversation.response_json_object
                if entity is not null
                    if full
                        watch(entity)
                    return entity
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {move: [int, ...]}
         * send {move: {to: int, positions: [int, ...]}}
         * 
         * receive =get_playlist
         */
        def move_in_playlist(player: string, destination: int, positions: Json.Array, full: bool = false): Json.Object?
            try
                var payload = new Json.Object()
                if destination != int.MIN
                    var move = new Json.Object()
                    move.set_int_member("to", destination)
                    move.set_array_member("positions", positions)
                    payload.set_object_member("move", move)
                else
                    payload.set_array_member("move", positions)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/player/{player}/playlist/"
                conversation.variables["player"] = player
                if full
                    conversation.query["fullrepresentation"] = "true"
                conversation.request_json_object = payload
                conversation.commit()
                var entity = conversation.response_json_object
                if entity is not null
                    if full
                        watch(entity)
                    return entity
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {add: [string, ...]}
         * send {add: {to: int, paths: [string, ...]}}
         * 
         * receive =get_playlist
         */
        def add_to_playlist(player: string, position: int, paths: Json.Array, full: bool = false): Json.Object?
            try
                var payload = new Json.Object()
                if position != int.MIN
                    var add = new Json.Object()
                    add.set_int_member("to", position)
                    add.set_array_member("paths", paths)
                    payload.set_object_member("add", add)
                else
                    payload.set_array_member("add", paths)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/player/{player}/playlist/"
                conversation.variables["player"] = player
                if full
                    conversation.query["fullrepresentation"] = "true"
                conversation.request_json_object = payload
                conversation.commit()
                var entity = conversation.response_json_object
                if entity is not null
                    if full
                        watch(entity)
                    return entity
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {remove: [int, ...]}
         * 
         * receive =get_playlist
         */
        def remove_from_playlist(player: string, positions: Json.Array, full: bool = false): Json.Object?
            try
                var payload = new Json.Object()
                payload.set_array_member("remove", positions)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/player/{player}/playlist/"
                conversation.variables["player"] = player
                if full
                    conversation.query["fullrepresentation"] = "true"
                conversation.request_json_object = payload
                conversation.commit()
                var entity = conversation.response_json_object
                if entity is not null
                    if full
                        watch(entity)
                    return entity
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * TODO
         */
        def get_plug(player: string, plug: string, full: bool = false): Json.Object?
            return null

        /*
         * receive =get_plug
         */
        def set_plug(player: string, plug: string, full: bool = false): Json.Object?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.PUT
                conversation.path = "/player/{player}/plug/{plug}/"
                conversation.variables["player"] = player
                conversation.variables["plug"] = plug
                if full
                    conversation.query["fullrepresentation"] = "true"
                conversation.commit()
                var entity = conversation.response_json_object
                if entity is not null
                    if full
                        watch(entity)
                    return entity
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        def delete_plug(player: string, plug: string)
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.DELETE
                conversation.path = "/player/{player}/plug/{plug}/"
                conversation.variables["player"] = player
                conversation.variables["plug"] = plug
                conversation.commit()
            except e: GLib.Error
                on_error(e)
        
        _client: Nap.Client

        _poll_thread: Thread of bool
        _poll_interval: ulong = 1000000

        // The following should only be accessed atomically
        _is_poll_stopping: int
        _is_watching: int

        // The following should only be accessed via mutex
        _watching_lock: RecMutex = RecMutex()
        _watching_player: string?
        _last_watching_player: string?
        _host: string?
        _port: uint
        _last_host: string?
        _last_port: uint
        _last_volume: double
        _last_play_mode: string?
        _last_cursor_mode: string?
        _last_position_in_last_playlist: int
        _last_position_in_last_track: double
        _last_playlist_id: string?
        _last_playlist_version: int64
        _last_tracks: IterableOfTrack?
        _last_track: Track?

        _logger: static Logging.Logger

        init
            _logger = Logging.get_logger("khovsgol.client.api")
        
        def private on_committed(conversation: Conversation)
            var player_object = conversation.response_json_object
                if player_object is not null
                    watch(player_object)
        
        def private on_error(e: GLib.Error)
            // TODO: special handling for network errors
            _logger.exception(e)
            error(e)
        
        def private watch(player: Json.Object? = null)
            if not is_watching
                return
            
            _watching_lock.lock()
            try
                if (_host != _last_host) or (_port != _last_port) or (_watching_player != _last_watching_player)
                    connection_change(_host, _port, _watching_player, _last_host, _last_port, _last_watching_player)
                    _last_host = _host
                    _last_port = _port
                    _last_watching_player = _watching_player
            
                if player is null
                    return

                var name = get_string_member_or_null(player, "name")
                if name != _watching_player
                    return
                    
                var playlist = get_object_member_or_null(player, "playList")
                if playlist is not null
                    var id = get_string_member_or_null(playlist, "id")
                    var version = get_int64_member_or_min(playlist, "version")
                    if (id != _last_playlist_id) or (version != _last_playlist_version)
                        var tracks = new JsonTracks(get_array_member_or_null(playlist, "tracks"))
                        var albums = new JsonAlbums(get_array_member_or_null(playlist, "albums"))
                        playlist_change(id, version, _last_playlist_id, _last_playlist_version, tracks, albums)
                        _last_playlist_id = id
                        _last_playlist_version = version
                        _last_tracks = tracks

                var volume = get_double_member_or_min(player, "volume")
                if volume != double.MIN
                    if volume != _last_volume
                        volume_change(volume, _last_volume)
                        _last_volume = volume

                var play_mode = get_string_member_or_null(player, "playMode")
                if play_mode is not null
                    if play_mode != _last_play_mode
                        play_mode_change(play_mode, _last_play_mode)
                        _last_play_mode = play_mode

                var cursor_mode = get_string_member_or_null(player, "cursorMode")
                if cursor_mode is not null
                    if cursor_mode != _last_cursor_mode
                        cursor_mode_change(cursor_mode, _last_cursor_mode)
                        _last_cursor_mode = cursor_mode

                var cursor = get_object_member_or_null(player, "cursor")
                if cursor is not null
                    var position_in_last_playlist = get_int_member_or_min(cursor, "positionInPlaylist")
                    if position_in_last_playlist != _last_position_in_last_playlist
                        position_in_playlist_change(position_in_last_playlist, _last_position_in_last_playlist)
                        _last_position_in_last_playlist = position_in_last_playlist

                        if _last_position_in_last_playlist == int.MIN
                            if _last_track is not null
                                track_change(null, _last_track)
                                _last_track = null
                        else if _last_tracks is not null
                            for var track in _last_tracks
                                if track.position_in_playlist == _last_position_in_last_playlist
                                    if (_last_track is null) or (_last_track.path != track.path)
                                        track_change(track, _last_track)
                                        _last_track = track
                                    break
                        
                    var position_in_last_track = get_double_member_or_min(cursor, "positionInTrack")
                    var track_duration = get_double_member_or_min(cursor, "trackDuration")
                    if position_in_last_track != _last_position_in_last_track
                        position_in_track_change(position_in_last_track, _last_position_in_last_track, track_duration)
                        _last_position_in_last_track = position_in_last_track
            finally
                _watching_lock.unlock()

        def private poll(): bool
            reset_watch()
        
            while true
                update()

                Thread.usleep(_poll_interval)

                // Should we stop polling?
                if AtomicInt.@get(ref _is_poll_stopping) == 1
                    break
            
            // We've stopped polling
            AtomicInt.@set(ref _is_watching, 0)
            AtomicInt.@set(ref _is_poll_stopping, 0)
            return true
