[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class UiPage: PreferencesPage
        construct(instance: Instance)
            var about = new Label("Khövsgöl aims to be easy to use, but we all have our preferences. You can tweak the user interface here.")
            about.set_alignment(0, 0)
            about.wrap = true

            var show_duration = new CheckButton.with_mnemonic("Show track _durations")
            ((Label) show_duration.get_child()).wrap = true
            set_boolean_configuration(show_duration, instance.configuration, "show_duration")

            var subdue_lossy = new CheckButton.with_mnemonic("Show tracks and albums with _lossy compression in subdued colors")
            ((Label) subdue_lossy.get_child()).wrap = true
            set_boolean_configuration(subdue_lossy, instance.configuration, "subdue_lossy")

            var expand_on_click = new CheckButton.with_mnemonic("Expand items in the library browser when you _click them")
            ((Label) expand_on_click.get_child()).wrap = true
            set_boolean_configuration(expand_on_click, instance.configuration, "expand_on_click")

            var keyboard_focus_label = new Label.with_mnemonic("Initial _keyboard focus when Khövsgöl is started:")
            keyboard_focus_label.set_alignment(0, 0)
            var activate_playlist = new RadioButton.with_label(null, "Playlist")
            ((Label) activate_playlist.get_child()).wrap = true
            var activate_library = new RadioButton.with_label_from_widget(activate_playlist, "Library")
            ((Label) activate_library.get_child()).wrap = true
            set_boolean_configuration(activate_library, instance.configuration, "focus_on_library")
            keyboard_focus_label.mnemonic_widget = activate_playlist

            var box = new Box(Orientation.VERTICAL, 10)
            box.pack_start(about, false)
            box.pack_start(new Separator(Orientation.HORIZONTAL), false)
            box.pack_start(show_duration, false)
            box.pack_start(subdue_lossy, false)
            box.pack_start(expand_on_click, false)
            box.pack_start(keyboard_focus_label, false)
            box.pack_start(activate_playlist, false)
            box.pack_start(activate_library, false)

            set_padding(10, 10, 10, 10)
            add(box)
