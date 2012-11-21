[indent=4]

uses
    Khovsgol

namespace Khovsgol.GUI

    class Instance: Object
        construct(args: array of string) raises GLib.Error
            _api = new Client.API("localhost", 8181)
            _window = new MainWindow(self)
            
        prop readonly api: Client.API
            
        def start()
            if _api is not null
                _api.start_watch(Environment.get_user_name())
            Gtk.main()
        
        def stop()
            Gtk.main_quit()
            if _api is not null
                _api.stop_watch(true)
        
        _window: MainWindow

init
    try
        GtkUtil.initialize()
        new Khovsgol.GUI.Instance(args).start()
    except e: GLib.Error
        stderr.printf("%s\n", e.message)
