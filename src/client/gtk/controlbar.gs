[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class ControlBar: Toolbar
        construct(instance: Instance)
            _instance = instance
            _accel_group = new AccelGroup()

            unrealize.connect(on_unrealized)
            
            var quit = new ControlToolButton(Stock.QUIT, Gdk.Key.Q, "Quit\n<Alt>Q", _accel_group) 
            quit.clicked.connect(on_quit)

            var preferences = new ControlToolButton(Stock.PREFERENCES, Gdk.Key.P, "Preferences\n<Alt>P", _accel_group)
            preferences.clicked.connect(on_preferences)
            
            var manage_servers = new ControlToolButton(Stock.NETWORK, Gdk.Key.M, "Manage servers\n<Alt>M", _accel_group)
            manage_servers.clicked.connect(on_manage_servers)

            var manage_players = new ControlToolButton(Stock.DISCONNECT, Gdk.Key.N, "Manage players\n<Alt>N", _accel_group)
            manage_players.clicked.connect(on_manage_players)

            var manage_libraries = new ControlToolButton(Stock.CDROM, Gdk.Key.L, "Manage libraries\n<Alt>L", _accel_group)
            manage_libraries.clicked.connect(on_manage_libraries)

            var manage_receiver = new ControlToolButton(Stock.JUMP_TO, Gdk.Key.R, "Manage receiver\n<Alt>R", _accel_group)
            manage_receiver.clicked.connect(on_manage_receiver)
            
            _info = new Label("<b>Not connected</b>")
            _info.use_markup = true
            var info_label_alignment = new Alignment(0, 0, 1, 1)
            info_label_alignment.set_padding(0, 0, 5, 5)
            info_label_alignment.add(_info)
            var info_label_item = new ToolItem()
            info_label_item.add(info_label_alignment)
        
            var previous = new ControlToolButton(Stock.MEDIA_PREVIOUS, Gdk.Key.@1, "Go to previous track\n<Alt>1", _accel_group)
            previous.clicked.connect(on_previous)

            var play = new ControlToolButton(Stock.MEDIA_PLAY, Gdk.Key.@2, "Play this track\n<Alt>2", _accel_group)
            play.clicked.connect(on_play)

            _toggle_pause = new ControlToggleToolButton(Stock.MEDIA_PAUSE, Gdk.Key.@3, "Pause or unpause playing\n<Alt>3", _accel_group)
            _on_toggle_pause_id = _toggle_pause.clicked.connect(on_toggle_pause)
            
            var stop = new ControlToolButton(Stock.MEDIA_STOP, Gdk.Key.@4, "Stop playing\n<Alt>4", _accel_group)
            stop.clicked.connect(on_stop)

            var next = new ControlToolButton(Stock.MEDIA_NEXT, Gdk.Key.@5, "Go to next track\n<Alt>5", _accel_group)
            next.clicked.connect(on_next)

            //var volume = new Label("100%")
            var volume_button = new VolumeButton()
            volume_button.value = 100
            var volume_item = new ToolItem()
            volume_item.add(volume_button)

            _progress = new ProgressBar()
            _progress.show_text = true
            var progress_box = new EventBox()
            progress_box.add(_progress)
            progress_box.button_press_event.connect(on_progress_clicked)
            progress_box.scroll_event.connect(on_progress_scrolled)
            var progress_alignment = new Alignment(0, 0, 1, 1)
            progress_alignment.set_padding(0, 0, 5, 5)
            progress_alignment.add(progress_box)
            var progress_item = new ToolItem()
            //progress_item.set_expand(true)
            progress_item.add(progress_alignment)
        
            var visualization = new ControlToggleToolButton(Stock.SELECT_COLOR, Gdk.Key.V, "Open or close visualization\n<Alt>V", _accel_group)
            visualization.clicked.connect(on_visualization)
    
            var separator = new ToolItem()
            separator.set_expand(true)
        
            // Assemble
            hexpand = true
            vexpand = false
            icon_size = IconSize.MENU
            show_arrow = false
            add(quit)
            add(preferences)
            add(manage_servers)
            add(manage_players)
            add(manage_libraries)
            add(manage_receiver)
            add(info_label_item)
            add(separator)
            add(previous)
            add(play)
            add(_toggle_pause)
            add(stop)
            add(next)
            add(volume_item)
            add(progress_item)
            add(visualization)
            
            ((API) _instance.api).connection_change_gdk.connect(on_connection_changed)
            ((API) _instance.api).play_mode_change_gdk.connect(on_play_mode_changed)
            ((API) _instance.api).position_in_track_change_gdk.connect(on_position_in_track_changed)
            
        prop readonly accel_group: AccelGroup
            
        def private on_unrealized()
            ((API) _instance.api).connection_change_gdk.disconnect(on_connection_changed)
            ((API) _instance.api).play_mode_change_gdk.disconnect(on_play_mode_changed)
            ((API) _instance.api).position_in_track_change_gdk.disconnect(on_position_in_track_changed)
            
        def private on_quit()
            _instance.stop()
        
        def private on_preferences()
            pass

        def private on_manage_servers()
            new Servers(_instance).show_all()

        def private on_manage_players()
            pass

        def private on_manage_libraries()
            pass

        def private on_manage_receiver()
            pass

        def private on_previous()
            _instance.api.set_position_in_play_list_string(_instance.player, "prev")
            
        def private on_play()
            _instance.api.set_play_mode(_instance.player, "playing")
        
        _on_toggle_pause_id: ulong
        def private on_toggle_pause()
            _instance.api.set_play_mode(_instance.player, "toggle_paused")
            
        def private on_stop()
            _instance.api.set_play_mode(_instance.player, "stopped")
            
        def private on_next()
            _instance.api.set_position_in_play_list_string(_instance.player, "next")
        
        def private on_progress_clicked(e: Gdk.EventButton): bool
            var w = _progress.get_allocated_width()
            var ratio = (double) e.x / w
            _instance.api.set_ratio_in_track(_instance.player, ratio)
            return false
            
        def private on_progress_scrolled(e: Gdk.EventScroll): bool
            if _position_in_track != double.MIN
                var step = (_track_duration != double.MIN) ? _track_duration * 0.1 : 10.0
                position: double
                if (e.direction == Gdk.ScrollDirection.LEFT) || (e.direction == Gdk.ScrollDirection.DOWN)
                    position = _position_in_track - step
                else // if (e.direction == Gdk.ScrollDirection.RIGHT) || (e.direction == Gdk.ScrollDirection.UP)
                    position = _position_in_track + step
                if position < 0
                    position = 0
                else if (_track_duration != double.MIN) && (position > _track_duration)
                    position = _track_duration
                _instance.api.set_position_in_track(_instance.player, position)
            return false
            
        def private on_visualization()
            pass
            
        def private on_connection_changed(host: string?, port: uint, player: string?, old_host: string?, old_port: uint, old_player: string?)
            if (host is not null) && (player is not null)
                _info.label = "<b>%s@%s:%u</b>".printf(Markup.escape_text(player), Markup.escape_text(host), port)
            else
                _info.label = "<b>Not connected</b>"

        def private on_play_mode_changed(play_mode: string?, old_play_mode: string?)
            SignalHandler.block(_toggle_pause, _on_toggle_pause_id)
            _toggle_pause.active = (play_mode == "paused")
            SignalHandler.unblock(_toggle_pause, _on_toggle_pause_id)
 
        def private on_position_in_track_changed(position_in_track: double, old_position_in_track: double, track_duration: double)
            _position_in_track = position_in_track
            _track_duration = track_duration
            if (position_in_track != double.MIN) && (track_duration != double.MIN)
                _progress.fraction = position_in_track / track_duration
                _progress.text = "%s/%s".printf(format_duration(position_in_track), format_duration(track_duration))
            else
                _progress.fraction = 0.0
                _progress.text = ""

        _instance: Instance
        _info: Label
        _progress: ProgressBar
        _toggle_pause: ControlToggleToolButton
        _position_in_track: double = double.MIN
        _track_duration: double = double.MIN
