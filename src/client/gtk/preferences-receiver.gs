[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class ReceiverPage: PreferencesPage
        construct(instance: Instance)
            _instance = instance
        
            _autostart = new Autostart("khovsgolr", _instance.get_resource("khovsgolr.desktop"))

            var about = new Label("Your receiver is used to listen to music from <i>other</i> servers in your network: you do <i>not</i> need it running if you are only listening to music locally.\n\nNote that the receiver can be running even if Khövsgöl isn't.")
            about.set_alignment(0, 0)
            about.wrap = true

            var auto_label = new Label.with_mnemonic("A_uto-start my Khövsgöl receiver:")
            auto_label.set_alignment(0, 0)
            var with_client = new ConnectedRadioButton("Start my receiver when I start Khövsgöl", null, _instance.configuration, "receiver", "autostart")
            var stop_with_client = new ConnectedCheckButton("St_op my receiver when I quit Khövsgöl", with_client, _instance.configuration, "receiver", "autostop")
            var stop_with_client_alignment = new Alignment(0, 0, 1, 1)
            stop_with_client_alignment.set_padding(0, 0, 20, 0)
            stop_with_client_alignment.add(stop_with_client)
            _autostart_with_session = new WrappedRadioButton("Start my receiver when I login to the computer", with_client)
            _autostart_with_session.active = autostarts_with_session()
            _autostart_with_session.clicked.connect(on_autostart_with_session)
            var disable_auto = new ConnectedRadioButton("Don\'t auto-start my receiver", with_client, _instance.configuration, "receiver", "autostart", true)
            auto_label.mnemonic_widget = with_client

            var box = new Box(Orientation.VERTICAL, 10)
            box.pack_start(about, false)
            box.pack_start(new Separator(Orientation.HORIZONTAL), false)
            box.pack_start(auto_label, false)
            box.pack_start(with_client, false)
            box.pack_start(stop_with_client_alignment, false)
            box.pack_start(_autostart_with_session, false)
            box.pack_start(disable_auto, false)

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
                var exec = _instance.dir.get_child("khovsgolr")
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
