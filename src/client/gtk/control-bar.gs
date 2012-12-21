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
            
            var manage_libraries = new ControlToolButton(Stock.CDROM, Gdk.Key.L, "Manage libraries\n<Alt>L", _accel_group)
            manage_libraries.clicked.connect(on_manage_libraries)

            var manage_receiver = new ControlToolButton(Stock.JUMP_TO, Gdk.Key.R, "Manage receiver\n<Alt>R", _accel_group)
            manage_receiver.clicked.connect(on_manage_receiver)

            var connect = new ControlToolButton(Stock.NETWORK, Gdk.Key.C, "Connector\n<Alt>C", _accel_group)
            connect.clicked.connect(on_connector)
            
            _info = new Label("<b>Not connected</b>")
            _info.use_markup = true
            _info.ellipsize = Pango.EllipsizeMode.END
            _info.set_alignment(0, 0.5f)
            var info_box = new EventBox()
            info_box.override_background_color(StateFlags.NORMAL, Gdk.RGBA()) // Allows the item to have no background
            info_box.add(_info)
            info_box.button_press_event.connect(on_info_clicked)
            var info_label_alignment = new Alignment(0, 0, 1, 1)
            info_label_alignment.set_padding(0, 0, 5, 5)
            info_label_alignment.add(info_box)
            var info_label_item = new ToolItem()
            info_label_item.set_expand(true)
            info_label_item.add(info_label_alignment)
        
            var previous = new ControlToolButton(Stock.MEDIA_PREVIOUS, Gdk.Key.@1, "Go to previous track\n<Alt>1", _accel_group)
            previous.clicked.connect(on_previous)

            var play = new ControlToolButton(Stock.MEDIA_PLAY, Gdk.Key.@2, "Play this track\n<Alt>2", _accel_group)
            play.clicked.connect(on_play)

            _toggle_pause = new ControlToggleToolButton(Stock.MEDIA_PAUSE, Gdk.Key.@3, "Pause or unpause playing\n<Alt>3", _accel_group)
            _on_pause_toggled_id = _toggle_pause.clicked.connect(on_pause_toggled)
            
            var stop = new ControlToolButton(Stock.MEDIA_STOP, Gdk.Key.@4, "Stop playing\n<Alt>4", _accel_group)
            stop.clicked.connect(on_stop)

            var next = new ControlToolButton(Stock.MEDIA_NEXT, Gdk.Key.@5, "Go to next track\n<Alt>5", _accel_group)
            next.clicked.connect(on_next)

            _volume_button = new VolumeButton()
            _volume_button.value = 100
            _on_volume_id = _volume_button.value_changed.connect(on_volume)
            var volume_item = new ToolItem()
            volume_item.add(_volume_button)

            _progress = new ProgressBar()
            _progress.show_text = true
            var progress_box = new EventBox()
            progress_box.override_background_color(StateFlags.NORMAL, Gdk.RGBA()) // Allows the item to have no background
            progress_box.add(_progress)
            progress_box.button_press_event.connect(on_progress_clicked)
            progress_box.scroll_event.connect(on_progress_scrolled)
            var progress_alignment = new Alignment(0, 0, 1, 1)
            progress_alignment.set_padding(0, 0, 5, 5)
            progress_alignment.add(progress_box)
            var progress_item = new ToolItem()
            progress_item.add(progress_alignment)
        
            _toggle_visualization = new ControlToggleToolButton(Stock.SELECT_COLOR, Gdk.Key.@V, "Open or close visualization\n<Alt>V", _accel_group)
            _on_toggle_visualization_id = _toggle_visualization.clicked.connect(_on_visualization_toggled)

            // Assemble
            hexpand = true
            icon_size = IconSize.MENU
            show_arrow = false
            add(quit)
            add(preferences)
            add(manage_libraries)
            add(manage_receiver)
            add(new SeparatorToolItem())
            add(connect)
            add(info_label_item)
            add(previous)
            add(play)
            add(_toggle_pause)
            add(stop)
            add(next)
            add(volume_item)
            add(progress_item)
            add(_toggle_visualization)
            
            var api = (API) _instance.api
            api.connection_change_gdk.connect(on_connection_changed)
            api.volume_change_gdk.connect(on_volume_changed)
            api.play_mode_change_gdk.connect(on_play_mode_changed)
            api.position_in_track_change_gdk.connect(on_position_in_track_changed)
            
        prop readonly accel_group: AccelGroup
            
        def private on_unrealized()
            var api = (API) _instance.api
            api.connection_change_gdk.disconnect(on_connection_changed)
            api.volume_change_gdk.disconnect(on_volume_changed)
            api.play_mode_change_gdk.disconnect(on_play_mode_changed)
            api.position_in_track_change_gdk.disconnect(on_position_in_track_changed)
            
        def private on_quit()
            _instance.stop()
        
        def private on_preferences()
            new Preferences(_instance).show_all()

        def private on_manage_libraries()
            new LibraryManager(_instance).show_all()

        def private on_manage_receiver()
            pass

        def private on_connector()
            new Connector(_instance).show_all()

        def private on_previous()
            _instance.api.set_position_in_playlist_string(_instance.player, "prev")
            
        def private on_play()
            _instance.api.set_play_mode(_instance.player, "playing")
        
        _on_pause_toggled_id: ulong
        def private on_pause_toggled()
            _instance.api.set_play_mode(_instance.player, "toggle_paused")
            
        def private on_stop()
            _instance.api.set_play_mode(_instance.player, "stopped")
            
        def private on_next()
            _instance.api.set_position_in_playlist_string(_instance.player, "next")

        def private on_info_clicked(e: Gdk.EventButton): bool
            on_connector()
            return true // returning false would cause window dragging
        
        def private on_progress_clicked(e: Gdk.EventButton): bool
            var w = _progress.get_allocated_width()
            var ratio = (double) e.x / w
            _instance.api.set_ratio_in_track(_instance.player, ratio)
            return true // returning false would cause window dragging
            
        def private on_progress_scrolled(e: Gdk.EventScroll): bool
            if _position_in_track != double.MIN
                var step = (_track_duration != double.MIN) ? _track_duration * 0.1 : 10.0
                position: double
                if (e.direction == Gdk.ScrollDirection.LEFT) or (e.direction == Gdk.ScrollDirection.DOWN)
                    position = _position_in_track - step
                else // if (e.direction == Gdk.ScrollDirection.RIGHT) or (e.direction == Gdk.ScrollDirection.UP)
                    position = _position_in_track + step
                if position < 0
                    position = 0
                else if (_track_duration != double.MIN) and (position > _track_duration)
                    position = _track_duration
                _instance.api.set_position_in_track(_instance.player, position)
            return false
        
        _on_volume_id: ulong
        def private on_volume(value: double)
            _instance.api.set_volume(_instance.player, value)
            
        _on_toggle_visualization_id: ulong
        def private _on_visualization_toggled()
            if _visualization_pid == 0
                try
                    Process.spawn_async(_instance.dir.get_path(), {"projectM-pulseaudio"}, null, SpawnFlags.SEARCH_PATH|SpawnFlags.STDOUT_TO_DEV_NULL|SpawnFlags.STDERR_TO_DEV_NULL|SpawnFlags.DO_NOT_REAP_CHILD, null, out _visualization_pid)
                    ChildWatch.add(_visualization_pid, on_visualization_died)
                    _logger.messagef("Spawned visualization, pid: %d", _visualization_pid)

                    SignalHandler.block(_toggle_visualization, _on_toggle_visualization_id)
                    _toggle_visualization.active = true
                    SignalHandler.unblock(_toggle_visualization, _on_toggle_visualization_id)
                except e: SpawnError
                    _logger.exception(e)
                    _visualization_pid = 0

                    SignalHandler.block(_toggle_visualization, _on_toggle_visualization_id)
                    _toggle_visualization.active = false
                    SignalHandler.unblock(_toggle_visualization, _on_toggle_visualization_id)
            else
                SignalHandler.block(_toggle_visualization, _on_toggle_visualization_id)
                _toggle_visualization.active = true
                SignalHandler.unblock(_toggle_visualization, _on_toggle_visualization_id)

                _logger.messagef("Killing visualization, pid: %d", _visualization_pid)
                Posix.kill(_visualization_pid, Posix.SIGKILL)
        
        def private on_visualization_died(pid: Pid, status: int)
            Process.close_pid(_visualization_pid) // Doesn't do anything on Unix
            _visualization_pid = 0

            // TODO: don't we have to be in the GDK thread?!
            SignalHandler.block(_toggle_visualization, _on_toggle_visualization_id)
            _toggle_visualization.active = false
            SignalHandler.unblock(_toggle_visualization, _on_toggle_visualization_id)
            
        def private on_connection_changed(host: string?, port: uint, player: string?, old_host: string?, old_port: uint, old_player: string?)
            if (host is not null) and (player is not null)
                _info.label = "<b>%s@%s:%u</b>".printf(Markup.escape_text(player), Markup.escape_text(host), port)
            else
                _info.label = "<b>Not connected</b>"

        def private on_volume_changed(volume: double, old_volume: double)
            SignalHandler.block(_volume_button, _on_volume_id)
            _volume_button.value = volume
            SignalHandler.unblock(_volume_button, _on_volume_id)
            
        def private on_play_mode_changed(play_mode: string?, old_play_mode: string?)
            SignalHandler.block(_toggle_pause, _on_pause_toggled_id)
            _toggle_pause.active = (play_mode == "paused")
            SignalHandler.unblock(_toggle_pause, _on_pause_toggled_id)
 
        def private on_position_in_track_changed(position_in_track: double, old_position_in_track: double, track_duration: double)
            _position_in_track = position_in_track
            _track_duration = track_duration
            if (position_in_track != double.MIN) and (track_duration != double.MIN)
                _progress.fraction = position_in_track / track_duration
                _progress.text = "%s/%s".printf(format_duration(position_in_track), format_duration(track_duration))
            else
                _progress.fraction = 0.0
                _progress.text = ""

        _instance: Instance
        _info: Label
        _progress: ProgressBar
        _toggle_pause: ControlToggleToolButton
        _toggle_visualization: ControlToggleToolButton
        _volume_button: VolumeButton
        _position_in_track: double = double.MIN
        _track_duration: double = double.MIN
        _visualization_pid: Pid = 0
