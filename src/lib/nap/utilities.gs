[indent=4]

uses
    JsonUtil

namespace Nap

    def set_json_object_or_not_found(has_json: HasJsonObject?, conversation: Conversation): bool
        if has_json is not null
            var json = has_json.to_json()
            if json.get_size() > 0
                conversation.response_json_object = json
                return true
        conversation.status_code = StatusCode.NOT_FOUND
        return false
    
    def set_json_array_or_not_found(has_json: HasJsonArray?, conversation: Conversation): bool
        if has_json is not null
            var json = has_json.to_json()
                if json.get_length() > 0
                    conversation.response_json_array = json
                    return true
        conversation.status_code = StatusCode.NOT_FOUND
        return false

    def get_json_object_or_bad_request(conversation: Conversation): Json.Object?
        var entity = conversation.get_entity()
        if entity is null
            conversation.status_code = StatusCode.BAD_REQUEST
            return null
        try
            return JsonUtil.from_object(entity)
        except e: JsonUtil.Error
            conversation.status_code = StatusCode.BAD_REQUEST
            return null

    def json_to_text(conversation: Conversation)
        if (conversation.response_json_object is not null) or (conversation.response_json_array is not null)
            var jsonp = conversation.query["jsonp"]
            var human = jsonp is null && conversation.query["human"] == "true"
            if conversation.response_json_object is not null
                conversation.response_text = JsonUtil.object_to(conversation.response_json_object, human)
            else
                conversation.response_text = JsonUtil.array_to(conversation.response_json_array, human)
            if jsonp is not null
                conversation.response_text = "%s(%s)".printf(jsonp, conversation.response_text)
            if conversation.media_type is null
                conversation.media_type = "application/json"

    def default_error_handler(conversation: Conversation, error: GLib.Error)
        conversation.status_code = StatusCode.INTERNAL_SERVER_ERROR
        Logging.get_logger("nap").warning("%s (%s %s)", error.message, conversation.get_method(), conversation.path)

    /*
     * Keeps references for a list of objects.
     */
    class Ownerships
        construct()
            _list = new list of Object
    
        def add(ownership: Object): bool
            return _list.add(ownership)
    
        _list: list of Object
