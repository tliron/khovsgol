[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class Preferences: Window
        construct(instance: Instance)
            _instance = instance
            
            var server_page = new Alignment(0, 0, 1, 1)

            // Assemble

            var main_box = new Notebook()
            var label = new Label.with_mnemonic("_Server")
            main_box.append_page(server_page, label)

            add(main_box)

            title = "Preferences"
            border_width = 10
            set_position(WindowPosition.CENTER)
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

        _instance: Instance

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.preferences")
