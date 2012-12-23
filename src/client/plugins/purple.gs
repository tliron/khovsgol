[indent=4]

namespace Khovsgol.Client.Plugins

    /*
     * Purple plugin.
     * 
     * Sets the instant messaging status for Pidgin and Finch.
     *
     * This was hard to get right! Many thanks to Jon Turney, author of the Pidgin Musictracker plugin,
     * for his excellent code. See:
     * 
     *   http://code.google.com/p/pidgin-musictracker/source/browse/trunk/src/musictracker.c
     */
    class PurplePlugin: Object implements Plugin
        prop readonly name: string = "purple"
        prop instance: Instance
        prop readonly state: PluginState
            get
                return (PluginState) AtomicInt.@get(ref _state)
        
        def start()
            if state == PluginState.STOPPED
                set_state(PluginState.STARTING)

                try
                    _purple = Bus.get_proxy_sync(BusType.SESSION, "im.pidgin.purple.PurpleService", "/im/pidgin/purple/PurpleObject")
                    _tune_status_type_id = _purple.purple_primitive_get_id_from_type(StatusTypePrimitive.TUNE)
                    _instance.api.track_change.connect(on_track_changed)
                    set_state(PluginState.STARTED)
                except e: IOError
                    _logger.exception(e)
                    _purple = null
                    set_state(PluginState.STOPPED)
        
        def stop()
            if state == PluginState.STARTED
                set_state(PluginState.STOPPING)
                _instance.api.track_change.disconnect(on_track_changed)
                on_track_changed(null, null)
                _purple = null
                set_state(PluginState.STOPPED)

        _state: int = PluginState.STOPPED
        _purple: PurpleObject?
        _tune_status_type_id: string

        def private set_state(state: PluginState)
            AtomicInt.@set(ref _state, state)
            _logger.message(get_name_from_plugin_state(state))

        def private on_track_changed(track: Track?, old_track: Track?)
            if _purple is null
                return
        
            message: string? = null
            if (track is not null) and (track.title is not null)
                if (track.artist is not null) and (track.album is not null)
                    message = "♪ %s by %s on %s".printf(track.title, track.artist, track.album)
                else if track.artist is not null
                    message = "♪ %s by %s".printf(track.title, track.artist)
                else if track.album is not null
                    message = "♪ %s on %s".printf(track.title, track.album)
                else
                    message = "♪ %s".printf(track.title)
        
            try
                var accounts = _purple.purple_accounts_get_all_active()
                if accounts is not null
                    for var account in accounts
                        var protocol = _purple.purple_account_get_protocol_name(account)
                        var username = _purple.purple_account_get_username(account)
                        var status = _purple.purple_account_get_active_status(account)
                        
                        // Ignore accounts that offline or invisible (nobody will see the status anyway...)
                        if is_offline_or_invisible(status)
                            continue
                        
                        // Set the "message" attribute in the active status
                        if has_attribute(status, "message")
                            if track is not null
                                _logger.infof("Setting account %s/%s status %d to: \"%s\"", protocol, username, status, message)
                            else
                                // Return to saved status
                                var saved_status = _purple.purple_savedstatus_get_current()
                                if saved_status != 0
                                    var saved_sub_status = _purple.purple_savedstatus_get_substatus(saved_status, account)
                                    if saved_sub_status != 0
                                        // Saved sub-status
                                        message = _purple.purple_savedstatus_substatus_get_message(saved_sub_status)
                                        _logger.infof("Setting account %s/%s status %d to saved sub-status: \"%s\"", protocol, username, status, message)
                                    else
                                        // Saved status
                                        message = _purple.purple_savedstatus_get_message(saved_sub_status)
                                        _logger.infof("Setting account %s/%s status %d to saved status: \"%s\"", protocol, username, status, message)

                            if message is not null
                                _purple.purple_status_set_attr_string(status, "message", message)
                                _purple.purple_status_set_active(status, 1)
                    
                        // Some accounts support a special "tune" status in their presence
                        var presence = _purple.purple_account_get_presence(account)
                        if presence != 0
                            var tune_status = _purple.purple_presence_get_status(presence, _tune_status_type_id)
                            if tune_status != 0
                                // Set tune status
                                if track is not null
                                    _logger.infof("Setting account %s/%s tune status %d", protocol, username, tune_status)
                                    _purple.purple_status_set_attr_string(tune_status, "tune_artist", track.artist is not null ? track.artist : "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_title", track.title is not null ? track.title : "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_album", track.album is not null ? track.album : "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_year", ((track.date != int.MIN) and (track.date != 0)) ? track.date.to_string() : "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_time", track.duration != double.MIN ? "%.2f".printf(track.duration) : "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_genre", "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_comment", "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_track", track.position_in_album != int.MIN ? track.position_in_album.to_string() : "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_url", "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_full", "")
                                    _purple.purple_status_set_active(tune_status, 1)
                                else
                                    _logger.infof("Resetting account %s/%s tune status %d", protocol, username, tune_status)
                                    
                                    // It seems that we need to explicitly reset the fields
                                    _purple.purple_status_set_attr_string(tune_status, "tune_artist", "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_title", "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_album", "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_year", "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_time", "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_genre", "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_comment", "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_track", "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_url", "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_full", "")
                                    _purple.purple_status_set_active(tune_status, 0)
            except e: IOError
                _logger.exception(e)
                
        def private is_offline_or_invisible(status: int): bool raises IOError
            var status_type = _purple.purple_status_get_type(status)
            if status_type != 0
                var status_type_primitive = _purple.purple_status_type_get_primitive(status_type)
                return (status_type_primitive == StatusTypePrimitive.OFFLINE) or (status_type_primitive == StatusTypePrimitive.INVISIBLE)
            return true
            
        def private has_attribute(status: int, attribute: string): bool raises IOError
            var status_type = _purple.purple_status_get_type(status)
            if status_type != 0
                var attribute_ids = _purple.purple_status_type_get_attrs(status_type)
                if attribute_ids is not null
                    for var attribute_id in attribute_ids
                        var the_attribute = _purple.purple_status_attr_get_id(attribute_id)
                        if the_attribute == attribute
                            return true
            return false

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.purple")
    
    enum StatusTypePrimitive
        NONE = 0
        OFFLINE = 1
        AVAILABLE = 2
        UNAVAILABLE = 3
        INVISIBLE = 4
        AWAY = 5
        EXTENDED_AWAY = 6
        MOBILE = 7
        TUNE = 8

    [DBus(name="im.pidgin.purple.PurpleService")]
    interface PurpleObject: Object
        def abstract purple_accounts_get_all_active(): array of int raises IOError
        
        // Account
        def abstract purple_account_get_protocol_name(account: int): string? raises IOError
        def abstract purple_account_get_username(account: int): string? raises IOError
        def abstract purple_account_get_active_status(account: int): int raises IOError
        def abstract purple_account_get_presence(account: int): int raises IOError
        
        // Presence
        def abstract purple_presence_get_status(presence: int, status_type_id: string): int raises IOError
        
        // Status
        def abstract purple_status_get_type(status: int): int raises IOError
        def abstract purple_status_attr_get_id(attribute_id: int): string? raises IOError
        def abstract purple_status_set_attr_string(status: int, attribute: string, value: string) raises IOError
        def abstract purple_status_set_active(status: int, active: int) raises IOError
        //def abstract purple_status_set_active_with_attrs_list(status: int, active: int, attributes: HashTable of string, string) raises IOError
        
        // Saved Status
        def abstract purple_savedstatus_get_current(): int raises IOError
        def abstract purple_savedstatus_get_substatus(saved_status: int, account: int): int raises IOError
        def abstract purple_savedstatus_get_message(saved_status: int): string? raises IOError

        // Saved Sub-status
        def abstract purple_savedstatus_substatus_get_message(saved_sub_status: int): string? raises IOError

        // Status Type
        def abstract purple_status_type_get_attrs(status_type: int): array of int raises IOError
        def abstract purple_status_type_get_primitive(status_type: int): StatusTypePrimitive raises IOError
        def abstract purple_primitive_get_id_from_type(status_type_primitive: StatusTypePrimitive): string? raises IOError
