[indent=4]

uses
    Indicate

namespace Khovsgol.GUI.Plugins

    /*
     * Music indicator plugin.
     * 
     * Registers us with music application indicator. Add the
     * MPRIS2 plugin for full integration with the indicator's menu.
     */
    class MusicIndicatorPlugin: Object implements Khovsgol.GUI.Plugin
        prop instance: Khovsgol.GUI.Instance
        
        def start()
            _server = Server.ref_default()
            if _server != null
                // The name ("music.<name>") matches the MPRIS2 desktop
                // entry property, and is also used for displaying
                // the icon from "/usr/share/pixmaps/<name>.*"
                _server.type = "music.khovsgol"
                
                // Used to start the program if it's closed
                _server.desktop = "/usr/share/applications/khovsgol.desktop"
                
                _server.server_display.connect(on_display)
                _server.show()
                _logger.message("Started")
        
        def stop()
            if _server is not null
                _server.server_display.disconnect(on_display)
                _server = null
                _logger.message("Stopped")
            
        _server: Server?
        
        def private on_display(timestamp: uint)
            print "display %u", timestamp
            _instance.window.deiconify()

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.music-indicator")
