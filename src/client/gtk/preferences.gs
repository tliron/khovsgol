[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class Preferences: Window
        construct(instance: Instance)
            _instance = instance
            
            // Server
            
            var about_label = new Label("The program that you are using right now is just a user interface, a \"client.\" The music libraries and music players are actually running in a \"server,\" a separate program that runs in the background.\n\nBy default Khövsgöl connects to your own server, running on your computer. But you can easily connect to other servers on your network, to play music from and browse their libraries.\n\nYou can configure your own server here, and even disable it entirely so that you run only as a client for other servers in the network.")
            about_label.set_alignment(0, 0)
            about_label.wrap = true

            var my_server_label = new Label.with_mnemonic("A_uto-start my Khövsgöl server:")
            my_server_label.set_alignment(0, 0)
            var with_client = new RadioButton.with_label(null, "Start my Khövsgöl server when I start Khövsgöl")
            set_boolean_configuration(with_client, _instance.configuration, "server_autostart")
            ((Label) with_client.get_child()).wrap = true
            var stop_with_client = new CheckButton.with_mnemonic("St_op my Khövsgöl server when I quit Khövsgöl")
            ((Label) stop_with_client.get_child()).wrap = true
            set_boolean_configuration(stop_with_client, _instance.configuration, "server_autostop")
            sensitivity_depends_on(stop_with_client, with_client)
            var stop_with_client_alignment = new Alignment(0, 0, 1, 1)
            stop_with_client_alignment.set_padding(0, 0, 20, 0)
            stop_with_client_alignment.add(stop_with_client)
            var with_session = new RadioButton.with_label_from_widget(with_client, "Start my Khövsgöl server when I login to the computer")
            ((Label) with_session.get_child()).wrap = true
            with_session.sensitive = false // TODO
            var disable_auto = new RadioButton.with_label_from_widget(with_client, "Don\'t auto-start my Khövsgöl server")
            ((Label) disable_auto.get_child()).wrap = true
            set_boolean_configuration(disable_auto, _instance.configuration, "server_autostart", true)
            my_server_label.mnemonic_widget = with_client

            var advertise = new CheckButton.with_mnemonic("A_dvertise my Khövsgöl server in the local network (when it's on)")
            ((Label) advertise.get_child()).wrap = true
            set_boolean_configuration(advertise, _instance.server_configuration, "advertise")

            var server_box = new Box(Orientation.VERTICAL, 10)
            server_box.pack_start(about_label, false)
            server_box.pack_start(new Separator(Orientation.HORIZONTAL), false)
            server_box.pack_start(my_server_label, false)
            server_box.pack_start(with_client, false)
            server_box.pack_start(stop_with_client_alignment, false)
            server_box.pack_start(with_session, false)
            server_box.pack_start(disable_auto, false)
            server_box.pack_start(advertise, false)

            var server_page = new Alignment(0, 0, 1, 1)
            server_page.set_padding(10, 10, 10, 10)
            server_page.add(server_box)

            // UI tweaks

            about_label = new Label("Khövsgöl aims to be easy to use, but we all have our preferences. You can tweak the user interface here.")
            about_label.set_alignment(0, 0)
            about_label.wrap = true

            var show_duration = new CheckButton.with_mnemonic("Show track _durations")
            ((Label) show_duration.get_child()).wrap = true
            set_boolean_configuration(show_duration, _instance.configuration, "show_duration")

            var subdue_lossy = new CheckButton.with_mnemonic("Show tracks and albums with _lossy compression in subdued colors")
            ((Label) subdue_lossy.get_child()).wrap = true
            set_boolean_configuration(subdue_lossy, _instance.configuration, "subdue_lossy")

            var expand_on_click = new CheckButton.with_mnemonic("Expand items in the library browser when you _click them")
            ((Label) expand_on_click.get_child()).wrap = true
            set_boolean_configuration(expand_on_click, _instance.configuration, "expand_on_click")

            var keyboard_focus_label = new Label.with_mnemonic("Initial _keyboard focus when Khövsgöl is started:")
            keyboard_focus_label.set_alignment(0, 0)
            var activate_play_list = new RadioButton.with_label(null, "Playlist")
            ((Label) activate_play_list.get_child()).wrap = true
            var activate_library = new RadioButton.with_label_from_widget(activate_play_list, "Library")
            ((Label) activate_library.get_child()).wrap = true
            set_boolean_configuration(activate_library, _instance.configuration, "focus_on_library")
            keyboard_focus_label.mnemonic_widget = activate_play_list

            var ui_box = new Box(Orientation.VERTICAL, 10)
            ui_box.pack_start(about_label, false)
            ui_box.pack_start(new Separator(Orientation.HORIZONTAL), false)
            ui_box.pack_start(show_duration, false)
            ui_box.pack_start(subdue_lossy, false)
            ui_box.pack_start(expand_on_click, false)
            ui_box.pack_start(keyboard_focus_label, false)
            ui_box.pack_start(activate_play_list, false)
            ui_box.pack_start(activate_library, false)

            var ui_page = new Alignment(0, 0, 1, 1)
            ui_page.set_padding(10, 10, 10, 10)
            ui_page.add(ui_box)

            // Assemble

            var main_box = new Notebook()
            var label = new Label.with_mnemonic("_Server")
            main_box.append_page(server_page, label)
            label = new Label.with_mnemonic("User _interface")
            main_box.append_page(ui_page, label)

            add(main_box)

            title = "Preferences"
            border_width = 10
            set_position(WindowPosition.CENTER_ON_PARENT)
            set_default_size(500, 400)
            transient_for = _instance.window
            destroy_with_parent = true

            key_press_event.connect(on_key_pressed)

        def private on_key_pressed(e: Gdk.EventKey): bool
            var keyval = e.keyval
            if keyval == Gdk.Key.Escape
                destroy()
                return true
            else
                return false
        
        def private set_boolean_configuration(button: CheckButton, configuration: Khovsgol.Configuration, property: string, reverse: bool = false)
            var value = Value(typeof(bool))
            configuration.get_property(property, ref value)
            var bool_value = (bool) value
            if reverse
                bool_value = not bool_value
            button.active = bool_value
            _ownerships.add(new SetBooleanConfiguration(button, configuration, property, reverse))
        
        def private sensitivity_depends_on(button: CheckButton, depends: CheckButton)
            _ownerships.add(new SensitivityDependsOn(button, depends))
        
        _instance: Instance
        _ownerships: list of Object = new list of Object
        
        class SensitivityDependsOn: Object
            construct(button: CheckButton, depends: CheckButton)
                _button = button
                _depends = depends
                _depends.clicked.connect(on_clicked)

            def private on_clicked()
                var active = _depends.active
                _button.sensitive = active
                _button.active = active

            _button: CheckButton
            _depends: CheckButton

        class SetBooleanConfiguration: Object
            construct(button: CheckButton, configuration: Khovsgol.Configuration, property: string, reverse: bool)
                _button = button
                _configuration = configuration
                _property = property
                _reverse = reverse
                button.clicked.connect(on_clicked)
                
            def private on_clicked()
                var active = _button.active
                if _reverse
                    active = not active
                _logger.messagef("Set property: %s = %s", _property, active ? "true" : "false")
                //print "Set property: %s = %s", _property, active ? "true" : "false"
                var value = Value(typeof(bool))
                _configuration.get_property(_property, ref value)
                if active != (bool) value
                    _configuration.set_property(_property, active)
                    _configuration.save()
            
            _button: CheckButton
            _configuration: Khovsgol.Configuration
            _property: string
            _reverse: bool

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.preferences")
