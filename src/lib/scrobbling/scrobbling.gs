[indent=4]

uses
    Nap
    JsonUtil

namespace Scrobbling

    const LAST_FM_API: string = "http://ws.audioscrobbler.com/2.0/"
    const LAST_FM_AUTH_API: string = "https://ws.audioscrobbler.com/2.0/"
    
    const LIBRE_FM_API: string = "http://turtle.libre.fm/2.0/"
    const LIBRE_FM_AUTH_API: string = "https://turtle.libre.fm/2.0/"
    
    exception Error
        CLIENT
        SERVER

    /*
     * Implementation of Last.fm REST APIs for authentication and scrobbling.
     * 
     * All requests are asynchronous.
     * 
     * See: http://www.last.fm/api/rest
     */
    class Session: Object
        construct(api_url: string, auth_api_url: string, api_key: string, api_secret: string) raises GLib.Error
            _api_key = api_key
            _api_secret = api_secret
            
            _client = new _Soup.Client()
            _client.base_url = api_url

            _auth_client = new _Soup.Client()
            _auth_client.base_url = auth_api_url
        
        event connection(success: bool)
        
        def new @connect(username: string, password: string) raises GLib.Error
            auth_getMobileSession(username, password)
        
        /*
         * See: http://www.last.fm/api/mobileauth
         */
        def auth_getMobileSession(username: string, password: string) raises GLib.Error
            var conversation = _auth_client.create_conversation()
            conversation.request_form["method"] = "auth.getMobileSession"
            conversation.request_form["username"] = username
            conversation.request_form["password"] = password
            conversation.committed.connect(on_get_session_committed)
            commit(conversation)

        /*
         * See: http://www.last.fm/api/show/track.updateNowPlaying
         */
        def track_updateNowPlaying(track: string, artist: string, album: string? = null, track_number: int = int.MIN, duration: int = int.MIN) raises GLib.Error
            var conversation = _client.create_conversation()
            conversation.request_form["method"] = "track.updateNowPlaying"
            conversation.request_form["track"] = track
            conversation.request_form["artist"] = artist
            if album is not null
                conversation.request_form["album"] = album
            if track_number != int.MIN
                conversation.request_form["trackNumber"] = track_number.to_string()
            if duration != int.MIN
                conversation.request_form["duration"] = duration.to_string()
            conversation.committed.connect(on_committed)
            commit(conversation)

        def track_scrobble_now(track: string, artist: string, album: string? = null, track_number: int = int.MIN, duration: int = int.MIN) raises GLib.Error
            track_scrobble((int) (get_real_time() / 1000000L), track, artist, album, track_number, duration)

        /*
         * See: http://www.last.fm/api/show/track.scrobble
         */
        def track_scrobble(timestamp: int, track: string, artist: string, album: string? = null, track_number: int = int.MIN, duration: int = int.MIN) raises GLib.Error
            var conversation = _client.create_conversation()
            conversation.request_form["method"] = "track.scrobble"
            conversation.request_form["timestamp"] = timestamp.to_string()
            conversation.request_form["track"] = track
            conversation.request_form["artist"] = artist
            if album is not null
                conversation.request_form["album"] = album
            if track_number != int.MIN
                conversation.request_form["trackNumber"] = track_number.to_string()
            if duration != int.MIN
                conversation.request_form["duration"] = duration.to_string()
            conversation.committed.connect(on_committed)
            commit(conversation)
        
        _api_key: string
        _api_secret: string
        _session_key: string?
        _client: Nap.Client
        _auth_client: Nap.Client

        def private commit(conversation: Conversation) raises Error
            conversation.method = Method.POST
            
            conversation.request_form["api_key"] = _api_key

            if _session_key is not null
                conversation.request_form["sk"] = _session_key
            
            // The signature is an MD5 of all params (in order) plus the secret
            // See: http://www.last.fm/api/mobileauth#4
            var signature = new StringBuilder()
            var keys = new list of string
            keys.add_all(conversation.request_form.keys)
            keys.sort()
            for var key in keys
                signature.append(key)
                signature.append(conversation.request_form[key])
            signature.append(_api_secret)
            conversation.request_form["api_sig"] = md5(signature.str)

            // Note: format is *not* included in the signature
            conversation.request_form["format"] = "json"
            
            conversation.commit(true)
        
        def private on_committed(conversation: Conversation)
            try
                verify(conversation)
            except e: Error
                _logger.exception(e)
        
        def private on_get_session_committed(conversation: Conversation)
            try
                verify(conversation)
                var session = get_object_member_or_null(conversation.response_json_object, "session")
                if session is not null
                    var key = get_string_member_or_null(session, "key")
                    if key is not null
                        _session_key = key
                        connection(true)
                        return
                _logger.warning("Service did not return a session key")
            except e: Error
                _logger.exception(e)
            connection(false)
        
        def private static verify(conversation: Conversation) raises Error
            if conversation.status_code == StatusCode.OK
                var error = get_int_member_or_min(conversation.response_json_object, "error")
                if error != int.MIN
                    var message = get_string_member_or_null(conversation.response_json_object, "message")
                    raise new Error.CLIENT("Error %d: %s", error, message is not null ? message : "[no message]")
            else
                raise new Error.CLIENT("%u", conversation.status_code)
            
        def private static md5(text: string): string
            return Checksum.compute_for_data(ChecksumType.MD5, text.data)

        _logger: static Logging.Logger

        init
            _logger = Logging.get_logger("scrobbling")
