[indent=4]

namespace Khovsgol.Client.Features

    /*
     * Local receiver feature.
     */
    class ReceiverFeature: Object implements Feature
        prop readonly name: string = "receiver"
        prop readonly label: string = "Local Khövsgöl receiver"
        prop readonly persistent: bool = false
        prop readonly state: FeatureState
            get
                return (FeatureState) AtomicInt.@get(ref _state)

        prop instance: Instance
        
        def start()
            if state == FeatureState.STOPPED
                set_state(FeatureState.STARTING)
                if khovsgolr(true)
                    set_state(FeatureState.STARTED)
                else
                    set_state(FeatureState.STOPPED)
        
        def stop()
            if state == FeatureState.STARTED
                set_state(FeatureState.STOPPING)
                khovsgolr(false)
                set_state(FeatureState.STOPPED)

        _state: int = FeatureState.STOPPED
        
        def private set_state(state: FeatureState)
            AtomicInt.@set(ref _state, state)
            _logger.message(get_name_from_feature_state(state))
            state_change(state)

        def private khovsgolr(start: bool): bool
            return daemon("khovsgolr", start, instance, _logger)
        
        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.receiver")
