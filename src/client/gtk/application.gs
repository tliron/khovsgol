[indent=4]

namespace Khovsgol.Client.GTK

    class Application: Gtk.Application
        construct(args: array of string) raises GLib.Error
            Object(application_id: "khovsgol.gtk", flags: ApplicationFlags.FLAGS_NONE)
            _instance = new Instance(self, args)

        def override activate()
            if not _instance.started
                _instance.start()
            else
                _instance.show()
            
        _instance: Instance

init
    try
        GtkUtil.initialize()
        var application = new Khovsgol.Client.GTK.Application(args)
        application.run()
    except e: GLib.Error
        stderr.printf("%s\n", e.message)
