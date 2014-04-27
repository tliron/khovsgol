[indent=4]

namespace Khovsgol.Client.Features

    /*
     * Visualization feature.
     */
    class VisualizationFeature: Object implements Feature
        prop readonly name: string = "visualization"
        prop readonly label: string = "Visualization"
        prop readonly persistent: bool = false
        prop readonly state: FeatureState
            get
                return (FeatureState) AtomicInt.@get(ref _state)

        prop instance: Instance
        
        def start()
            if state == FeatureState.STOPPED
                set_state(FeatureState.STARTING)
                if visualization()
                    set_state(FeatureState.STARTED)
                else
                    set_state(FeatureState.STOPPED)
        
        def stop()
            if state == FeatureState.STARTED
                set_state(FeatureState.STOPPING)
                Posix.kill(_pid, Posix.SIGKILL)

        _state: int = FeatureState.STOPPED
        
        def private set_state(state: FeatureState)
            AtomicInt.@set(ref _state, state)
            _logger.message(get_name_from_feature_state(state))
            state_change(state)

        def private visualization(): bool
            try
                if Process.spawn_async(_instance.dir.get_path(), {"projectM-pulseaudio"}, null, SpawnFlags.SEARCH_PATH|SpawnFlags.STDOUT_TO_DEV_NULL|SpawnFlags.STDERR_TO_DEV_NULL|SpawnFlags.DO_NOT_REAP_CHILD, null, out _pid)
                    ChildWatch.add(_pid, on_visualization_died)
                    return true
                else
                    return false
            except e: SpawnError
                _logger.exception(e)
                return false

        def private on_visualization_died(pid: Pid, status: int)
            Process.close_pid(_pid) // Doesn't do anything on Unix
            _pid = 0
            set_state(FeatureState.STOPPED)
        
        _pid: Pid
        
        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.visualization")
