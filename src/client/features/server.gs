[indent=4]

namespace Khovsgol.Client.Features

    /*
     * Local server feature.
     */
    class ServerFeature: Object implements Feature
        prop readonly name: string = "server"
        prop readonly label: string = "Local Khövsgöl server"
        prop readonly persistent: bool = false
        prop readonly state: FeatureState
            get
                return (FeatureState) AtomicInt.@get(ref _state)

        prop instance: Instance
        
        def start()
            if state == FeatureState.STOPPED
                set_state(FeatureState.STARTING)
                if khovsgold(true)
                    set_state(FeatureState.STARTED)
                else
                    set_state(FeatureState.STOPPED)
        
        def stop()
            if state == FeatureState.STARTED
                set_state(FeatureState.STOPPING)
                khovsgold(false)
                set_state(FeatureState.STOPPED)

        _state: int = FeatureState.STOPPED
        
        def private set_state(state: FeatureState)
            AtomicInt.@set(ref _state, state)
            _logger.message(get_name_from_feature_state(state))

        def private khovsgold(start: bool): bool
            pid: Pid
            try
                Process.spawn_async(instance.dir.get_path(), {"khovsgold", start ? "--start" : "--stop"}, null, SpawnFlags.STDOUT_TO_DEV_NULL|SpawnFlags.STDERR_TO_DEV_NULL, null, out pid)
                return true
            except e: SpawnError
                _logger.exception(e)
                return false
        
        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.server")
