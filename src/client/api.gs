[indent=4]

uses
    Khovsgol
    Nap
    JsonUtil

namespace Khovsgol.Client

    class API: GLib.Object
        construct(host: string, port: uint) raises GLib.Error
            _client = new Nap.Connector._Soup.Client("http://%s:%u".printf(host, port))
            
        /*
         * receive [=get_library, ...]
         */
        def get_libraries(): Json.Array? raises GLib.Error
            var conversation = _client.create_conversation()
            conversation.method = Method.GET
            conversation.path = "/libraries/"
            conversation.commit()
            var entity = conversation.get_entity()
            if entity is not null
                return from_array(entity)
            else
                return null

        /*
         * receive [=get_track, ...]
         */
        def get_tracks(): Json.Array? raises GLib.Error
            return null

        /*
         * receive [=get_album, ...]
         */
        def get_albums(): Json.Array? raises GLib.Error
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
        def get_artists(): Json.Array? raises GLib.Error
            return null

        /*
         * receive [int, ...]
         */
        def get_dates(): Json.Array? raises GLib.Error
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
        def get_track(path: string): Json.Object? raises GLib.Error
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
        def get_album(path: string): Json.Object? raises GLib.Error
            return null

        /*
         * send {move: [int, ...]}
         * send {move: {to: int, positions: [int, ...]}}
         * 
         * receive =get_album
         */
        def move_in_album(path: string, destination: int, positions: list of int): Json.Object? raises GLib.Error
            return null

        /*
         * send {add: [string, ...]}
         * send {add: {position: int, paths: [string, ...]}}
         * 
         * receive =get_album
         */
        def add_to_album(path: string, destination: int, paths: list of string): Json.Object? raises GLib.Error
            return null

        /*
         * send {remove: [int, ...]}
         * 
         * receive =get_album
         */
        def remove_from_album(path: string, positions: list of int): Json.Object? raises GLib.Error
            return null

        /*
         * send {title: string, library: string, tracks: [string, ...]}
         * 
         * receive =get_album
         */
        def set_album(title: string, library: string, tracks: list of string): Json.Object? raises GLib.Error
            return null

        def delete_album(path: string) raises GLib.Error
            pass

        /*
         * receive {
         *  name: string,
         *  directories: [=get_directory, ...]
         * }
         */
        def get_library(name: string): Json.Object? raises GLib.Error
            return null
            
        /*
         * send {add: string}
         * 
         * receive =get_library
         */
        def add_directory(name: string, path: string): Json.Object? raises GLib.Error
            return null

        /*
         * send {remove: string}
         * 
         * receive =get_library
         */
        def remove_directory(name: string, path: string): Json.Object? raises GLib.Error
            return null

        /*
         * send {action: string}
         * send {action: {type: string, ...}}
         * 
         * receive =get_library
         */
        def library_action(name: string, action: string): Json.Object? raises GLib.Error
            return null

        /*
         * receive =get_library
         */
        def set_library(name: string): Json.Object? raises GLib.Error
            return null

        def delete_library(name: string) raises GLib.Error
            pass

        /*
         * receive {
         *  path: string,
         *  scanning: bool
         * }
         */
        def get_directory(name: string, path: string): Json.Object? raises GLib.Error
            return null

        /*
         * send {action: string}
         * send {action: {type: string, ...}}
         * 
         * receive =get_directory
         */
        def directory_action(name: string, path: string, action: string): Json.Object? raises GLib.Error
            return null

        /*
         * receive =get_directory
         */
        def create_directory(name: string, path: string): Json.Object? raises GLib.Error
            return null

        def delete_directory(name: string, path: string) raises GLib.Error
            pass

        /*
         * receive [=get_player, ...]
         */
        def get_players(): Json.Array? raises GLib.Error
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
        def get_player(player: string): Json.Object? raises GLib.Error
            var conversation = _client.create_conversation()
            conversation.method = Method.GET
            conversation.path = "/player/{player}/"
            conversation.variables["player"] = player
            conversation.commit()
            var entity = conversation.get_entity()
            if entity is not null
                return from_object(entity)
            else
                return null

        /*
         * send {playMode: string}
         * 
         * receive =get_player
         */
        def set_play_mode(player: string, play_mode: string): Json.Object? raises GLib.Error
            var payload = new Json.Object()
            payload.set_string_member("playMode", play_mode)

            var conversation = _client.create_conversation()
            conversation.method = Method.POST
            conversation.path = "/player/{player}/"
            conversation.variables["player"] = player
            conversation.request_json_object = payload
            conversation.commit()
            var entity = conversation.get_entity()
            if entity is not null
                return from_object(entity)
            else
                return null

        /*
         * send {cursorMode: string}
         * 
         * receive =get_player
         */
        def set_cursor_mode(player: string, cursor_mode: string): Json.Object? raises GLib.Error
            var payload = new Json.Object()
            payload.set_string_member("cursorMode", cursor_mode)

            var conversation = _client.create_conversation()
            conversation.method = Method.POST
            conversation.path = "/player/{player}/"
            conversation.variables["player"] = player
            conversation.request_json_object = payload
            conversation.commit()
            var entity = conversation.get_entity()
            if entity is not null
                return from_object(entity)
            else
                return null

        /*
         * send {cursor: {positionInPlayList: int}}
         * 
         * receive =get_player
         */
        def set_position_in_play_list(player: string, position: int): Json.Object? raises GLib.Error
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
            var entity = conversation.get_entity()
            if entity is not null
                return from_object(entity)
            else
                return null
        
        /*
         * send {cursor: {positionInPlayList: string}}
         * 
         * receive =get_player
         */
        def set_position_in_play_list_string(player: string, position: string): Json.Object? raises GLib.Error
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
            var entity = conversation.get_entity()
            if entity is not null
                return from_object(entity)
            else
                return null

        /*
         * send {cursor: {positionInTrack: double}}
         * 
         * receive =get_player
         */
        def set_position_in_track(player: string, position: double): Json.Object? raises GLib.Error
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
            var entity = conversation.get_entity()
            if entity is not null
                return from_object(entity)
            else
                return null

        /*
         * send {cursor: {ratioInTrack: double}}
         * 
         * receive =get_player
         */
        def set_ratio_in_track(player: string, ratio: double): Json.Object? raises GLib.Error
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
            var entity = conversation.get_entity()
            if entity is not null
                return from_object(entity)
            else
                return null

        /*
         * send {addPlug: {name: string, ...}}
         * 
         * receive =get_player
         */
        def add_plug_to_player(player: string, plug: string): Json.Object? raises GLib.Error
            return null

        /*
         * send {removePlug: string}
         * 
         * receive =get_player
         */
        def remove_plug_from_player(player: string, plug: string): Json.Object? raises GLib.Error
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
        def get_play_list(player: string): Json.Object? raises GLib.Error
            return null

        /*
         * send {paths: [string, ...]}
         * 
         * receive =get_play_list
         */
        def set_play_list_paths(player: string, paths: list of string): Json.Object? raises GLib.Error
            var payload = new Json.Object()
            var paths_array = new Json.Array()
            for var path in paths
                paths_array.add_string_element(path)
            payload.set_array_member("paths", paths_array)

            var conversation = _client.create_conversation()
            conversation.method = Method.POST
            conversation.path = "/player/{player}/playlist/"
            conversation.variables["player"] = player
            conversation.query["fullrepresentation"] = "true"
            conversation.request_json_object = payload
            conversation.commit()
            var entity = conversation.get_entity()
            if entity is not null
                return from_object(entity)
            else
                return null

        /*
         * send {move: [int, ...]}
         * send {move: {to: int, positions: [int, ...]}}
         * 
         * receive =get_play_list
         */
        def move_in_play_list(player: string, destination: int, positions: list of int): Json.Object? raises GLib.Error
            var payload = new Json.Object()
            var positions_array = new Json.Array()
            for var position in positions
                positions_array.add_int_element(position)
            if destination != int.MIN
                var move = new Json.Object()
                move.set_int_member("to", destination)
                move.set_array_member("positions", positions_array)
                payload.set_object_member("move", move)
            else
                payload.set_array_member("move", positions_array)

            var conversation = _client.create_conversation()
            conversation.method = Method.POST
            conversation.path = "/player/{player}/playlist/"
            conversation.variables["player"] = player
            conversation.query["fullrepresentation"] = "true"
            conversation.request_json_object = payload
            conversation.commit()
            var entity = conversation.get_entity()
            if entity is not null
                return from_object(entity)
            else
                return null

        /*
         * send {add: [string, ...]}
         * send {add: {position: int, paths: [string, ...]}}
         * 
         * receive =get_play_list
         */
        def add_to_play_list(player: string, position: int, paths: list of string): Json.Object? raises GLib.Error
            var payload = new Json.Object()
            var paths_array = new Json.Array()
            for var path in paths
                paths_array.add_string_element(path)
            if position != int.MIN
                var add = new Json.Object()
                add.set_int_member("position", position)
                add.set_array_member("paths", paths_array)
                payload.set_object_member("add", add)
            else
                payload.set_array_member("add", paths_array)

            var conversation = _client.create_conversation()
            conversation.method = Method.POST
            conversation.path = "/player/{player}/playlist/"
            conversation.variables["player"] = player
            conversation.query["fullrepresentation"] = "true"
            conversation.request_json_object = payload
            conversation.commit()
            var entity = conversation.get_entity()
            if entity is not null
                return from_object(entity)
            else
                return null

        /*
         * send {remove: [int, ...]}
         * 
         * receive =get_play_list
         */
        def remove_from_play_list(player: string, positions: list of int): Json.Object? raises GLib.Error
            var payload = new Json.Object()
            var positions_array = new Json.Array()
            for var position in positions
                positions_array.add_int_element(position)
            payload.set_array_member("remove", positions_array)

            var conversation = _client.create_conversation()
            conversation.method = Method.POST
            conversation.path = "/player/{player}/playlist/"
            conversation.variables["player"] = player
            conversation.query["fullrepresentation"] = "true"
            conversation.request_json_object = payload
            conversation.commit()
            var entity = conversation.get_entity()
            if entity is not null
                return from_object(entity)
            else
                return null

        /*
         */
        def get_plug(player: string, plug: string): Json.Object? raises GLib.Error
            return null

        /*
         * receive =get_plug
         */
        def set_plug(player: string, plug: string): Json.Object? raises GLib.Error
            return null

        /*
         * receive =get_player
         */
        def delete_plug(player: string, plug: string): Json.Object? raises GLib.Error
            return null
        
        _client: Nap.Client

