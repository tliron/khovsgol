[indent=4]

uses
    JsonUtil

namespace Nap

    def default_error_handler(conversation: Conversation, error: GLib.Error)
        conversation.status_code = StatusCode.INTERNAL_SERVER_ERROR
        Logging.get_logger("nap").warningf("%s (%s %s)", error.message, conversation.method, conversation.path)

    /*
     * Keeps references for a list of objects.
     */
    class Ownerships
        construct()
            _list = new list of Object
    
        def add(ownership: Object): bool
            return _list.add(ownership)
    
        _list: list of Object

    /*
     * Renders an NCSA Common Log entry.
     */
    class NcsaCommonLogEntry
        prop address: string?
        prop user_identifier: string?
        prop user_id: string?
        prop timestamp: DateTime = new DateTime.now_local()
        prop method: string
        prop path: string
        prop protocol: string
        prop status_code: uint
        prop size: uint
        
        prop readonly formatted_timestamp: string
            owned get
                return _timestamp.format("%d/%b/%Y:%H:%M:%S %z")
        
        prop readonly as_string: string
            owned get
                return "%s %s %s [%s] \"%s %s %s\" %u %u".printf(dash(_address), dash(_user_identifier), dash(_user_id), formatted_timestamp, _method, _path, _protocol, _status_code, _size)
                
        def private static dash(str: string?): string
            if (str is null) or (str.length == 0)
                return "-"
            return str
