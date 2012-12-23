[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class Preferences: Window
        construct(instance: Instance)
            var main_box = new Notebook()
            main_box.append_page(new ServerPage(instance), new Label.with_mnemonic("_Server"))
            main_box.append_page(new UiPage(instance), new Label.with_mnemonic("User _interface"))
            main_box.append_page(new FeaturesPage(instance), new Label.with_mnemonic("_Extra features"))
            main_box.append_page(new ScrobblingPage(instance), new Label.with_mnemonic("Scro_bbling"))

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
        def connect_sensitivity(button: CheckButton, depends: CheckButton)
            _ownerships.add(new SensitivityDependsOn(button, depends))
        
        def connect_to_boolean_configuration(button: CheckButton, configuration: Khovsgol.Configuration, property: string, reverse: bool = false)
            var value = Value(typeof(bool))
            configuration.get_property(property, ref value)
            var bool_value = (bool) value
            if reverse
                bool_value = not bool_value
            if bool_value
                button.active = true
            _ownerships.add(new SetBooleanConfiguration(button, configuration, property, reverse))
        
        _ownerships: list of Object = new list of Object

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
