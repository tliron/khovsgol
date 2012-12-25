[indent=4]

uses
    Nap
    JsonUtil
    
namespace Khovsgol.Server

    def set_response_json_object_or_not_found(has_json: HasJsonObject?, conversation: Conversation): bool
        if has_json is not null
            var json = has_json.to_json()
            if json.get_size() > 0
                conversation.response_json_object = json
                return true
        conversation.status_code = StatusCode.NOT_FOUND
        return false
    
    def set_response_json_array_or_not_found(json: Json.Array?, conversation: Conversation): bool
        if json.get_length() > 0
            conversation.response_json_array = json
            return true
        conversation.status_code = StatusCode.NOT_FOUND
        return false

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
     * Unified server-side API.
     * 
     * All arguments and JSON object or array return values are provided
     * via Nap conversations.
     * 
     * The UriSpace class wraps this API in RESTful resources that
     * can easily be served over HTTP via Nap.
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
                var json = _crucible.libraries.iterate_tracks_by_artist(args).to_json()
                foreach_object_in_json_array(json, get_album_path_dynamic)
                set_response_json_array_or_not_found(json, conversation)
                return

            // Tracks in album
            var album = conversation.query["album"]
            if album is not null
                var args = new IterateForAlbumArgs()
                args.album = album
                args.sort.add_all(get_list_of_string(conversation.query["sort"]))
                json: Json.Array
                if album.has_prefix("*")
                    // Custom compilation magic prefix
                    json = _crucible.libraries.iterate_track_pointers_in_album(args).to_json()
                else
                    json = _crucible.libraries.iterate_tracks_in_album(args).to_json()
                    
                foreach_object_in_json_array(json, new AlbumPathConstant(album).do_on_json_object)
                set_response_json_array_or_not_found(json, conversation)
                return
            
            // Search tracks
            var args = new IterateTracksArgs()
            args.title_like = conversation.query["titlelike"]
            args.artist_like = conversation.query["artistlike"]
            args.album_like = conversation.query["albumlike"]
            args.libraries.add_all(get_list_of_libraries(conversation))
            args.sort.add_all(get_list_of_string(conversation.query["sort"]))
            var album_type_string = conversation.query["type"]
            var album_type = AlbumType.ANY
            if album_type_string is not null
                album_type = (AlbumType) int.parse(album_type_string)
            json: Json.Array = null

            // Note: AlbumType.COMPILATION handling is identical to AlbumType.ARTIST
            if album_type != AlbumType.SAVED_PLAYLIST
                var iterator = _crucible.libraries.iterate_tracks(args)
                json = iterator.to_json()
                foreach_object_in_json_array(json, get_album_path_dynamic)
            // Note: playlist tracks are always put *after* regular tracks, whatever the sort order
            if (album_type == AlbumType.ANY) or (album_type == AlbumType.SAVED_PLAYLIST)
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
                set_response_json_array_or_not_found(_crucible.libraries.iterate_albums_with_artist(args).to_json(), conversation)
                return
            
            // Albums by artist
            var album_artist = conversation.query["albumartist"]
            if album_artist is not null
                var args = new IterateForArtistArgs()
                args.artist = album_artist
                args.like = conversation.query["like"] == "true"
                args.libraries.add_all(get_list_of_libraries(conversation))
                args.sort.add_all(get_list_of_string(conversation.query["sort"]))
                set_response_json_array_or_not_found(_crucible.libraries.iterate_albums_by_artist(args).to_json(), conversation)
                return
            
            // Albums at date
            var date = conversation.query["date"]
            if date is not null
                var args = new IterateForDateArgs()
                args.date = int.parse(date)
                args.like = conversation.query["like"] == "true"
                args.libraries.add_all(get_list_of_libraries(conversation))
                args.sort.add_all(get_list_of_string(conversation.query["sort"]))
                set_response_json_array_or_not_found(_crucible.libraries.iterate_albums_at(args).to_json(), conversation)
                return
            
            // All albums
            var args = new IterateAlbumsArgs()
            args.libraries.add_all(get_list_of_libraries(conversation))
            args.sort.add_all(get_list_of_string(conversation.query["sort"]))
            var album_type_string = conversation.query["type"]
            if album_type_string is not null
                args.album_type = (AlbumType) int.parse(album_type_string)
            set_response_json_array_or_not_found(_crucible.libraries.iterate_albums(args).to_json(), conversation)

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
            set_response_json_array_or_not_found(_crucible.libraries.iterate_artists(args).to_json(), conversation)
        
        /*
         * receive [int, ...]
         */
        def get_dates(conversation: Conversation) raises GLib.Error
            var args = new IterateByAlbumsOrTracksArgs()
            args.libraries.add_all(get_list_of_libraries(conversation))
            args.album_artist = conversation.query["album"] == "true"
            args.sort.add_all(get_list_of_string(conversation.query["sort"]))
            set_response_json_array_or_not_found(_crucible.libraries.iterate_dates(args).to_json(), conversation)

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
            set_response_json_object_or_not_found(_crucible.libraries.get_track(conversation.variables["path"]), conversation)
        
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
            set_response_json_object_or_not_found(_crucible.libraries.get_album(conversation.variables["path"]), conversation)

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
            if not album_path.has_prefix("*")
                // Must have saved playlist magic prefix
                conversation.status_code = StatusCode.BAD_REQUEST
                return
            var album = _crucible.libraries.get_album(album_path)
            if album is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var entity = conversation.request_json_object
            if entity is null
                conversation.status_code = StatusCode.BAD_REQUEST
                return
                
            var processed = false
                
            // Move track pointers
            var move = get_member_or_null(entity, "move")
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
                
                if positions is not null
                    stable_position: int = int.MIN
                    _crucible.libraries.move_in_album(album_path, destination, positions, ref stable_position)

                    processed = true
            
            // Add track pointers
            var add = get_member_or_null(entity, "add")
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

                if paths is not null
                    stable_position: int = int.MIN
                    _crucible.libraries.add_to_album(album_path, destination, paths, ref stable_position)

                    processed = true

            // Remove track pointers
            var remove = get_array_member_or_null(entity, "remove")
            if remove is not null
                stable_position: int = int.MIN
                _crucible.libraries.remove_from_album(album_path, remove, ref stable_position)

                processed = true
            
            if processed
                set_response_json_object_or_not_found(album, conversation)
            else
                conversation.status_code = StatusCode.BAD_REQUEST

        /*
         * send {title: string, library: string, tracks: [string, ...]}
         * 
         * receive =get_album
         */
        def put_album(conversation: Conversation) raises GLib.Error
            var album_path = conversation.variables["path"]
            if not album_path.has_prefix("*")
                // Must have saved playlist magic prefix
                conversation.status_code = StatusCode.BAD_REQUEST
                return
            var entity = conversation.request_json_object
            if entity is null
                conversation.status_code = StatusCode.BAD_REQUEST
                return
                
            // Create a new saved playlist
            var title = get_string_member_or_null(entity, "title")
            var library = get_string_member_or_null(entity, "library")
            if (title is not null) and (library is not null)
                var album = new Album()
                album.path = album_path
                album.title = title
                album.title_sort = to_sortable(title)
                album.library = library
                album.album_type = AlbumType.SAVED_PLAYLIST
                
                _crucible.libraries.write_begin()
                try
                    _crucible.libraries.save_album(album)
                    _crucible.libraries.delete_track_pointers(album_path)
                    
                    // Create track pointers
                    var tracks = get_array_member_or_null(entity, "tracks")
                    position: int = 1
                    for var path in new JsonStrings(tracks)
                        var track_pointer = new TrackPointer()
                        track_pointer.path = path
                        track_pointer.album = album_path
                        track_pointer.position = position++
                        _crucible.libraries.save_track_pointer(track_pointer)
                except e: GLib.Error
                    _crucible.libraries.write_rollback()
                    raise e
                _crucible.libraries.write_commit()

                set_response_json_object_or_not_found(album, conversation)
            else
                conversation.status_code = StatusCode.BAD_REQUEST

        def delete_album(conversation: Conversation) raises GLib.Error
            var path = conversation.variables["path"]
            if not path.has_prefix("*")
                // Must have saved playlist magic prefix
                conversation.status_code = StatusCode.BAD_REQUEST
                return
            var album = _crucible.libraries.get_album(path)
            if album is null
                conversation.status_code = StatusCode.NOT_FOUND
                return

            _crucible.libraries.write_begin()
            try
                _crucible.libraries.delete_album(path)
            except e: GLib.Error
                _crucible.libraries.write_rollback()
                raise e
            _crucible.libraries.write_commit()
        
        /*
         * receive {
         *  name: string,
         *  directories: [=get_directory, ...]
         * }
         */
        def get_library(conversation: Conversation) raises GLib.Error
            var library = _crucible.libraries.get_library(conversation.variables["library"])
            set_response_json_object_or_not_found(library, conversation)

        /*
         * send {add: string}
         * send {remove: string}
         * send {action: string}
         * send {action: {type: string, ...}}
         * 
         * receive =get_library
         */
        def post_library(conversation: Conversation) raises GLib.Error
            var library = _crucible.libraries.get_library(conversation.variables["library"])
            if library is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var entity = conversation.request_json_object
            if entity is null
                conversation.status_code = StatusCode.BAD_REQUEST
                return

            var processed = false
            
            // Add a directory by path
            var add = get_string_member_or_null(entity, "add")
            if add is not null
                var directory = _crucible.create_directory()
                directory.path = add
                directory.library = library
                library.add_directory(directory)
                processed = true

            // Remove a directory by path
            var remove = get_string_member_or_null(entity, "remove")
            if remove is not null
                library.remove_directory(remove)
                processed = true

            // Actions
            var action = get_member_or_null(entity, "action")
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
                        var directory = library.get_directory(path)
                        if directory is not null
                            directory.scan()
                        
                    processed = true
                    
                else if action_type == "abort"
                    if path is null
                        library.abort_all()
                    else
                        var directory = library.get_directory(path)
                        if directory is not null
                            directory.abort()

            if processed
                set_response_json_object_or_not_found(library, conversation)
            else
                conversation.status_code = StatusCode.BAD_REQUEST
        
        /*
         * receive =get_library
         */
        def put_library(conversation: Conversation) raises GLib.Error
            var name = conversation.variables["library"]
            var library = _crucible.create_library()
            library.name = name
            _crucible.libraries.add_library(library)
            set_response_json_object_or_not_found(library, conversation)

        def delete_library(conversation: Conversation) raises GLib.Error
            var library = conversation.variables["library"]
            if _crucible.libraries.get_library(library) is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            _crucible.libraries.remove_library(library)

        /*
         * receive {
         *  path: string,
         *  scanning: bool
         * }
         */
        def get_directory(conversation: Conversation) raises GLib.Error
            var library = _crucible.libraries.get_library(conversation.variables["library"])
            if library is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var directory = library.get_directory(conversation.variables["path"])
            set_response_json_object_or_not_found(directory, conversation)

        /*
         * send {action: string}
         * 
         * receive =get_directory
         */
        def post_directory(conversation: Conversation) raises GLib.Error
            var library = _crucible.libraries.get_library(conversation.variables["library"])
            if library is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var directory = library.get_directory(conversation.variables["path"])
            if directory is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var entity = conversation.request_json_object
            if entity is null
                conversation.status_code = StatusCode.BAD_REQUEST
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
            var library = _crucible.libraries.get_library(conversation.variables["library"])
            if library is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var path = conversation.variables["path"]
            var directory = _crucible.create_directory()
            directory.path = path
            directory.library = library
            library.add_directory(directory)
            set_response_json_object_or_not_found(directory, conversation)

        def delete_directory(conversation: Conversation) raises GLib.Error
            var library = _crucible.libraries.get_library(conversation.variables["library"])
            if library is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var path = conversation.variables["path"]
            if library.get_directory(path) is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            library.remove_directory(path)

        /*
         * receive [=get_player, ...]
         */
        def get_players(conversation: Conversation) raises GLib.Error
            set_response_json_array_or_not_found(_crucible.players.to_json(), conversation)

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
        def get_player(conversation: Conversation) raises GLib.Error
            var player = _crucible.players.get_or_create_player(conversation.variables["player"])
            set_response_json_object_or_not_found(player, conversation)

        /*
         * send {volume: string}
         * send {playMode: string}
         * send {cursorMode: string}
         * send {cursor: {positionInPlaylist: string/int}}
         * send {cursor: {positionInTrack: double}}
         * send {cursor: {ratioInTrack: double}}
         * send {addPlug: {name: string, ...}}
         * send {removePlug: string}
         * send {playList: =post_playlist}
         * 
         * receive =get_player
         */
        def post_player(conversation: Conversation) raises GLib.Error
            var player = _crucible.players.get_or_create_player(conversation.variables["player"])
            if player is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var entity = conversation.request_json_object
            if entity is null
                conversation.status_code = StatusCode.BAD_REQUEST
                return

            var processed = false
            
            // Set volume
            var volume = get_double_member_or_min(entity, "volume")
            if volume != double.MIN
                player.volume = volume
            
                processed = true

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
                var position_in_playlist = get_member_or_null(cursor, "positionInPlaylist")
                if position_in_playlist is not null
                    if is_string(position_in_playlist)
                        var str = position_in_playlist.get_string()
                        if str == "next"
                            player.next()
                            processed = true
                        else if str == "prev"
                            player.prev()
                            processed = true
                    else if is_int64(position_in_playlist)
                        player.position_in_playlist = (int) position_in_playlist.get_int()
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
            var playlist = get_object_member_or_null(entity, "playList")
            if playlist is not null
                update_playlist(player, playlist, conversation)
                return
            
            if processed
                set_response_json_object_or_not_found(player, conversation)
            else
                conversation.status_code = StatusCode.BAD_REQUEST

        def put_player(conversation: Conversation) raises GLib.Error
            get_player(conversation)

        def delete_player(conversation: Conversation) raises GLib.Error
            var name = conversation.variables["player"]
            if not _crucible.players.players.has_key(name)
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
         *  tracks: =get_tracks,
         *  albums: =get_albums
         * }
         */
        def get_playlist(conversation: Conversation) raises GLib.Error
            var player = _crucible.players.get_or_create_player(conversation.variables["player"])
            if player is null
                conversation.status_code = StatusCode.NOT_FOUND
                return

            if conversation.query["fullrepresentation"] == "true"
                set_response_json_object_or_not_found(player, conversation)
            else
                set_response_json_object_or_not_found(player.playlist, conversation)

        /*
         * send {paths: [string, ...]}
         * send {move: [int, ...]}
         * send {move: {to: int, positions: [int, ...]}}
         * send {add: [string, ...]}
         * send {add: {to: int, paths: [string, ...]}}
         * send {remove: [int, ...]}
         * 
         * receive =get_playlist
         */
        def post_playlist(conversation: Conversation) raises GLib.Error
            var player = _crucible.players.get_or_create_player(conversation.variables["player"])
            if player is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            var entity = conversation.request_json_object
            if entity is null
                conversation.status_code = StatusCode.BAD_REQUEST
                return
                
            update_playlist(player, entity, conversation)

        def update_playlist(player: Player, entity: Json.Object, conversation: Conversation) raises GLib.Error
            var processed = false
            
            // Set entire play list by paths
            var paths = get_array_member_or_null(entity, "paths")
            if paths is not null
                player.playlist.set_paths(paths)

                processed = true

            // Move tracks by their positions
            var move = get_member_or_null(entity, "move")
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
                player.playlist.move(destination, positions)

                processed = true

            // Add tracks by their paths
            var add = get_member_or_null(entity, "add")
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
                player.playlist.add(position, add_paths)

                processed = true

            // Remove tracks by their positions
            var remove = get_array_member_or_null(entity, "remove")
            if remove is not null
                player.playlist.remove(remove)

                processed = true

            if processed
                if conversation.query["fullrepresentation"] == "true"
                    set_response_json_object_or_not_found(player, conversation)
                else
                    set_response_json_object_or_not_found(player.playlist, conversation)
            else
                conversation.status_code = StatusCode.BAD_REQUEST

        /*
         * TODO
         */
        def get_plug(conversation: Conversation) raises GLib.Error
            var player = _crucible.players.get_or_create_player(conversation.variables["player"])
            if player is null
                conversation.status_code = StatusCode.NOT_FOUND
                return

            var spec = conversation.variables["plug"]
            var plug = player.get_plug(spec, conversation.peer)
        
            if plug is not null
                if conversation.query["fullrepresentation"] == "true"
                    set_response_json_object_or_not_found(player, conversation)
                else
                    set_response_json_object_or_not_found(plug, conversation)
            else
                conversation.status_code = StatusCode.NOT_FOUND

        /*
         * receive =get_plug
         */
        def put_plug(conversation: Conversation) raises GLib.Error
            var player = _crucible.players.get_or_create_player(conversation.variables["player"])
            if player is null
                conversation.status_code = StatusCode.NOT_FOUND
                return

            var spec = conversation.variables["plug"]
            var plug = player.set_plug(spec, conversation.peer)
        
            if plug is not null
                if conversation.query["fullrepresentation"] == "true"
                    set_response_json_object_or_not_found(player, conversation)
                else
                    set_response_json_object_or_not_found(plug, conversation)
            else
                conversation.status_code = StatusCode.INTERNAL_SERVER_ERROR

        def delete_plug(conversation: Conversation) raises GLib.Error
            var player = _crucible.players.get_or_create_player(conversation.variables["player"])
            if player is null
                conversation.status_code = StatusCode.NOT_FOUND
                return

            var spec = conversation.variables["plug"]
            if not player.remove_plug(spec, conversation.peer)
                conversation.status_code = StatusCode.NOT_FOUND
        
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
            add_node("/library/{library}/directory/{path}/", new DelegatedResource(_api.get_directory, _api.post_directory, _api.put_directory, _api.delete_directory))
            add_node("/library/{library}/tracks/", new DelegatedResource(_api.get_tracks))
            add_node("/library/{library}/albums/", new DelegatedResource(_api.get_albums))
            add_node("/library/{library}/artists/", new DelegatedResource(_api.get_artists))
            add_node("/library/{library}/dates/", new DelegatedResource(_api.get_dates))

            add_node("/players/", new DelegatedResource(_api.get_players))
            add_node("/player/{player}/", new DelegatedResource(_api.get_player, _api.post_player, _api.put_player, _api.delete_player))
            add_node("/player/{player}/playlist/", new DelegatedResource(_api.get_playlist, _api.post_playlist))
            add_node("/player/{player}/plug/{plug}/", new DelegatedResource(_api.get_plug, null, _api.put_plug, _api.delete_plug))
        
        _api: Api
