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
    
    enum PluginState
        STOPPED = 0
        STARTING = 1
        STARTED = 2
        STOPPING = 3

    /*
     * Basic interface for plugins.
     */
    interface Plugin: GLib.Object
        prop abstract readonly name: string
        prop abstract instance: Instance
        prop abstract readonly state: PluginState

        def abstract start()
        def abstract stop()
