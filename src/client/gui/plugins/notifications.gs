[indent=4]

uses
    JsonUtil

namespace Khovsgol.GUI.Plugins

    /*
     * FreeDesktop Notifications plugin.
     * 
     * Sends a desktop notification every time the current track
     * changes.
     */
    class NotificationsPlugin: Object implements Khovsgol.GUI.Plugin
        prop instance: Khovsgol.GUI.Instance
        
        def start()
            if _notifications is null
                try
                    _notifications = Bus.get_proxy_sync(BusType.SESSION, "org.freedesktop.Notifications", "/org/freedesktop/Notifications")
                    _instance.api.play_list_change.connect(on_play_list_changed)
                    _instance.api.position_in_play_list_change.connect(on_position_in_play_list_changed)
                    _logger.message("Started")
                except e: IOError
                    _logger.warning(e.message)
        
        def stop()
            _instance.api.position_in_play_list_change.disconnect(on_position_in_play_list_changed)
            _instance.api.play_list_change.disconnect(on_play_list_changed)
            _logger.message("Stopped")
        
        _notifications: Notifications
        
        def private on_play_list_changed(id: string?, version: int64, old_id: string?, old_version: int64, tracks: Json.Array?)
            _tracks = tracks

        def private on_position_in_play_list_changed(position_in_play_list: int, old_position_in_play_list: int)
            if (_tracks is not null) && (_tracks.get_length() > 0)
                for var i = 0 to (_tracks.get_length() - 1)
                    var track = get_object_element_or_null(_tracks, i)
                    if track is not null
                        var position = get_int_member_or_min(track, "position")
                        if position == position_in_play_list
                            var title = get_string_member_or_null(track, "title")
                            if title is not null
                                var artist = get_string_member_or_null(track, "artist")
                                var album = get_string_member_or_null(track, "album")
                                title = Markup.escape_text(title)
                                title = format_annotation(title)
                                if artist is not null
                                    artist = Markup.escape_text(artist)
                                if album is not null
                                    album = Markup.escape_text(album)
                                    album = format_annotation(album)
                                markup: string
                                if (artist is not null) and (album is not null)
                                    markup = "%s\r<span size=\"smaller\">By <i>%s</i></span>\r<span size=\"smaller\">In %s</span>".printf(title, artist, album)
                                else if (artist is not null) and (album is null)
                                    markup = "%s\r<span size=\"smaller\">By <i>%s</i></span>".printf(title, artist)
                                else if (artist is null) and (album is not null)
                                    markup = "%s\r<span size=\"smaller\">In %s</span>".printf(title, album)
                                else
                                    markup = title
                                    
                                try
                                    _notifications.Notify("Khövsgöl", position, "play", "Khövsgöl", markup, _actions, _hints, 3000)
                                    _logger.info("Notified new track")
                                except e: IOError
                                    _logger.warning(e.message)
                            break

        _tracks: Json.Array?
        _actions: array of string = new array of string[0] // {"close", "OK"}
        _hints: HashTable of string, Variant = new HashTable of string, Variant(str_hash, str_equal) // {x: 0, y: 0}

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.notifications")

    /*
    [DBus(name="org.freedesktop.Notifications")]
    interface private Notifications: Object
        def abstract Notify(app_name: string, replaces_id: uint32, app_icon: string, summary: string, body: string, actions: array of string, hints: HashTable of string, Variant, expires_timeout: int32): uint32 raises IOError
        event NotificationClosed(id: uint32, reason: uint32)
        event ActionInvoked(id: uint32, action_key: string)
    */
