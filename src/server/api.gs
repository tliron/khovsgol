[indent=4]

uses
    Nap
    JsonUtil
    
namespace Khovsgol.Server

    def get_list_of_string(str: string?): list of string
        var strings = new list of string
        if str is not null
            for var s in str.split(",")
                strings.add(s)
        return strings

    def get_list_of_libraries(conversation: Conversation): list of string
        var library = conversation.variables["library"]
        if library is not null
            var libraries = new list of string
            libraries.add(library)
            return libraries
        else
            return get_list_of_string(conversation.query["library"])

    /*
     * Unified API.
     */
    class Api
        construct(crucible: Crucible) raises GLib.Error
            _crucible = crucible

        /*
         * receive [=get_library, ...]
         */
        def get_libraries(conversation: Conversation) raises GLib.Error
            conversation.response_json_array = _crucible.libraries.to_json()

        /*
         * receive [=get_track, ...]
         */
        def get_tracks(conversation: Conversation) raises GLib.Error
            // Tracks by artist
            var artist = conversation.query["artist"]
            if artist is not null
                var args = new IterateForArtistArgs()
                args.artist = artist
                args.like = conversation.query["like"] == "true"
                args.libraries.add_all(get_list_of_libraries(conversation))
                args.sort.add_all(get_list_of_string(conversation.query["sort"]))
                var iterator = _crucible.libraries.iterate_tracks_by_artist(args)
                iterator.get_album_path = TrackIterator.get_album_path_dynamic
                set_json_array_or_not_found(iterator, conversation)
                return

            // Tracks in album
            var album = conversation.query["album"]
            if album is not null
                var args = new IterateForAlbumArgs()
                args.album = album
                args.sort.add_all(get_list_of_string(conversation.query["sort"]))
                iterator: TrackIterator
                if album.has_prefix("*")
                    // Custom compilation magic prefix
                    iterator = _crucible.libraries.iterate_track_pointers_in_album(args)
                else
                    iterator = _crucible.libraries.iterate_tracks_in_album(args)
                
                var album_path_constant = new TrackIterator.AlbumPathConstant(album)
                iterator.get_album_path = album_path_constant.get_album_path
                set_json_array_or_not_found(iterator, conversation)
                return
            
            // Search tracks
            var args = new IterateTracksArgs()
            args.title_like = conversation.query["titlelike"]
            args.artist_like = conversation.query["artistlike"]
            args.album_like = conversation.query["albumlike"]
            args.libraries.add_all(get_list_of_libraries(conversation))
            args.sort.add_all(get_list_of_string(conversation.query["sort"]))
            var compilation = conversation.query["compilation"]
            var compilation_type = CompilationType.ANY
            if compilation is not null
                compilation_type = (CompilationType) int.parse(compilation)
            json: Json.Array = null

            // Note: 'compilation=1' handling is identical to 'compilation=0'
            // Note: custom compilation tracks are always put *after* regular tracks, whatever the sort order
            if compilation_type != CompilationType.CUSTOM_COMPILATION
                var iterator = _crucible.libraries.iterate_tracks(args)
                iterator.get_album_path = TrackIterator.get_album_path_dynamic
                json = iterator.to_json()
            if (compilation_type == CompilationType.ANY) || (compilation_type == CompilationType.CUSTOM_COMPILATION)
                var json2 = _crucible.libraries.iterate_track_pointers(args).to_json()
                if json is null
                    json = json2
                else
                    array_concat(json, json2)
            
            if json.get_length() > 0
                conversation.response_json_array = json
            else
                conversation.status_code = StatusCode.NOT_FOUND

        /*
         * receive [=get_album, ...]
         */
        def get_albums(conversation: Conversation) raises GLib.Error
            // Albums with artist
            var artist = conversation.query["artist"]
            if artist is not null
                var args = new IterateForArtistArgs()
                args.artist = artist
                args.like = conversation.query["like"] == "true"
                args.libraries.add_all(get_list_of_libraries(conversation))
                args.sort.add_all(get_list_of_string(conversation.query["sort"]))
                set_json_array_or_not_found(_crucible.libraries.iterate_albums_with_artist(args), conversation)
                return
            
            // Albums by artist
            var album_artist = conversation.query["albumartist"]
            if album_artist is not null
                var args = new IterateForArtistArgs()
                args.artist = album_artist
                args.like = conversation.query["like"] == "true"
                args.libraries.add_all(get_list_of_libraries(conversation))
                args.sort.add_all(get_list_of_string(conversation.query["sort"]))
                set_json_array_or_not_found(_crucible.libraries.iterate_albums_by_artist(args), conversation)
                return
            
            // Albums at date
            var date = conversation.query["date"]
            if date is not null
                var args = new IterateForDateArgs()
                args.date = int.parse(date)
                args.like = conversation.query["like"] == "true"
                args.libraries.add_all(get_list_of_libraries(conversation))
                args.sort.add_all(get_list_of_string(conversation.query["sort"]))
                set_json_array_or_not_found(_crucible.libraries.iterate_albums_at(args), conversation)
                return
            
            // All albums
            var args = new IterateAlbumsArgs()
            args.libraries.add_all(get_list_of_libraries(conversation))
            args.sort.add_all(get_list_of_string(conversation.query["sort"]))
            var compilation = conversation.query["compilation"]
            if compilation is not null
                args.compilation_type = (CompilationType) int.parse(compilation)
            set_json_array_or_not_found(_crucible.libraries.iterate_albums(args), conversation)

        /*
         * receive [
         *  {
         *   artist: string,
         *   artist_sort: string
         *  },
         *  ...
         * ]
         */
        def get_artists(conversation: Conversation) raises GLib.Error
            var args = new IterateByAlbumsOrTracksArgs()
            args.libraries.add_all(get_list_of_libraries(conversation))
            args.album_artist = conversation.query["album"] == "true"
            args.sort.add_all(get_list_of_string(conversation.query["sort"]))
            set_json_array_or_not_found(_crucible.libraries.iterate_artists(args), conversation)
        
        /*
         * receive [int, ...]
         */
        def get_dates(conversation: Conversation) raises GLib.Error
            var args = new IterateByAlbumsOrTracksArgs()
            args.libraries.add_all(get_list_of_libraries(conversation))
            args.album_artist = conversation.query["album"] == "true"
            args.sort.add_all(get_list_of_string(conversation.query["sort"]))
            set_json_array_or_not_found(_crucible.libraries.iterate_dates(args), conversation)

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
        def get_track(conversation: Conversation) raises GLib.Error
            set_json_object_or_not_found(_crucible.libraries.get_track(conversation.variables["path"]), conversation)
        
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
        def get_album(conversation: Conversation) raises GLib.Error
            set_json_object_or_not_found(_crucible.libraries.get_album(conversation.variables["path"]), conversation)

        /*
         * send {move: [int, ...]}
         * send {move: {to: int, positions: [int, ...]}}
         * send {add: [string, ...]}
         * send {add: {position: int, paths: [string, ...]}}
         * send {remove: [int, ...]}
         * 
         * receive =get_album
         */
        def post_album(conversation: Conversation) raises GLib.Error
            var album_path = conversation.variables["path"]
            if !album_path.has_prefix("*")
                // Must have custom compilation magic prefix
                conversation.status_code = StatusCode.BAD_REQUEST
                return
            var album = _crucible.libraries.get_album(album_path)
            if album is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var entity = get_json_object_or_bad_request(conversation)
            if entity is null
                return
                
            var processed = false
                
            // Move track pointers
            var move = entity.get_member("move")
            if move is not null
                destination: int = int.MIN
                positions: Json.Array? = null
                if is_object(move)
                    var obj = move.get_object()
                    destination = get_int_member_or_min(obj, "to")
                    positions = get_array_member_or_null(obj, "positions")
                else if is_array(move)
                    positions = move.get_array()
                else
                    conversation.status_code = StatusCode.BAD_REQUEST
                    return
                
                if (positions is not null) and (positions.get_length() > 0)
                    _crucible.libraries.move(album_path, destination, positions)

                    processed = true
            
            // Add track pointers
            var add = entity.get_member("add")
            if add is not null
                destination: int = int.MIN
                paths: Json.Array? = null
                if is_object(add)
                    var obj = add.get_object()
                    destination = get_int_member_or_min(obj, "position")
                    paths = get_array_member_or_null(obj, "paths")
                else if is_array(add)
                    paths = add.get_array()
                else
                    conversation.status_code = StatusCode.BAD_REQUEST
                    return

                if (paths is not null) and (paths.get_length() > 0)
                    _crucible.libraries.add(album_path, destination, paths)

                    processed = true

            // Remove track pointers
            var remove = get_array_member_or_null(entity, "remove")
            if (remove is not null) && (remove.get_length() > 0)
                _crucible.libraries.remove(album_path, remove)

                processed = true
            
            if processed
                set_json_object_or_not_found(album, conversation)
            else
                conversation.status_code = StatusCode.BAD_REQUEST

        /*
         * send {title: string, library: string, tracks: [string, ...]}
         * 
         * receive =get_album
         */
        def put_album(conversation: Conversation) raises GLib.Error
            var album_path = conversation.variables["path"]
            if !album_path.has_prefix("*")
                // Must have custom compilation magic prefix
                conversation.status_code = StatusCode.BAD_REQUEST
                return
            var entity = get_json_object_or_bad_request(conversation)
            if entity is null
                return
                
            // Create a new custom compilation
            var title = get_string_member_or_null(entity, "title")
            var library = get_string_member_or_null(entity, "library")
            if (title is not null) && (library is not null)
                var album = new Album()
                album.path = album_path
                album.title = title
                album.title_sort = to_sortable(title)
                album.library = library
                album.compilation_type = CompilationType.CUSTOM_COMPILATION
                _crucible.libraries.save_album(album)
                _crucible.libraries.delete_track_pointers(album_path)
                
                // Create track pointers
                var tracks = get_array_member_or_null(entity, "tracks")
                if tracks is not null
                    position: int = 1
                    for var i = 0 to (tracks.get_length() - 1)
                        var track = get_string_element_or_null(tracks, i)
                        if track is null
                            conversation.status_code = StatusCode.BAD_REQUEST
                            return
                        var track_pointer = new TrackPointer()
                        track_pointer.path = track
                        track_pointer.album = album_path
                        track_pointer.position = position++
                        _crucible.libraries.save_track_pointer(track_pointer)

                set_json_object_or_not_found(album, conversation)
            else
                conversation.status_code = StatusCode.BAD_REQUEST

        def delete_album(conversation: Conversation) raises GLib.Error
            var path = conversation.variables["path"]
            if !path.has_prefix("*")
                // Must have custom compilation magic prefix
                conversation.status_code = StatusCode.BAD_REQUEST
                return
            var album = _crucible.libraries.get_album(path)
            if album is null
                conversation.status_code = StatusCode.NOT_FOUND
                return

            _crucible.libraries.delete_album(path)
        
        /*
         * receive {
         *  name: string,
         *  directories: [=get_directory, ...]
         * }
         */
        def get_library(conversation: Conversation) raises GLib.Error
            var library = _crucible.libraries.libraries[conversation.variables["library"]]
            set_json_object_or_not_found(library, conversation)

        /*
         * send {add: string}
         * send {remove: string}
         * send {action: string}
         * send {action: {type: string, ...}}
         */
        def post_library(conversation: Conversation) raises GLib.Error
            var library = _crucible.libraries.libraries[conversation.variables["library"]]
            if library is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var entity = get_json_object_or_bad_request(conversation)
            if entity is null
                return

            var processed = false
            
            // Add a directory by path
            var add = get_string_member_or_null(entity, "add")
            if add is not null
                var directory = _crucible.create_directory()
                directory.path = add
                library.directories[add] = directory
                processed = true

            // Remove a directory by path
            var remove = get_string_member_or_null(entity, "remove")
            if remove is not null
                library.directories.unset(remove)
                processed = true

            // Actions
            var action = entity.get_member("action")
            if action is not null
                action_type: string? = null
                path: string? = null
                if is_object(action)
                    var obj = action.get_object()
                    action_type = obj.get_string_member("type")
                    if action_type == "scan"
                        path = obj.get_string_member("path")
                else if is_string(action)
                    action_type = action.get_string()
                
                if action_type == "scan"
                    if path is null
                        library.scan_all()
                    else
                        var directory = library.directories[path]
                        if directory is not null
                            directory.scan()
                        
                    processed = true

            if processed
                set_json_object_or_not_found(library, conversation)
            else
                conversation.status_code = StatusCode.BAD_REQUEST
        
        /*
         * receive =get_library
         */
        def put_library(conversation: Conversation) raises GLib.Error
            var name = conversation.variables["library"]
            var library = _crucible.create_library()
            library.name = name
            _crucible.libraries.libraries[name] = library
            set_json_object_or_not_found(library, conversation)

        def delete_library(conversation: Conversation) raises GLib.Error
            var library = conversation.variables["library"]
            if !_crucible.libraries.libraries.has_key(library)
                conversation.status_code = StatusCode.NOT_FOUND
                return
            _crucible.libraries.libraries.unset(library)

        /*
         * receive {
         *  path: string,
         *  scanning: bool
         * }
         */
        def get_directory(conversation: Conversation) raises GLib.Error
            var library = _crucible.libraries.libraries[conversation.variables["library"]]
            if library is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var directory = library.directories[conversation.variables["directory"]]
            set_json_object_or_not_found(directory, conversation)

        /*
         * send {action: string}
         * 
         * receive =get_directory
         */
        def post_directory(conversation: Conversation) raises GLib.Error
            var library = _crucible.libraries.libraries[conversation.variables["library"]]
            if library is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var directory = library.directories[conversation.variables["directory"]]
            if directory is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var entity = get_json_object_or_bad_request(conversation)
            if entity is null
                return
            
            var action = get_string_member_or_null(entity, "action")
            if action == "scan"
                directory.scan()
            else
                conversation.status_code = StatusCode.BAD_REQUEST

        /*
         * receive =get_directory
         */
        def put_directory(conversation: Conversation) raises GLib.Error
            var library = _crucible.libraries.libraries[conversation.variables["library"]]
            if library is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var path = conversation.variables["directory"]
            var directory = _crucible.create_directory()
            directory.path = path
            library.directories[path] = directory
            set_json_object_or_not_found(directory, conversation)

        def delete_directory(conversation: Conversation) raises GLib.Error
            var library = _crucible.libraries.libraries[conversation.variables["library"]]
            if library is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var path = conversation.variables["directory"]
            if !library.directories.has_key(path)
                conversation.status_code = StatusCode.NOT_FOUND
                return
            library.directories.unset(path)

        /*
         * receive [=get_player, ...]
         */
        def get_players(conversation: Conversation) raises GLib.Error
            set_json_array_or_not_found(_crucible.players, conversation)

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
        def get_player(conversation: Conversation) raises GLib.Error
            var player = _crucible.players.get_or_create_player(conversation.variables["player"])
            set_json_object_or_not_found(player, conversation)

        /*
         * send {playMode: string}
         * send {cursorMode: string}
         * send {cursor: {positionInPlayList: string/int}}
         * send {cursor: {positionInTrack: double}}
         * send {cursor: {ratioInTrack: double}}
         * send {addPlug: {name: string, ...}}
         * send {removePlug: string}
         * send {playList: =post_play_list}
         * 
         * receive =get_player
         */
        def post_player(conversation: Conversation) raises GLib.Error
            var player = _crucible.players.get_or_create_player(conversation.variables["player"])
            if player is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var entity = get_json_object_or_bad_request(conversation)
            if entity is null
                return

            var processed = false
            
            // Set play mode
            var play_mode = get_string_member_or_null(entity, "playMode")
            if play_mode is not null
                var mode = get_play_mode_from_name(play_mode)
                if mode == PlayMode.NULL
                    conversation.status_code = StatusCode.BAD_REQUEST
                    return
                player.play_mode = mode
            
                processed = true

            // Set play mode
            var cursor_mode = get_string_member_or_null(entity, "cursorMode")
            if cursor_mode is not null
                var mode = get_cursor_mode_from_name(cursor_mode)
                if mode == CursorMode.NULL
                    conversation.status_code = StatusCode.BAD_REQUEST
                    return
                player.cursor_mode = mode
            
                processed = true
            
            // Set cursor attributes
            var cursor = get_object_member_or_null(entity, "cursor")
            if cursor is not null
                // Set position in play list
                var position_in_play_list = cursor.get_member("positionInPlayList")
                if position_in_play_list is not null
                    if is_string(position_in_play_list)
                        var str = position_in_play_list.get_string()
                        if str == "next"
                            player.next()
                            processed = true
                        else if str == "prev"
                            player.prev()
                            processed = true
                    else if is_int64(position_in_play_list)
                        player.position_in_play_list = (int) position_in_play_list.get_int()
                        processed = true

                // Set position in track
                var position_in_track = get_double_member_or_min(cursor, "positionInTrack")
                if position_in_track != double.MIN
                    player.position_in_track = position_in_track
                    processed = true

                // Set ratio in track
                var ratio_in_track = get_double_member_or_min(cursor, "ratioInTrack")
                if ratio_in_track != double.MIN
                    player.ratio_in_track = ratio_in_track
                    processed = true
            
            // Add plug
            var add_plug = get_object_member_or_null(entity, "addPlug")
            if add_plug is not null
                var name = add_plug.get_string_member("name")
                if name is not null
                    // TODO
                    processed = true
            
            // Remove plug
            var remove_plug = get_string_member_or_null(entity, "removePlug")
            if remove_plug is not null
                // TODO
                processed = true
            
            // Set play list attributes
            var play_list = get_object_member_or_null(entity, "playList")
            if play_list is not null
                update_play_list(player, play_list, conversation)
                return
            
            if processed
                set_json_object_or_not_found(player, conversation)
            else
                conversation.status_code = StatusCode.BAD_REQUEST

        def put_player(conversation: Conversation) raises GLib.Error
            get_player(conversation)

        def delete_player(conversation: Conversation) raises GLib.Error
            var name = conversation.variables["player"]
            if !_crucible.players.players.has_key(name)
                conversation.status_code = StatusCode.NOT_FOUND
                return
            _crucible.players.players.unset(name)

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
        def get_play_list(conversation: Conversation) raises GLib.Error
            var player = _crucible.players.get_or_create_player(conversation.variables["player"])
            if player is null
                conversation.status_code = StatusCode.NOT_FOUND
                return

            if conversation.query["fullrepresentation"] == "true"
                set_json_object_or_not_found(player, conversation)
            else
                set_json_object_or_not_found(player.play_list, conversation)

        /*
         * send {paths: [string, ...]}
         * send {move: [int, ...]}
         * send {move: {to: int, positions: [int, ...]}}
         * send {add: [string, ...]}
         * send {add: {position: int, paths: [string, ...]}}
         * send {remove: [string, ...]}
         * 
         * receive =get_play_list
         */
        def post_play_list(conversation: Conversation) raises GLib.Error
            var player = _crucible.players.get_or_create_player(conversation.variables["player"])
            if player is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var entity = get_json_object_or_bad_request(conversation)
            if entity is null
                return
                
            update_play_list(player, entity, conversation)

        def update_play_list(player: Player, entity: Json.Object, conversation: Conversation) raises GLib.Error
            var processed = false
            
            // Set entire play list by paths
            var paths = get_array_member_or_null(entity, "paths")
            if paths is not null
                player.play_list.set_paths(paths)

                processed = true

            // Move tracks by their positions
            var move = entity.get_member("move")
            if move is not null
                positions: Json.Array? = null
                destination: int = int.MIN
                if is_object(move)
                    var obj = move.get_object()
                    destination = get_int_member_or_min(obj, "to")
                    positions = get_array_member_or_null(obj, "positions")
                else if is_array(move)
                    positions = move.get_array()
                else
                    conversation.status_code = StatusCode.BAD_REQUEST
                    return
                player.play_list.move(destination, positions)

                processed = true

            // Add tracks by their paths
            var add = entity.get_member("add")
            if add is not null
                add_paths: Json.Array? = null
                position: int = int.MIN
                if is_object(add)
                    var obj = add.get_object()
                    position = get_int_member_or_min(obj, "to")
                    add_paths = get_array_member_or_null(obj, "paths")
                else if is_array(add)
                    add_paths = add.get_array()
                else
                    conversation.status_code = StatusCode.BAD_REQUEST
                    return
                player.play_list.add(position, add_paths)

                processed = true

            // Remove tracks by their paths
            var remove = get_array_member_or_null(entity, "remove")
            if remove is not null
                player.play_list.remove(remove)

                processed = true

            if processed
                if conversation.query["fullrepresentation"] == "true"
                    set_json_object_or_not_found(player, conversation)
                else
                    set_json_object_or_not_found(player.play_list, conversation)
            else
                conversation.status_code = StatusCode.BAD_REQUEST

        def get_plug(conversation: Conversation) raises GLib.Error
            return

        def put_plug(conversation: Conversation) raises GLib.Error
            return

        def delete_plug(conversation: Conversation) raises GLib.Error
            return
        
        _crucible: Crucible

    /*
     * Unified URI space. 
     */
    class UriSpace: Router
        construct(api: Api) raises GLib.Error
            _api = api

            add_node("/libraries/", new DelegatedResource(_api.get_libraries))
            add_node("/libraries/tracks/", new DelegatedResource(_api.get_tracks))
            add_node("/libraries/albums/", new DelegatedResource(_api.get_albums))
            add_node("/libraries/artists/", new DelegatedResource(_api.get_artists))
            add_node("/libraries/dates/", new DelegatedResource(_api.get_dates))
            add_node("/libraries/track/{path}/", new DelegatedResource(_api.get_track))
            add_node("/libraries/album/{path}/", new DelegatedResource(_api.get_album, _api.post_album, _api.put_album, _api.delete_album))
            
            add_node("/library/{library}/", new DelegatedResource(_api.get_library, _api.post_library, _api.put_library, _api.delete_library))
            add_node("/library/{library}/directory/{directory}/", new DelegatedResource(_api.get_directory, _api.post_directory, _api.put_directory, _api.delete_directory))
            add_node("/library/{library}/tracks/", new DelegatedResource(_api.get_tracks))
            add_node("/library/{library}/albums/", new DelegatedResource(_api.get_albums))
            add_node("/library/{library}/artists/", new DelegatedResource(_api.get_artists))
            add_node("/library/{library}/dates/", new DelegatedResource(_api.get_dates))

            add_node("/players/", new DelegatedResource(_api.get_players))
            add_node("/player/{player}/", new DelegatedResource(_api.get_player, _api.post_player, _api.put_player, _api.delete_player))
            add_node("/player/{player}/playlist/", new DelegatedResource(_api.get_play_list, _api.post_play_list))
            add_node("/player/{player}/plug/{plug}/", new DelegatedResource(_api.get_plug, null, _api.put_plug, _api.delete_plug))
        
        _api: Api
