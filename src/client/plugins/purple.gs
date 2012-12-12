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
        prop instance: Instance
        
        def start()
            if _purple is null
                try
                    _purple = Bus.get_proxy_sync(BusType.SESSION, "im.pidgin.purple.PurpleService", "/im/pidgin/purple/PurpleObject")
                    _tune_id = _purple.purple_primitive_get_id_from_type(StatusType.TUNE)
                    _instance.api.track_change.connect(on_track_changed)
                    _logger.message("Started")
                except e: IOError
                    _logger.exception(e)
        
        def stop()
            if _purple is not null
                _instance.api.track_change.disconnect(on_track_changed)
                
                // Return all accounts to their saved statuses
                try
                    var accounts = _purple.purple_accounts_get_all_active()
                    if accounts is not null
                        for var account in accounts
                            var protocol = _purple.purple_account_get_protocol_name(account)
                            var username = _purple.purple_account_get_username(account)
                            var status = _purple.purple_account_get_active_status(account)
                            
                            // Set the "message" attribute in the active status
                            if has_attribute(status, "message")
                                // Return to saved status
                                message: string? = null
                                var saved_status = _purple.purple_savedstatus_get_current()
                                if saved_status != 0
                                    var saved_sub_status = _purple.purple_savedstatus_get_substatus(saved_status, account)
                                    if saved_sub_status != 0
                                        // Saved sub-status
                                        message = _purple.purple_savedstatus_substatus_get_message(saved_sub_status)
                                        _logger.messagef("Setting account %s/%s status %d to saved sub-status: \"%s\"", protocol, username, status, message)
                                    else
                                        // Saved status
                                        message = _purple.purple_savedstatus_get_message(saved_sub_status)
                                        _logger.messagef("Setting account %s/%s status %d to saved status: \"%s\"", protocol, username, status, message)

                                if message is not null
                                    _purple.purple_status_set_attr_string(status, "message", message)
                                    _purple.purple_status_set_active(status, 1) // TODO: aren't we already active?
                except e: IOError
                    _logger.exception(e)
                    
                _purple = null
                _logger.message("Stopped")

        _purple: PurpleObject?
        _tune_id: string

        def private on_track_changed(track: Track?, old_track: Track?)
            if _purple is null
                return
        
            message: string? = null
            if track is not null
                message = "♪ %s by %s on %s".printf(track.title, track.artist, track.album)
        
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
                                _logger.messagef("Setting account %s/%s status %d to: \"%s\"", protocol, username, status, message)
                            else
                                // Return to saved status
                                var saved_status = _purple.purple_savedstatus_get_current()
                                if saved_status != 0
                                    var saved_sub_status = _purple.purple_savedstatus_get_substatus(saved_status, account)
                                    if saved_sub_status != 0
                                        // Saved sub-status
                                        message = _purple.purple_savedstatus_substatus_get_message(saved_sub_status)
                                        _logger.messagef("Setting account %s/%s status %d to saved sub-status: \"%s\"", protocol, username, status, message)
                                    else
                                        // Saved status
                                        message = _purple.purple_savedstatus_get_message(saved_sub_status)
                                        _logger.messagef("Setting account %s/%s status %d to saved status: \"%s\"", protocol, username, status, message)

                            if message is not null
                                _purple.purple_status_set_attr_string(status, "message", message)
                                _purple.purple_status_set_active(status, 1) // TODO: aren't we already active?
                    
                        // Some accounts support a special "tune" status in their presence
                        var presence = _purple.purple_account_get_presence(account)
                        if presence != 0
                            var tune_status = _purple.purple_presence_get_status(presence, _tune_id)
                            if tune_status != 0
                                // Set tune status
                                if track is not null
                                    _logger.messagef("Setting account %s/%s tune status %d", protocol, username, tune_status)
                                    _purple.purple_status_set_attr_string(tune_status, "tune_artist", track.artist)
                                    _purple.purple_status_set_attr_string(tune_status, "tune_title", track.title)
                                    _purple.purple_status_set_attr_string(tune_status, "tune_album", track.album)
                                    _purple.purple_status_set_attr_string(tune_status, "tune_year", track.date.to_string())
                                    _purple.purple_status_set_active(tune_status, 1)
                                else
                                    _logger.messagef("Resetting account %s/%s tune status %d", protocol, username, tune_status)
                                    _purple.purple_status_set_active(tune_status, 0)
                                    
                                    // It seems that we need to explicitly reset the fields
                                    _purple.purple_status_set_attr_string(tune_status, "tune_artist", "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_title", "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_album", "")
                                    _purple.purple_status_set_attr_string(tune_status, "tune_year", "")
            except e: IOError
                _logger.exception(e)
                
        def private is_offline_or_invisible(status: int): bool raises IOError
            var status_type = _purple.purple_status_get_type(status)
            if status_type != 0
                var primitive = _purple.purple_status_type_get_primitive(status_type)
                return (primitive == StatusType.OFFLINE) || (primitive == StatusType.INVISIBLE)
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
    
    enum private StatusType
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
    interface private PurpleObject: Object
        def abstract purple_accounts_get_all_active(): array of int raises IOError
        
        // Account
        def abstract purple_account_get_protocol_name(account: int): string raises IOError
        def abstract purple_account_get_username(account: int): string raises IOError
        def abstract purple_account_get_active_status(account: int): int raises IOError
        def abstract purple_account_get_presence(account: int): int raises IOError
        
        // Status
        def abstract purple_status_get_type(status: int): int raises IOError
        def abstract purple_status_set_active(status: int, active: int) raises IOError
        def abstract purple_status_set_attr_string(status: int, attribute: string, value: string) raises IOError
        def abstract purple_status_attr_get_id(attribute_id: int): string raises IOError

        // Status Type
        def abstract purple_status_type_get_attrs(status_type: int): array of int raises IOError
        def abstract purple_status_type_get_primitive(status_type: int): StatusType raises IOError
        
        // Saved Status
        def abstract purple_savedstatus_get_current(): int raises IOError
        def abstract purple_savedstatus_get_substatus(saved_status: int, account: int): int raises IOError
        def abstract purple_savedstatus_get_message(saved_status: int): string raises IOError

        // Saved Sub-status
        def abstract purple_savedstatus_substatus_get_message(saved_sub_status: int): string raises IOError
        
        // Presence
        def abstract purple_presence_get_status(presence: int, id: string): int raises IOError

        // Primitive
        def abstract purple_primitive_get_id_from_type(status_type: StatusType): string raises IOError
