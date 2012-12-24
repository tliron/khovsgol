[indent=4]

namespace Khovsgol.Client

    /*
     * Basic interface for client instances.
     */
    interface Instance: GLib.Object
        prop abstract readonly configuration: Configuration
        prop abstract readonly dir: File
        prop abstract readonly api: API
        prop abstract player: string

        def abstract get_resource(name: string): File?
        def abstract stop()
        def abstract show()
    
    enum FeatureState
        STOPPED = 0
        STARTING = 1
        STARTED = 2
        STOPPING = 3

    def get_name_from_feature_state(state: FeatureState): string?
        if state == FeatureState.STOPPED
            return "stopped"
        else if state == FeatureState.STARTING
            return "starting"
        else if state == FeatureState.STARTED
            return "started"
        else if state == FeatureState.STOPPING
            return "stopping"
        else
            return null

    /*
     * Basic interface for features.
     */
    interface Feature: GLib.Object
        prop abstract readonly name: string
        prop abstract readonly label: string
        prop abstract readonly persistent: bool
        prop abstract readonly state: FeatureState

        prop abstract instance: Instance

        def abstract start()
        def abstract stop()
