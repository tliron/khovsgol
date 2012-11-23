[indent=4]

uses
    Khovsgol

namespace Khovsgol.GUI

    class Instance: Object
        construct(args: array of string) raises GLib.Error
            _api = new Client.API("localhost", 8181)
            player = Environment.get_user_name()
            _window = new MainWindow(self)
            
        prop readonly api: Client.API
        prop player: string
            get
                return _player
            set
                if _player != value
                    _api.watching_player = _player = value
    
        def start()
            _api.start_player_poll()
            Gtk.main()
        
        def stop()
            Gtk.main_quit()
            _api.stop_player_poll(true)
        
        _window: MainWindow
        _player: string
        
init
    try
        GtkUtil.initialize()
        new Khovsgol.GUI.Instance(args).start()
    except e: GLib.Error
        stderr.printf("%s\n", e.message)
