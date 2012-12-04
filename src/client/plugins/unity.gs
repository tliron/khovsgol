[indent=4]

// See: https://wiki.ubuntu.com/Unity/LauncherAPI

uses
    Unity
    Dbusmenu

namespace Khovsgol.Client.Plugins

    /*
     * Unity plugin.
     * 
     * Adds a quicklist menu to the Launcher entry and a progress bar
     * while a track is playing.
     * 
     * Adds a "/com/canonical/unity/launcherentry/<num>" DBus object to
     * our bus.
     */
    class UnityPlugin: Object implements Plugin
        prop instance: Instance
        
        def start()
            if _launcher_entry is null
                _launcher_entry = LauncherEntry.get_for_desktop_id("khovsgol.desktop")
                if _launcher_entry is not null
                    _launcher_entry.quicklist = create_menu()
                    _instance.api.position_in_track_change.connect(on_position_in_track_changed)
                    _logger.message("Started")
                else
                    _logger.warning("Could not connect to Launcher")
        
        def stop()
            if _launcher_entry is not null
                _instance.api.position_in_track_change.disconnect(on_position_in_track_changed)
                _launcher_entry = null
                _logger.message("Stopped")
        
        _launcher_entry: Unity.LauncherEntry?

        def private on_position_in_track_changed(position_in_track: double, old_position_in_track: double, track_duration: double)
            if _launcher_entry is not null
                if (position_in_track != double.MIN) && (track_duration != double.MIN)
                    _launcher_entry.progress = position_in_track / track_duration
                    _launcher_entry.progress_visible = true
                else
                    _launcher_entry.progress_visible = false
        
        def private on_pause()
            _instance.api.set_play_mode(_instance.player, "toggle_paused")

        def private on_play()
            _instance.api.set_play_mode(_instance.player, "playing")

        def private on_stop()
            _instance.api.set_play_mode(_instance.player, "stopped")
        
        def private on_previous()
            _instance.api.set_position_in_play_list_string(_instance.player, "prev")

        def private on_next()
            _instance.api.set_position_in_play_list_string(_instance.player, "next")
        
        def private create_menu(): Menuitem
            var pause_item = new Menuitem()
            pause_item.property_set(MENUITEM_PROP_LABEL, "Pause/Unpause")
            pause_item.item_activated.connect(on_pause)

            var play_item = new Menuitem()
            play_item.property_set(MENUITEM_PROP_LABEL, "Play")
            play_item.item_activated.connect(on_play)

            var stop_item = new Menuitem()
            stop_item.property_set(MENUITEM_PROP_LABEL, "Stop")
            stop_item.item_activated.connect(on_stop)

            var previous_item = new Menuitem()
            previous_item.property_set(MENUITEM_PROP_LABEL, "Previous")
            previous_item.item_activated.connect(on_previous)

            var next_item = new Menuitem()
            next_item.property_set(MENUITEM_PROP_LABEL, "Next")
            next_item.item_activated.connect(on_next)
            
            var menu = new Menuitem()
            menu.child_append(pause_item)
            menu.child_append(play_item)
            menu.child_append(stop_item)
            menu.child_append(previous_item)
            menu.child_append(next_item)
            return menu

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.unity")
