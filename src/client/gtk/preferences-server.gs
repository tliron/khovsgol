[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class ServerPage: PreferencesPage
        construct(instance: Instance, feature: Feature)
            _instance = instance
        
            _autostart = new Autostart("khovsgold", _instance.get_resource("khovsgold.desktop"))

            var about = new Label("The program that you are using right now is just a user interface, a \"client.\" The music libraries and music players are actually running in a \"server,\" a separate program that runs in the background.\n\nBy default Khövsgöl connects to your own server, running on your computer. But you can easily connect to other servers in your network, to play music from and browse their libraries.\n\nYou can configure your own server here, and even disable it entirely so that you run only as a client for other servers in your network.")
            about.set_alignment(0, 0)
            about.use_markup = true
            about.wrap = true

            var active = new FeatureButton(_instance, feature, "My Khövsgöl server currently _on")

            var auto_label = new Label.with_mnemonic("A_uto-start my Khövsgöl server:")
            auto_label.set_alignment(0, 0)
            var with_client = new ConnectedRadioButton("Start my server when I start Khövsgöl", null, _instance.configuration, "server", "autostart")
            var stop_with_client = new ConnectedCheckButton("St_op my server when I quit Khövsgöl", with_client, _instance.configuration, "server", "autostop")
            var stop_with_client_alignment = new Alignment(0, 0, 1, 1)
            stop_with_client_alignment.set_padding(0, 0, 20, 0)
            stop_with_client_alignment.add(stop_with_client)
            _autostart_with_session = new WrappedRadioButton("Start my server when I login to the computer", with_client)
            _autostart_with_session.active = autostarts_with_session()
            _autostart_with_session.clicked.connect(on_autostart_with_session)
            var disable_auto = new ConnectedRadioButton("Don\'t auto-start my server", with_client, _instance.configuration, "server", "autostart", true)
            auto_label.mnemonic_widget = with_client

            var advertise = new ConnectedCheckButton("A_dvertise my server in the local network (when it's on)", null, _instance.server_configuration, null, "advertise")

            var box = new Box(Orientation.VERTICAL, 10)
            box.pack_start(about, false)
            box.pack_start(new Separator(Orientation.HORIZONTAL), false)
            box.pack_start(active, false)
            box.pack_start(auto_label, false)
            box.pack_start(with_client, false)
            box.pack_start(stop_with_client_alignment, false)
            box.pack_start(_autostart_with_session, false)
            box.pack_start(disable_auto, false)
            box.pack_start(advertise, false)

            set_padding(10, 10, 10, 10)
            add(box)

        def private autostarts_with_session(): bool
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

        _instance: Instance
        _autostart: Autostart
        _autostart_with_session: RadioButton
