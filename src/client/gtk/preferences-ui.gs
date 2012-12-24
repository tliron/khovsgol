[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class UiPage: PreferencesPage
        construct(instance: Instance)
            var about = new Label("Khövsgöl aims to be easy to use, but we all have our preferences. You can tweak the user interface here.")
            about.set_alignment(0, 0)
            about.wrap = true

            var show_duration = new ConnectedCheckButton("Show track _durations", null, instance.configuration, null, "show_duration")
            var subdue_lossy = new ConnectedCheckButton("Show tracks and albums with _lossy compression in subdued colors", null, instance.configuration, null, "subdue_lossy")
            var expand_on_click = new ConnectedCheckButton("Expand items in the library browser when you _click them", null, instance.configuration, null, "expand_on_click")

            var keyboard_focus_label = new Label.with_mnemonic("Initial _keyboard focus when Khövsgöl is started:")
            keyboard_focus_label.set_alignment(0, 0)
            var activate_playlist = new WrappedRadioButton("Playlist")
            var activate_library = new ConnectedRadioButton("Library", activate_playlist, instance.configuration, null, "focus_on_library")
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
