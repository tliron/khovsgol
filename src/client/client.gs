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

    /*
     * Basic interface for plugins.
     */
    interface Plugin: GLib.Object
        prop abstract instance: Instance

        def abstract start()
        def abstract stop()
