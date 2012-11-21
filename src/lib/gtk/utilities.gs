[indent=4]

uses
    Gtk
    Gdk

namespace GtkUtil

    def initialize()
        if !_initialized
            var arguments = new array of string[0]
            weak_arguments: weak array of string = arguments
            Gtk.init(ref weak_arguments)
            _initialized = true
            var version = "GTK+ %u.%u.%u".printf(Gtk.get_major_version(), Gtk.get_minor_version(), Gtk.get_micro_version())
            Logging.get_logger("gtk+").info("Initialized %s", version)

    _initialized: private bool = false
