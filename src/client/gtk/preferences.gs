[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class Preferences: Window
        construct(instance: Instance)
            _instance = instance

            unrealize.connect(on_unrealized)
            
            var template = _instance.get_resource("khovsgold.desktop")
            _autostart = new Autostart("khovsgold", template.query_exists() ? template : null)
            
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
            _autostart_with_session = new RadioButton.with_label_from_widget(with_client, "Start my Khövsgöl server when I login to the computer")
            ((Label) _autostart_with_session.get_child()).wrap = true
            _autostart_with_session.active = autostarts_with_session()
            _autostart_with_session.clicked.connect(on_autostart_with_session)
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
            server_box.pack_start(_autostart_with_session, false)
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
            var activate_playlist = new RadioButton.with_label(null, "Playlist")
            ((Label) activate_playlist.get_child()).wrap = true
            var activate_library = new RadioButton.with_label_from_widget(activate_playlist, "Library")
            ((Label) activate_library.get_child()).wrap = true
            set_boolean_configuration(activate_library, _instance.configuration, "focus_on_library")
            keyboard_focus_label.mnemonic_widget = activate_playlist

            var ui_box = new Box(Orientation.VERTICAL, 10)
            ui_box.pack_start(about_label, false)
            ui_box.pack_start(new Separator(Orientation.HORIZONTAL), false)
            ui_box.pack_start(show_duration, false)
            ui_box.pack_start(subdue_lossy, false)
            ui_box.pack_start(expand_on_click, false)
            ui_box.pack_start(keyboard_focus_label, false)
            ui_box.pack_start(activate_playlist, false)
            ui_box.pack_start(activate_library, false)

            var ui_page = new Alignment(0, 0, 1, 1)
            ui_page.set_padding(10, 10, 10, 10)
            ui_page.add(ui_box)
            
            // Scrobbling

            about_label = new Label("Note that the Khövsgöl user interface must be running for scrobbling to happen.")
            about_label.set_alignment(0, 0)
            about_label.wrap = true

            var scrobbling_autostart = new CheckButton.with_mnemonic("S_tart scrobbling when I start Khövsgöl")
            ((Label) scrobbling_autostart.get_child()).wrap = true
            set_boolean_configuration(scrobbling_autostart, _instance.configuration, "scrobbling_autostart")
            
            var service = _instance.configuration.scrobbling_service

            var service_label = new Label.with_mnemonic("Scrobbling ser_vice:")
            service_label.set_alignment(0, 0)
            var last_fm = new RadioButton.with_label(null, "Last.fm")
            ((Label) last_fm.get_child()).wrap = true
            if service == "last.fm"
                last_fm.active = true
            last_fm.clicked.connect(on_last_fm)
            var libre_fm = new RadioButton.with_label_from_widget(last_fm, "Libre.fm")
            ((Label) libre_fm.get_child()).wrap = true
            if service == "libre.fm"
                libre_fm.active = true
            libre_fm.clicked.connect(on_libre_fm)

            _scrobbling_username = new EntryBox("User_name")
            if _instance.configuration.scrobbling_username is not null
                _scrobbling_username.entry.text = _instance.configuration.scrobbling_username
            _scrobbling_password = new EntryBox("_Password")
            _scrobbling_password.entry.visibility = false
            if _instance.configuration.scrobbling_password is not null
                _scrobbling_password.entry.text = _instance.configuration.scrobbling_password
            
            _scrobbling_start = new Button.with_mnemonic("St_art scrobbling now")
            _scrobbling_start.clicked.connect(on_scrobbling_start)
            _scrobbling_stop = new Button.with_mnemonic("Sto_p scrobbling now")
            _scrobbling_stop.clicked.connect(on_scrobbling_stop)
            _scrobbling_start.sensitive = false
            _scrobbling_stop.sensitive = false

            var scrobbling_box = new Box(Orientation.VERTICAL, 10)
            scrobbling_box.pack_start(about_label, false)
            scrobbling_box.pack_start(new Separator(Orientation.HORIZONTAL), false)
            scrobbling_box.pack_start(scrobbling_autostart, false)
            scrobbling_box.pack_start(service_label, false)
            scrobbling_box.pack_start(last_fm, false)
            scrobbling_box.pack_start(libre_fm, false)
            scrobbling_box.pack_start(_scrobbling_username, false)
            scrobbling_box.pack_start(_scrobbling_password, false)
            scrobbling_box.pack_start(_scrobbling_start, false)
            scrobbling_box.pack_start(_scrobbling_stop, false)

            var scrobbling_page = new Alignment(0, 0, 1, 1)
            scrobbling_page.set_padding(10, 10, 10, 10)
            scrobbling_page.add(scrobbling_box)

            // Assemble

            var main_box = new Notebook()
            var label = new Label.with_mnemonic("_Server")
            main_box.append_page(server_page, label)
            label = new Label.with_mnemonic("User _interface")
            main_box.append_page(ui_page, label)
            label = new Label.with_mnemonic("Scro_bbling")
            main_box.append_page(scrobbling_page, label)

            add(main_box)

            title = "Preferences"
            border_width = 10
            set_position(WindowPosition.CENTER_ON_PARENT)
            set_default_size(500, 400)
            transient_for = _instance.window
            destroy_with_parent = true

            key_press_event.connect(on_key_pressed)

            update()
            _update_id = Timeout.add_seconds(1, update)

        def private on_unrealized()
            Source.remove(_update_id)
            save()

        def private save()
            var username = _scrobbling_username.entry.text
            var password = _scrobbling_password.entry.text
            if (username != _instance.configuration.scrobbling_username) or (password != _instance.configuration.scrobbling_password)
                _instance.configuration.scrobbling_username = username
                _instance.configuration.scrobbling_password = password
                _instance.configuration.save()

        def private on_key_pressed(e: Gdk.EventKey): bool
            var keyval = e.keyval
            if keyval == Gdk.Key.Escape
                destroy()
                return true
            else
                return false

        def private on_scrobbling_start()
            var plugin = _instance.get_plugin("scrobbling")
            if plugin is not null
                _scrobbling_start.sensitive = false
                save()
                plugin.start()
        
        def private on_scrobbling_stop()
            var plugin = _instance.get_plugin("scrobbling")
            if plugin is not null
                plugin.stop()
        
        _update_id: uint
        def private update(): bool
            var plugin = _instance.get_plugin("scrobbling")
            if plugin is not null
                var state = plugin.state
                _scrobbling_start.sensitive = state == PluginState.STOPPED
                _scrobbling_stop.sensitive = state == PluginState.STARTED
            else
                _scrobbling_start.sensitive = false
                _scrobbling_start.sensitive = false
            return true
        
        def on_last_fm()
            _instance.configuration.scrobbling_service = "last.fm"
            _instance.configuration.save()

        def on_libre_fm()
            _instance.configuration.scrobbling_service = "libre.fm"
            _instance.configuration.save()
        
        def autostarts_with_session(): bool
            try
                return _autostart.is_active()
            except e: GLib.Error
                _logger.exception(e)
            return false
        
        def private on_autostart_with_session()
            if _autostart_with_session.active
                var exec = _instance.dir.get_child("khovsgold")
                if exec.query_exists()
                    try
                        _autostart.set_active(true, "%s --start".printf(exec.get_path()))
                    except e: GLib.Error
                        _logger.exception(e)
            else
                try
                    _autostart.set_active(false)
                except e: GLib.Error
                    _logger.exception(e)
        
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
        _autostart: Autostart
        _autostart_with_session: RadioButton
        _scrobbling_username: EntryBox
        _scrobbling_password: EntryBox
        _scrobbling_start: Button
        _scrobbling_stop: Button
        
        class private SensitivityDependsOn: Object
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

        class private SetBooleanConfiguration: Object
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
