[indent=4]

uses
    Indicate

namespace Khovsgol.Client.Features

    /*
     * Music indicator feature.
     * 
     * This is needed *only* in Ubuntu 11.10 and earlier. Ubuntu 12.04
     * and later no longer need this.
     * 
     * Registers us with music application indicator. Add the
     * MPRIS2 feature for full integration with the indicator's menu.
     * 
     * Adds a "/com/canonical/indicate" DBus object to our bus.
     */
    class MusicIndicatorFeature: Object implements Feature
        prop readonly name: string = "music-indicator"
        prop readonly label: string = "Sound indicator integration (Ubuntu 11.10 and earlier)"
        prop readonly persistent: bool = true
        prop readonly state: FeatureState
            get
                return (FeatureState) AtomicInt.@get(ref _state)

        prop instance: Instance
        
        def start()
            if state == FeatureState.STOPPED
                set_state(FeatureState.STARTING)

                _server = Indicate.Server.ref_default()
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
                    set_state(FeatureState.STARTED)
                else
                    set_state(FeatureState.STOPPED)

        def stop()
            if state == FeatureState.STARTED
                set_state(FeatureState.STOPPING)
                _server.server_display.disconnect(on_display)
                _server = null
                set_state(FeatureState.STOPPED)
            
        _state: int = FeatureState.STOPPED
        _server: Indicate.Server?
        
        def private set_state(state: FeatureState)
            AtomicInt.@set(ref _state, state)
            _logger.message(get_name_from_feature_state(state))

        def private on_display(timestamp: uint)
            _instance.show()

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.music-indicator")
