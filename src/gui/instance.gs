[indent=4]

uses
    Gtk
    Khovsgol

namespace Khovsgol.GUI

    class Instance: GLib.Object
        construct()
            _window = new Window()
            
        def start()
            _window.show_all()
            Gtk.main()
        
        _window: Window

init
    // Initialize GTK+
    var arguments = new array of string[0]
    weak_arguments: weak array of string = arguments
    Gtk.init(ref weak_arguments)
    
    new Khovsgol.GUI.Instance().start()
