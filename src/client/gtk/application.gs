[indent=4]

namespace Khovsgol.Client.GTK

    class Application: Gtk.Application
        construct(args: array of string) raises GLib.Error
            Object(application_id: "khovsgol.gtk", flags: ApplicationFlags.FLAGS_NONE)
            _instance = new Instance(self, args)
            
        _instance: Instance

        def override activate()
            _instance.start()

init
    try
        GtkUtil.initialize()
        new Khovsgol.Client.GTK.Application(args).run()
    except e: GLib.Error
        stderr.printf("%s\n", e.message)
