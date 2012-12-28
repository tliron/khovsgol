[indent=4]

uses
    Gtk

namespace Khovsgol.Client.GTK

    class FeaturesPage: PreferencesPage
        construct(instance: Instance)
            var about = new Label("You can turn extra features on and off here.")
            about.set_alignment(0, 0)
            about.use_markup = true
            about.wrap = true

            var box = new Box(Orientation.VERTICAL, 10)
            box.pack_start(about, false)
            box.pack_start(new Separator(Orientation.HORIZONTAL), false)

            for var feature in instance.get_features()
                var button = new FeatureButton(instance, feature)
                _feature_buttons.add(button)
                box.pack_start(button, false)

            set_padding(10, 10, 10, 10)
            add(box)

        _feature_buttons: list of PreferencesPage.FeatureButton = new list of PreferencesPage.FeatureButton
