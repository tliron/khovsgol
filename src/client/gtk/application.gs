[indent=4]

namespace Khovsgol.Client.GTK

    class Application: Gtk.Application
        construct()
            Object(application_id: "khovsgol.gtk", flags: ApplicationFlags.HANDLES_COMMAND_LINE)
        
        /*
         * This will always be called on the *primary* Application instance.
         */
        def override activate()
            if _instance is not null
                _instance.start()

        /*
         * This will always be called on the *primary* Application instance.
         * (Because we set ApplicationFlags.HANDLES_COMMAND_LINE)
         */
        def override command_line(command_line: ApplicationCommandLine): int
            var arguments = new Arguments(command_line)
            if arguments.quit
                return arguments.status_code
                
            if _instance is null
                try
                    _instance = new Instance(self, arguments)
                except e: GLib.Error
                    command_line.print("%s\n", e.message)
                    return 1

            activate()

            return 0
        
        _instance: Instance

init
    var application = new Khovsgol.Client.GTK.Application()
    application.run(args)
