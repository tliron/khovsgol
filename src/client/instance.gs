[indent=4]

uses
    Gtk

namespace Khovsgol

    class ClientInstance: GLib.Object
        construct()
            _window = new Window()
            
        def start()
            _window.show_all()
            Gtk.main()
        
        _window: Window

init
    Gtk.init(ref args)
    new Khovsgol.ClientInstance().start()
