[indent=4]

uses
    Unity
    Dbusmenu

namespace Khovsgol.Client.Features

    /*
     * Unity feature.
     *
     * Adds a quicklist menu to the Launcher entry and a progress bar
     * while a track is playing.
     *
     * Adds a "/com/canonical/unity/launcherentry/<num>" DBus object to
     * our bus.
     *
     * See: https://wiki.ubuntu.com/Unity/LauncherAPI
     */
    class UnityFeature: Object implements Feature
        prop readonly name: string = "unity"
        prop readonly label: string = "Unity Launcher integration"
        prop readonly persistent: bool = true
        prop readonly state: FeatureState
            get
                return (FeatureState) AtomicInt.@get(ref _state)

        prop instance: Instance
        
        def start()
            if state == FeatureState.STOPPED
                set_state(FeatureState.STARTING)

                _launcher_entry = LauncherEntry.get_for_desktop_id("khovsgol.desktop")
                if _launcher_entry is not null
                    _launcher_entry.quicklist = create_menu()
                    _instance.api.position_in_track_change.connect(on_position_in_track_changed)
                    set_state(FeatureState.STARTED)
                else
                    _logger.warning("Could not connect to Launcher")
                    _launcher_entry = null
                    set_state(FeatureState.STOPPED)
        
        def stop()
            if state == FeatureState.STARTED
                set_state(FeatureState.STOPPING)
                _instance.api.position_in_track_change.disconnect(on_position_in_track_changed)
                _launcher_entry.progress_visible = false
                _launcher_entry.quicklist = null // doesn't actually clear quicklist...
                _launcher_entry = null
                set_state(FeatureState.STOPPED)
        
        _state: int = FeatureState.STOPPED
        _launcher_entry: Unity.LauncherEntry?
        
        def private set_state(state: FeatureState)
            AtomicInt.@set(ref _state, state)
            _logger.message(get_name_from_feature_state(state))
            state_change(state)

        def private on_position_in_track_changed(position_in_track: double, old_position_in_track: double, track_duration: double)
            if _launcher_entry is not null
                if (position_in_track != double.MIN) and (track_duration != double.MIN)
                    _launcher_entry.progress = position_in_track / track_duration
                    _launcher_entry.progress_visible = true
                else
                    _launcher_entry.progress_visible = false
        
        def private on_pause()
            _instance.api.set_play_mode("toggle_paused")

        def private on_play()
            _instance.api.set_play_mode("playing")

        def private on_stop()
            _instance.api.set_play_mode("stopped")
        
        def private on_previous()
            _instance.api.set_position_in_playlist_string("prev")

        def private on_next()
            _instance.api.set_position_in_playlist_string("next")
        
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
            _logger = Logging.get_logger("khovsgol.unity")
