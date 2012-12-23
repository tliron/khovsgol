[indent=4]

uses
    JsonUtil

namespace Khovsgol.Client.Plugins

    /*
     * FreeDesktop Notifications plugin.
     * 
     * Sends a desktop notification every time the current track
     * changes.
     */
    class NotificationsPlugin: Object implements Plugin
        prop readonly name: string = "notification"
        prop instance: Instance
        prop readonly state: PluginState
            get
                return (PluginState) AtomicInt.@get(ref _state)
        
        def start()
            if state == PluginState.STOPPED
                set_state(PluginState.STARTING)

                var file = _instance.get_resource("khovsgol.svg")
                if file is not null
                    _default_icon = file.get_path()
                else
                    _default_icon = "stock_media-play"

                try
                    _notifications = Bus.get_proxy_sync(BusType.SESSION, "org.freedesktop.Notifications", "/org/freedesktop/Notifications")
                    _instance.api.track_change.connect(on_track_changed)
                    _instance.api.error.connect(on_error)
                    set_state(PluginState.STARTED)
                except e: IOError
                    _logger.exception(e)
                    set_state(PluginState.STOPPED)
        
        def stop()
            if state == PluginState.STARTED
                set_state(PluginState.STOPPING)
                _instance.api.track_change.disconnect(on_track_changed)
                _instance.api.error.disconnect(on_error)
                _notifications = null
                set_state(PluginState.STOPPED)
        
        _state: int = PluginState.STOPPED
        _notifications: Notifications?
        
        def private set_state(state: PluginState)
            AtomicInt.@set(ref _state, state)
            _logger.message(get_name_from_plugin_state(state))

        def private on_track_changed(track: Track?, old_track: Track?)
            if track is not null
                var path = track.path
                if path != _last_path
                    _last_path = path
                    var title = track.title
                    if title is not null
                        var artist = track.artist
                        var album = track.album
                        var position = track.position_in_album
                        
                        title = Markup.escape_text(title)
                        title = format_annotation(title)
                        if artist is not null
                            artist = Markup.escape_text(artist)
                        if album is not null
                            album = Markup.escape_text(album)
                            album = format_annotation(album)
                        markup: string
                        if (artist is not null) and (album is not null) and (position != int.MIN)
                            markup = "%s\r<span size=\"smaller\">By <i>%s</i></span>\r<span size=\"smaller\">%s in %s</span>".printf(title, artist, format_ordinal(position), album)
                        else if (artist is not null) and (album is not null)
                            markup = "%s\r<span size=\"smaller\">By <i>%s</i></span>\r<span size=\"smaller\">In %s</span>".printf(title, artist, album)
                        else if (artist is not null) and (album is null)
                            markup = "%s\r<span size=\"smaller\">By <i>%s</i></span>".printf(title, artist)
                        else if (artist is null) and (album is not null)
                            markup = "%s\r<span size=\"smaller\">In %s</span>".printf(title, album)
                        else
                            markup = title
                            
                        icon: string
                        var file = find_cover(File.new_for_path(track.path).get_parent())
                        if file is not null
                            icon = file.get_path()
                        else
                            icon = _default_icon
                            
                        try
                            _notifications.notify("Khövsgöl", track.position_in_playlist, icon, "Khövsgöl", markup, _actions, _hints, DURATION)
                            _logger.infof("Notified new track: %s", track.path)
                        except e: IOError
                            _logger.exception(e)
        
        def private on_error(e: GLib.Error)
            var markup = Markup.escape_text(e.message)
            try
                _notifications.notify("Khövsgöl", 0, _default_icon, "Khövsgöl", markup, _actions, _hints, DURATION)
            except e: IOError
                _logger.exception(e)

        _actions: array of string = new array of string[0] // {"close", "OK"}
        _hints: HashTable of string, Variant = new HashTable of string, Variant(str_hash, str_equal) // {x: 0, y: 0}
        _default_icon: string
        _last_path: string?
        
        const DURATION: int = 2000

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
