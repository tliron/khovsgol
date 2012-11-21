[indent=4]

uses
    Khovsgol

namespace Khovsgol.GUI

    class Instance: Object
        construct(args: array of string) raises GLib.Error
            _window = new MainWindow(self)
            
        def start()
            Gtk.main()
        
        def stop()
            Posix.exit(0)
        
        _window: MainWindow

init
    try
        GtkUtil.initialize()
        new Khovsgol.GUI.Instance(args).start()
    except e: GLib.Error
        stderr.printf("%s\n", e.message)
