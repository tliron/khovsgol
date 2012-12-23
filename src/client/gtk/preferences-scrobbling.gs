[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class ScrobblingPage: PreferencesPage
        construct(instance: Instance)
            _instance = instance

            unrealize.connect(on_unrealized)

            var about = new Label("Note that the Khövsgöl user interface must be running for scrobbling to happen.")
            about.set_alignment(0, 0)
            about.wrap = true
            
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
            service_label.mnemonic_widget = last_fm

            _username = new EntryBox("User_name")
            if _instance.configuration.scrobbling_username is not null
                _username.entry.text = _instance.configuration.scrobbling_username
            _password = new EntryBox("_Password")
            _password.entry.visibility = false
            if _instance.configuration.scrobbling_password is not null
                _password.entry.text = _instance.configuration.scrobbling_password
            
            _start = new Button.with_mnemonic("Tu_rn on scrobbling")
            _start.sensitive = false
            _start.clicked.connect(on_start)
            _stop = new Button.with_mnemonic("Turn o_ff scrobbling")
            _stop.sensitive = false
            _stop.clicked.connect(on_stop)

            var box = new Box(Orientation.VERTICAL, 10)
            box.pack_start(about, false)
            box.pack_start(new Separator(Orientation.HORIZONTAL), false)
            box.pack_start(service_label, false)
            box.pack_start(last_fm, false)
            box.pack_start(libre_fm, false)
            box.pack_start(_username, false)
            box.pack_start(_password, false)
            box.pack_start(_start, false)
            box.pack_start(_stop, false)

            set_padding(10, 10, 10, 10)
            add(box)

            update()
            _update_id = Timeout.add_seconds(1, update)

        def private on_unrealized()
            Source.remove(_update_id)
            save(_instance.configuration.is_feature_active("scrobbling"))

        def private on_last_fm()
            _instance.configuration.scrobbling_service = "last.fm"
            _instance.configuration.save()

        def private on_libre_fm()
            _instance.configuration.scrobbling_service = "libre.fm"
            _instance.configuration.save()

        def private on_start()
            var feature = _instance.get_feature("scrobbling")
            if feature is not null
                _start.sensitive = false
                save(true)
                feature.start()
        
        def private on_stop()
            var feature = _instance.get_feature("scrobbling")
            if feature is not null
                save(false)
                feature.stop()
        
        def private save(active: bool)
            var username = _username.entry.text
            var password = _password.entry.text
            if (username != _instance.configuration.scrobbling_username) or (password != _instance.configuration.scrobbling_password) or (active != _instance.configuration.is_feature_active("scrobbling"))
                _instance.configuration.scrobbling_username = username
                _instance.configuration.scrobbling_password = password
                _instance.configuration.set_feature_active("scrobbling", active)
                _instance.configuration.save()

        _update_id: uint
        def private update(): bool
            var feature = _instance.get_feature("scrobbling")
            if feature is not null
                var state = feature.state
                _start.sensitive = state == FeatureState.STOPPED
                _stop.sensitive = state == FeatureState.STARTED
            else
                _start.sensitive = false
                _start.sensitive = false
            return true

        _instance: Instance
        _username: EntryBox
        _password: EntryBox
        _start: Button
        _stop: Button
