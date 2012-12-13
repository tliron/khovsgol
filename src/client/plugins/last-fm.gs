[indent=4]

uses
    LastFm

namespace Khovsgol.Client.Plugins

    /*
     * Last.fm Scrobbling plugin.
     */
    class LastFmPlugin: Object implements Plugin
        prop instance: Instance

        def start()
            pass
        
        def stop()
            pass

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.client.last-fm")
