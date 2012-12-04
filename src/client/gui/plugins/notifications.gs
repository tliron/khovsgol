[indent=4]

uses
    JsonUtil

namespace Khovsgol.Client.GUI.Plugins

    /*
     * FreeDesktop Notifications plugin.
     * 
     * Sends a desktop notification every time the current track
     * changes.
     */
    class NotificationsPlugin: Object implements Plugin
        prop instance: Instance
        
        def start()
            var file = _instance.get_resource("khovsgol.svg")
            if file is not null
                _icon = file.get_path()
            else
                _icon = "stock_media-play"

            if _notifications is null
                try
                    _notifications = Bus.get_proxy_sync(BusType.SESSION, "org.freedesktop.Notifications", "/org/freedesktop/Notifications")
                    _instance.api.play_list_change.connect(on_play_list_changed)
                    _instance.api.position_in_play_list_change.connect(on_position_in_play_list_changed)
                    _logger.message("Started")
                except e: IOError
                    _logger.warning(e.message)
        
        def stop()
            if _notifications is not null
                _instance.api.position_in_play_list_change.disconnect(on_position_in_play_list_changed)
                _instance.api.play_list_change.disconnect(on_play_list_changed)
                _notifications = null
                _logger.message("Stopped")
        
        _notifications: Notifications?
        
        def private on_play_list_changed(id: string?, version: int64, old_id: string?, old_version: int64, tracks: IterableOfTrack)
            _tracks = tracks

        def private on_position_in_play_list_changed(position_in_play_list: int, old_position_in_play_list: int)
            for var track in _tracks
                var position = track.position
                if position == position_in_play_list
                    var title = track.title
                    if title is not null
                        var artist = track.artist
                        var album = track.album
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
                            _notifications.Notify("Khövsgöl", position, _icon, "Khövsgöl", markup, _actions, _hints, 3000)
                            _logger.info("Notified new track")
                        except e: IOError
                            _logger.warning(e.message)
                    break

        _tracks: IterableOfTrack
        _actions: array of string = new array of string[0] // {"close", "OK"}
        _hints: HashTable of string, Variant = new HashTable of string, Variant(str_hash, str_equal) // {x: 0, y: 0}
        _icon: string

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
