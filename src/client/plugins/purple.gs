[indent=4]

namespace Khovsgol.Client.Plugins

    /*
     * Purple plugin.
     * 
     * Sets the instant messaging status for Pidgin and Finch.
     */
    class PurplePlugin: Object implements Plugin
        prop instance: Instance
        
        def start()
            _logger.message("Started")
        
        def stop()
            _logger.message("Stopped")

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.purple")
