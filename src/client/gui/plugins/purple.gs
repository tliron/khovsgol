[indent=4]

namespace Khovsgol.GUI.Plugins

    /*
     * Purple plugin.
     * 
     * Sets the instant messaging status for Pidgin and Finch.
     */
    class PurplePlugin: Object implements Khovsgol.GUI.Plugin
        prop instance: Khovsgol.GUI.Instance
        
        def start()
            _logger.message("Started")
        
        def stop()
            _logger.message("Stopped")

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.purple")
