[indent=4]

uses
    Indicate

namespace Khovsgol.Client.Plugins

    /*
     * Music indicator plugin.
     * 
     * This is needed only in Ubuntu 11.10 and earlier. Ubuntu 12.04
     * and later no longer need this.
     * 
     * Registers us with music application indicator. Add the
     * MPRIS2 plugin for full integration with the indicator's menu.
     * 
     * Adds a "/com/canonical/indicate" DBus object to our bus.
     */
    class MusicIndicatorPlugin: Object implements Plugin
        prop instance: Instance
        
        def start()
            _server = Server.ref_default()
            if _server is not null
                // The type "music.<name>" specifies that we are a sub-indicator
                // under the music indicator.
                _server.type = "music.khovsgol"

                // The desktop file must be a full path
                var desktop_file = File.new_for_path("%s/.local/share/applications/khovsgol.desktop".printf(Environment.get_home_dir()))
                if desktop_file.query_exists()
                    _server.desktop = desktop_file.get_path()
                else
                    desktop_file = File.new_for_path("/usr/share/applications/khovsgol.desktop")
                    if desktop_file.query_exists()
                        _server.desktop = desktop_file.get_path()
                
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
            _instance.show()

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.music-indicator")
