[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class Preferences: Window
        construct(instance: Instance)
            var main_box = new Notebook()
            main_box.append_page(new ServerPage(instance), new Label.with_mnemonic("_Server"))
            main_box.append_page(new ReceiverPage(instance), new Label.with_mnemonic("_Receiver"))
            main_box.append_page(new UiPage(instance), new Label.with_mnemonic("User _interface"))
            main_box.append_page(new ScrobblingPage(instance), new Label.with_mnemonic("Scro_bbling"))
            main_box.append_page(new FeaturesPage(instance), new Label.with_mnemonic("_Features"))

            add(main_box)

            title = "Preferences"
            border_width = 10
            set_position(WindowPosition.CENTER_ON_PARENT)
            set_default_size(500, 400)
            transient_for = instance.window
            destroy_with_parent = true

            key_press_event.connect(on_key_pressed)

        def private on_key_pressed(e: Gdk.EventKey): bool
            var keyval = e.keyval
            if keyval == Gdk.Key.Escape
                destroy()
                return true
            else
                return false

    class PreferencesPage: Alignment
        class WrappedCheckButton: CheckButton
            construct(label: string)
                self.label = label
                use_underline = true
                ((Label) get_child()).wrap = true

        class ConnectedCheckButton: WrappedCheckButton
            construct(label: string, depends: CheckButton?, configuration: Khovsgol.Configuration, feature: string?, property: string, reverse: bool = false)
                super(label)
                if depends is not null
                    _sensitivity = new SetSensitivity(self, depends)
                _setter = new SetBooleanConfiguration(self, configuration, feature, property, reverse)
            
            _sensitivity: SetSensitivity
            _setter: SetBooleanConfiguration

        class WrappedRadioButton: RadioButton
            construct(label: string, group: RadioButton? = null)
                self.label = label
                ((Label) get_child()).wrap = true
                if group is not null
                    join_group(group)
        
        class ConnectedRadioButton: WrappedRadioButton
            construct(label: string, group: RadioButton?, configuration: Khovsgol.Configuration, feature: string?, property: string, reverse: bool = false)
                super(label, group)
                _setter = new SetBooleanConfiguration(self, configuration, feature, property, reverse)
            
            _setter: SetBooleanConfiguration
    
        def connect_sensitivity(button: CheckButton, depends: CheckButton)
            _ownerships.add(new SetSensitivity(button, depends))
        
        def connect_to_boolean_configuration(button: CheckButton, configuration: Khovsgol.Configuration, feature: string?, property: string, reverse: bool = false)
            _ownerships.add(new SetBooleanConfiguration(button, configuration, feature, property, reverse))
        
        _ownerships: list of Object = new list of Object

        class private SetSensitivity: Object
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
            construct(button: CheckButton, configuration: Khovsgol.Configuration, feature: string?, property: string, reverse: bool)
                _button = button
                _configuration = configuration
                _feature = feature
                _property = property
                _reverse = reverse

                var value = configured
                if reverse
                    value = not value
                if value
                    _button.active = true

                _button.clicked.connect(on_clicked)
            
            prop configured: bool
                get
                    if _feature is not null
                        return ((Configuration) _configuration).is_feature_boolean(_feature, _property)
                    else
                        var value = Value(typeof(bool))
                        _configuration.get_property(_property, ref value)
                        return (bool) value
                set
                    if _feature is not null
                        ((Configuration) _configuration).set_feature_boolean(_feature, _property, value)
                        _configuration.save()
                        _logger.messagef("Set configuration: %s.%s = %s", _feature, _property, value ? "true" : "false")
                    else
                        _configuration.set_property(_property, value)
                        _configuration.save()
                        _logger.messagef("Set configuration: %s = %s", _property, value ? "true" : "false")
                
            def private on_clicked()
                var active = _button.active
                if _reverse
                    active = not active
                if active != configured
                    configured = active
            
            _button: CheckButton
            _configuration: Khovsgol.Configuration
            _feature: string?
            _property: string
            _reverse: bool
