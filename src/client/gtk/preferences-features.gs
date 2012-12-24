[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class FeaturesPage: PreferencesPage
        construct(instance: Instance)
            unrealize.connect(on_unrealized)

            var about = new Label("You can turn extra features on and off here.")
            about.set_alignment(0, 0)
            about.wrap = true

            var box = new Box(Orientation.VERTICAL, 10)
            box.pack_start(about, false)
            box.pack_start(new Separator(Orientation.HORIZONTAL), false)

            for var feature in instance.get_features()
                var button = new FeatureButton(feature, instance)
                _feature_buttons.add(button)
                box.pack_start(button, false)

            set_padding(10, 10, 10, 10)
            add(box)

            update()
            _update_id = Timeout.add_seconds(1, update)

        def private on_unrealized()
            Source.remove(_update_id)

        _update_id: uint
        def private update(): bool
            for var feature_button in _feature_buttons
                feature_button.update()
            return true

        _feature_buttons: list of FeatureButton = new list of FeatureButton

        class private FeatureButton: PreferencesPage.WrappedCheckButton
            construct(feature: Feature, instance: Instance)
                super(feature.label)

                _feature = feature
                _instance = instance

                update()
                clicked.connect(on_clicked)
            
            def update()
                var state = _feature.state
                active = (state == FeatureState.STARTED) or (state == FeatureState.STARTING)
                sensitive = (state != FeatureState.STARTING) and (state != FeatureState.STOPPING)
                
            def private on_clicked()
                var active = self.active

                // Update configuration for persistent features
                if _feature.persistent
                    var configured_active = _instance.configuration.is_feature_active(_feature.name)
                    if active != configured_active
                        _instance.configuration.set_feature_active(_feature.name, active)
                        _instance.configuration.save()

                if active
                    sensitive = false
                    _feature.start()
                else
                    _feature.stop()
            
            _feature: Feature
            _instance: Instance
