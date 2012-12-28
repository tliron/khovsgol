[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class ScrobblingPage: PreferencesPage
        construct(instance: Instance, feature: Feature)
            _instance = instance
            _feature = feature

            var about = new Label("Note that the Khövsgöl user interface must be running for scrobbling to happen.")
            about.set_alignment(0, 0)
            about.use_markup = true
            about.wrap = true
            
            var active = new FeatureButton(_instance, feature, "Currently _active")

            var service_label = new Label.with_mnemonic("Scrobbling ser_vice:")
            service_label.set_alignment(0, 0)
            var last_fm = new WrappedRadioButton("Last.fm")
            var service = _instance.configuration.get_feature_string("scrobbling", "service")
            if (service is null) or (service == "last.fm")
                last_fm.active = true
            last_fm.clicked.connect(on_last_fm)
            var libre_fm = new WrappedRadioButton("Libre.fm", last_fm)
            if service == "libre.fm"
                libre_fm.active = true
            libre_fm.clicked.connect(on_libre_fm)
            service_label.mnemonic_widget = last_fm

            _username = new ConnectedEntryBox("User_name", _instance.configuration, "scrobbling", "username")
            _password = new ConnectedEntryBox("_Password", _instance.configuration, "scrobbling", "password")
            _password.entry.visibility = false
            
            var box = new Box(Orientation.VERTICAL, 10)
            box.pack_start(about, false)
            box.pack_start(new Separator(Orientation.HORIZONTAL), false)
            box.pack_start(active, false)
            box.pack_start(service_label, false)
            box.pack_start(last_fm, false)
            box.pack_start(libre_fm, false)
            box.pack_start(_username, false)
            box.pack_start(_password, false)

            set_padding(10, 10, 10, 10)
            add(box)

        def private on_last_fm()
            _instance.configuration.set_feature_string("scrobbling", "service", "last.fm")
            _instance.configuration.save()

        def private on_libre_fm()
            _instance.configuration.set_feature_string("scrobbling", "service", "libre.fm")
            _instance.configuration.save()

        _instance: Instance
        _feature: Feature
        _username: PreferencesPage.ConnectedEntryBox
        _password: PreferencesPage.ConnectedEntryBox
