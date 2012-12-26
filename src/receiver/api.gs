[indent=4]

uses
    Nap
    JsonUtil

namespace Khovsgol.Receiver

    class Api
        construct(instance: Instance)
            _instance = instance
    
        /*
         * receive {
         *  spec: string,
         *  caps: string?
         * }
         */
        def get_receiver(conversation: Conversation)
            var player = _instance.player
            if player is not null
                conversation.response_json_object = player.to_json()
            else
                conversation.status_code = StatusCode.NOT_FOUND

        /*
         * receive=get_recevier
         */
        def post_receiver(conversation: Conversation)
            var entity = conversation.request_json_object
            if entity is null
                conversation.status_code = StatusCode.BAD_REQUEST
                return

            var player = _instance.player
            if player is null
                conversation.status_code = StatusCode.NOT_FOUND
                return
            
            var volume = get_double_member_or_min(entity, "volume")
            if volume != double.MIN
                player.volume = volume
                conversation.response_json_object = player.to_json()
            else
                conversation.status_code = StatusCode.BAD_REQUEST
        
        def put_receiver(conversation: Conversation)
            var entity = conversation.request_json_object
            if entity is not null
                var spec = get_string_member_or_null(entity, "spec")
                if spec is not null
                    var caps = get_string_member_or_null(entity, "caps")
                    
                    var player = _instance.player = create_player(spec, caps)
                    if player is not null
                        player.play()
                        conversation.response_json_object = player.to_json()
                        return

            conversation.status_code = StatusCode.BAD_REQUEST
            
        _instance: Instance

    class UriSpace: Router
        construct(api: Api) raises GLib.Error
            _api = api
            
            add_node("/receiver/", new DelegatedResource(_api.get_receiver, _api.post_receiver, _api.put_receiver))
        
        _api: Api
