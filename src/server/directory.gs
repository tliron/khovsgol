[indent=4]

uses
    JsonUtil

namespace Khovsgol.Server

    class abstract Directory: Object implements HasJsonObject
        prop crucible: Crucible
        prop path: string
        prop library: Library
        
        prop abstract readonly is_scanning: bool
        
        def abstract scan()

        def to_json(): Json.Object
            var json = new Json.Object()
            set_string_member_not_null(json, "path", path)
            json.set_boolean_member("scanning", is_scanning)
            return json
