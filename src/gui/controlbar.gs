[indent=4]

uses
    Gtk
    Khovsgol

namespace Khovsgol.GUI

    class ControlBar: Toolbar
        construct(instance: Instance)
            _instance = instance
            _accel_group = new AccelGroup()

            unrealize.connect(on_unrealize)
            
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
            
            var info_label = new Label("")
            var info_label_alignment = new Alignment(0, 0, 1, 1)
            info_label_alignment.set_padding(0, 0, 5, 5)
            info_label_alignment.add(info_label)
            var info_label_item = new ToolItem()
            info_label_item.add(info_label_alignment)
        
            var previous = new ControlToolButton(Stock.MEDIA_PREVIOUS, Gdk.Key.@1, "Go to previous track\n<Alt>1", _accel_group)
            previous.clicked.connect(on_previous)

            var play = new ControlToolButton(Stock.MEDIA_PLAY, Gdk.Key.@2, "Play this track\n<Alt>2", _accel_group)
            play.clicked.connect(on_play)

            var toggle_pause = new ControlToggleToolButton(Stock.MEDIA_PAUSE, Gdk.Key.@3, "Pause or unpause playing\n<Alt>3", _accel_group)
            toggle_pause.clicked.connect(on_toggle_pause)
            
            var stop = new ControlToolButton(Stock.MEDIA_STOP, Gdk.Key.@4, "Stop playing\n<Alt>4", _accel_group)
            stop.clicked.connect(on_stop)

            var next = new ControlToolButton(Stock.MEDIA_NEXT, Gdk.Key.@5, "Go to next track\n<Alt>5", _accel_group)
            next.clicked.connect(on_next)

            //var volume = new Label("100%")
            var volume_button = new VolumeButton()
            volume_button.value = 100
            var volume_item = new ToolItem()
            volume_item.add(volume_button)

            var progress = new ProgressBar()
            progress.show_text = true
            var progress_box = new EventBox()
            progress_box.add(progress)
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
            add(toggle_pause)
            add(stop)
            add(next)
            add(volume_item)
            add(progress_item)
            add(visualization)
            
        prop readonly accel_group: AccelGroup
            
        def private on_unrealize()
            pass
            
        def private on_quit()
            _instance.stop()
        
        def private on_preferences()
            pass

        def private on_manage_servers()
            pass

        def private on_manage_players()
            pass

        def private on_manage_libraries()
            pass

        def private on_manage_receiver()
            pass

        def private on_previous()
            pass
            
        def private on_play()
            pass
            
        def private on_toggle_pause()
            pass
            
        def private on_stop()
            pass
            
        def private on_next()
            pass
        
        def private on_progress_clicked(event: Gdk.EventButton): bool
            return false
            
        def private on_progress_scrolled(event: Gdk.EventScroll): bool
            if (event.direction == Gdk.ScrollDirection.LEFT) || (event.direction == Gdk.ScrollDirection.DOWN)
                print "left"
            else if (event.direction == Gdk.ScrollDirection.RIGHT) || (event.direction == Gdk.ScrollDirection.UP)
                print "right"
            return false
            
        def private on_visualization()
            pass

        _instance: Instance
