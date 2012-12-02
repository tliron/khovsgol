[indent=4]

uses
    Khovsgol
    Nap
    JsonUtil

namespace Khovsgol.Client

    _logger: Logging.Logger
    
    /*
     * String join for Gee.Iterable.
     */
    def static join(sep: string, items: Gee.Iterable of string): string
        var str = new StringBuilder()
        var i = items.iterator()
        while i.has_next()
            i.next()
            str.append(i.get())
            if i.has_next()
                str.append(sep)
        return str.str

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
        construct(host: string, port: uint) raises GLib.Error
            _client = new Nap.Connector._Soup.Client("http://%s:%u".printf(host, port))
        
        prop watching_player: string?
            get
                _watching_player_lock.lock()
                try
                    return _watching_player
                finally
                    _watching_player_lock.unlock()
            set
                _watching_player_lock.lock()
                try
                    _watching_player = value
                finally
                    _watching_player_lock.unlock()

        prop readonly is_polling: bool
            get
                return AtomicInt.get(ref _is_polling) == 1

        event play_mode_change(play_mode: string?, old_play_mode: string?)
        event play_mode_change_gdk(play_mode: string?, old_play_mode: string?)
        event cursor_mode_change(cursor_mode: string?, old_cursor_mode: string?)
        event cursor_mode_change_gdk(cursor_mode: string?, old_cursor_mode: string?)
        event position_in_play_list_change(position_in_play_list: int, old_position_in_play_list: int)
        event position_in_play_list_change_gdk(position_in_play_list: int, old_position_in_play_list: int)
        event position_in_track_change(position_in_track: double, old_position_in_track: double, track_duration: double)
        event position_in_track_change_gdk(position_in_track: double, old_position_in_track: double, track_duration: double)
        event play_list_change(id: string?, version: int64, old_id: string?, old_version: int64, tracks: Json.Array?)
        event play_list_change_gdk(id: string?, version: int64, old_id: string?, old_version: int64, tracks: Json.Array?)

        def new connect(host: string, port: uint)
            _client.base_url = "http://%s:%u".printf(host, port)

        def update(in_gdk: bool = false)
            get_player(watching_player, in_gdk)
        
        def reset_watch()
            _watching_player_lock.lock()
            try
                _play_mode = null
                _cursor_mode = null
                _position_in_play_list = int.MIN
                _position_in_track = double.MIN
                _play_list_id = null
                _play_list_version = int64.MIN
            finally
                _watching_player_lock.unlock()
            
        def start_player_poll(): bool
            AtomicInt.set(ref _is_poll_stopping, 0)
            AtomicInt.set(ref _is_polling, 1)
            _poll_thread = new Thread of bool("PollPlayer", poll)
            return false
        
        def stop_player_poll(block: bool = false)
            AtomicInt.set(ref _is_poll_stopping, 1)
            if block
                _poll_thread.join()
        
        /*
         * receive [=get_library, ...]
         */
        def get_libraries(): Json.Array?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/libraries/"
                conversation.commit()
                return conversation.response_json_array
            except e: GLib.Error
                on_error(e)
                return null

        class GetTracksArgs
            prop by_artist: string?
            prop by_artist_like: string?
            prop in_album: string?
            prop search_title: string?
            prop search_artist: string?
            prop search_album: string?
            prop compilation_type: int = int.MIN
            prop sort: list of string = new list of string

        /*
         * receive [=get_track, ...]
         */
        def get_tracks(args: GetTracksArgs): Json.Array?
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
                        conversation.query["liketitle"] = args.search_title
                    if args.search_artist is not null
                        conversation.query["likeartist"] = args.search_artist
                    if args.search_album is not null
                        conversation.query["likealbum"] = args.search_album
                    if args.compilation_type != int.MIN
                        conversation.query["compilation"] = args.compilation_type.to_string()
                if !args.sort.is_empty
                    conversation.query["sort"] = join(",", args.sort)
                conversation.commit()
                return conversation.response_json_array
            except e: GLib.Error
                on_error(e)
                return null
        
        class GetAlbumsArgs
            prop by_artist: string?
            prop with_artist: string?
            prop at_date: int = int.MIN
            prop compilation_type: int = int.MIN
            prop sort: list of string = new list of string

        /*
         * receive [=get_album, ...]
         */
        def get_albums(args: GetAlbumsArgs? = null): Json.Array?
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
                    if args.compilation_type != int.MIN
                        conversation.query["compilation"] = args.compilation_type.to_string()
                    if !args.sort.is_empty
                        conversation.query["sort"] = join(",", args.sort)
                conversation.commit()
                return conversation.response_json_array
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * receive [
         *  {
         *   artist: string,
         *   artist_sort: string
         *  },
         *  ...
         * ]
         */
        def get_artists(album_artists: bool = false, sort: string?): Json.Array?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/libraries/artists/"
                if album_artists
                    conversation.query["album"] = "true"
                if sort is not null
                    conversation.query["sort"] = sort
                conversation.commit()
                return conversation.response_json_array
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * receive [int, ...]
         */
        def get_dates(): Json.Array?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/libraries/dates/"
                conversation.commit()
                return conversation.response_json_array
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
         *  album: string,
         *  album_sort: string,
         *  position: int,
         *  duration: double,
         *  date: int,
         *  type: string
         * }
         */
        def get_track(path: string): Json.Object?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/libraries/track/{path}/"
                conversation.variables["path"] = path
                conversation.commit()
                return conversation.response_json_object
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
        def get_album(path: string): Json.Object?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/libraries/album/{path}/"
                conversation.variables["path"] = path
                conversation.commit()
                return conversation.response_json_object
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
        def get_players(): Json.Array?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/players/"
                conversation.commit()
                return conversation.response_json_array
            except e: GLib.Error
                on_error(e)
                return null

        /* receive {
         *  name: string,
         *  playMode: string,
         *  cursorMode: string,
         *  plugs: {},
         *  cursor: {
         *   positionInPlayList: int,
         *   positionInTrack: int,
         *   trackDuration: int
         *  },
         *  playList: =get_play_list
         * }
         */
        def get_player(player: string, in_gdk: bool = false): Json.Object?
            try
                var conversation = _client.create_conversation()
                conversation.method = Method.GET
                conversation.path = "/player/{player}/"
                conversation.variables["player"] = player
                conversation.commit()
                var player_object = conversation.response_json_object
                if player_object is not null
                    process_player(player_object, in_gdk)
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
        def set_play_mode(player: string, play_mode: string, in_gdk: bool = false): Json.Object?
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
                    process_player(player_object, in_gdk)
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
        def set_cursor_mode(player: string, cursor_mode: string, in_gdk: bool = false): Json.Object?
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
                    process_player(player_object, in_gdk)
                    return player_object
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {cursor: {positionInPlayList: int}}
         * 
         * receive =get_player
         */
        def set_position_in_play_list(player: string, position: int, in_gdk: bool = false): Json.Object?
            try
                var payload = new Json.Object()
                var cursor = new Json.Object()
                cursor.set_int_member("positionInPlayList", position)
                payload.set_object_member("cursor", cursor)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/player/{player}/"
                conversation.variables["player"] = player
                conversation.request_json_object = payload
                conversation.commit()
                var player_object = conversation.response_json_object
                if player_object is not null
                    process_player(player_object, in_gdk)
                    return player_object
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null
        
        /*
         * send {cursor: {positionInPlayList: string}}
         * 
         * receive =get_player
         */
        def set_position_in_play_list_string(player: string, position: string, in_gdk: bool = false): Json.Object?
            try
                var payload = new Json.Object()
                var cursor = new Json.Object()
                cursor.set_string_member("positionInPlayList", position)
                payload.set_object_member("cursor", cursor)

                var conversation = _client.create_conversation()
                conversation.method = Method.POST
                conversation.path = "/player/{player}/"
                conversation.variables["player"] = player
                conversation.request_json_object = payload
                conversation.commit()
                var player_object = conversation.response_json_object
                if player_object is not null
                    process_player(player_object, in_gdk)
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
        def set_position_in_track(player: string, position: double, in_gdk: bool = false): Json.Object?
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
                    process_player(player_object, in_gdk)
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
        def set_ratio_in_track(player: string, ratio: double, in_gdk: bool = false): Json.Object?
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
                    process_player(player_object, in_gdk)
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
         *  tracks: =get_tracks
         * }
         */
        def get_play_list(player: string, full: bool = false, in_gdk: bool = false): Json.Object?
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
                        process_player(entity, in_gdk)
                    return entity
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {paths: [string, ...]}
         * 
         * receive =get_play_list
         */
        def set_play_list_paths(player: string, paths: Json.Array, full: bool = false, in_gdk: bool = false): Json.Object?
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
                        process_player(entity, in_gdk)
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
         * receive =get_play_list
         */
        def move_in_play_list(player: string, destination: int, positions: Json.Array, full: bool = false, in_gdk: bool = false): Json.Object?
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
                        process_player(entity, in_gdk)
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
         * receive =get_play_list
         */
        def add_to_play_list(player: string, position: int, paths: Json.Array, full: bool = false, in_gdk: bool = false): Json.Object?
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
                        process_player(entity, in_gdk)
                    return entity
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         * send {remove: [int, ...]}
         * 
         * receive =get_play_list
         */
        def remove_from_play_list(player: string, positions: Json.Array, full: bool = false, in_gdk: bool = false): Json.Object?
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
                        process_player(entity, in_gdk)
                    return entity
                else
                    return null
            except e: GLib.Error
                on_error(e)
                return null

        /*
         */
        def get_plug(player: string, plug: string): Json.Object?
            return null

        /*
         * receive =get_plug
         */
        def set_plug(player: string, plug: string): Json.Object?
            return null

        /*
         * receive =get_player
         */
        def delete_plug(player: string, plug: string): Json.Object?
            return null
        
        _client: Nap.Client

        _poll_thread: Thread of bool
        _poll_interval: ulong = 1000000

        // The following should only be accessed atomically
        _is_poll_stopping: int
        _is_polling: int

        // The following should only be accessed via mutex
        _watching_player_lock: Mutex = Mutex()
        _watching_player: string?
        _play_mode: string?
        _cursor_mode: string?
        _position_in_play_list: int
        _position_in_track: double
        _play_list_id: string?
        _play_list_version: int64

        init
            _logger = Logging.get_logger("khovsgol.client")
        
        def private on_error(e: GLib.Error)
            // TODO: special handling for network errors
            _logger.warning(e.message)
        
        def private process_player(player: Json.Object?, in_gdk: bool = false)
            if player is null
                return
            
            _watching_player_lock.lock()
            try
                var name = get_string_member_or_null(player, "name")
                if name != _watching_player
                    return
                    
                var play_list = get_object_member_or_null(player, "playList")
                if play_list is not null
                    var id = get_string_member_or_null(play_list, "id")
                    var version = get_int64_member_or_min(play_list, "version")
                    if (id != _play_list_id) || (version != _play_list_version)
                        var tracks = get_array_member_or_null(play_list, "tracks")
                        play_list_change(id, version, _play_list_id, _play_list_version, tracks)
                        if in_gdk
                            play_list_change_gdk(id, version, _play_list_id, _play_list_version, tracks)
                        else
                            new PlayListChangeGdk(self, id, version, _play_list_id, _play_list_version, tracks)
                        _play_list_id = id
                        _play_list_version = version

                var play_mode = get_string_member_or_null(player, "playMode")
                if play_mode is not null
                    if play_mode != _play_mode
                        play_mode_change(play_mode, _play_mode)
                        if in_gdk
                            play_mode_change_gdk(play_mode, _play_mode)
                        else
                            new PlayModeChangeGdk(self, play_mode, _play_mode)
                        _play_mode = play_mode

                var cursor_mode = get_string_member_or_null(player, "cursorMode")
                if cursor_mode is not null
                    if cursor_mode != _cursor_mode
                        cursor_mode_change(cursor_mode, _cursor_mode)
                        if in_gdk
                            cursor_mode_change_gdk(cursor_mode, _cursor_mode)
                        else
                            new CursorModeChangeGdk(self, cursor_mode, _cursor_mode)
                        _cursor_mode = cursor_mode

                var cursor = get_object_member_or_null(player, "cursor")
                if cursor is not null
                    var position_in_play_list = get_int_member_or_min(cursor, "positionInPlayList")
                    if position_in_play_list != _position_in_play_list
                        position_in_play_list_change(position_in_play_list, _position_in_play_list)
                        if in_gdk
                            position_in_play_list_change_gdk(position_in_play_list, _position_in_play_list)
                        else
                            new PositionInPlayListChangeGdk(self, position_in_play_list, _position_in_play_list)
                        _position_in_play_list = position_in_play_list
                        
                    var position_in_track = get_double_member_or_min(cursor, "positionInTrack")
                    var track_duration = get_double_member_or_min(cursor, "trackDuration")
                    if position_in_track != _position_in_track
                        position_in_track_change(position_in_track, _position_in_track, track_duration)
                        if in_gdk
                            position_in_track_change_gdk(position_in_track, _position_in_track, track_duration)
                        else
                            new PositionInTrackChangeGdk(self, position_in_track, _position_in_track, track_duration)
                        _position_in_track = position_in_track
            finally
                _watching_player_lock.unlock()

        def private poll(): bool
            while true
                // Should we stop polling?
                if AtomicInt.get(ref _is_poll_stopping) == 1
                    break
                    
                update()

                Thread.usleep(_poll_interval)
            
            // We've stopped polling
            AtomicInt.set(ref _is_polling, 0)
            AtomicInt.set(ref _is_poll_stopping, 0)
            return true

    class PlayModeChangeGdk: GLib.Object
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

    class CursorModeChangeGdk: GLib.Object
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

    class PositionInPlayListChangeGdk: GLib.Object
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

    class PositionInTrackChangeGdk: GLib.Object
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

    class PlayListChangeGdk: GLib.Object
        construct(api: API, id: string?, version: int64, old_id: string?, old_version: int64, tracks: Json.Array?)
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
        _tracks: Json.Array?

        def private idle(): bool
            _api.play_list_change_gdk(_id, _version, _old_id, _old_version, _tracks)
            unref()
            return false
