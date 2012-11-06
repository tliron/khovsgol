[indent=4]

uses
    Json // apt-get install libjson-glib-dev, valac --pkg json-glib-1.0

namespace JSON
    def to(obj: Json.Object, human: bool = false): string
        var root = new Json.Node(Json.NodeType.OBJECT)
        root.set_object(obj)
        var generator = new Json.Generator()
        generator.root = root
        if human
            generator.pretty = true
        return generator.to_data(null)

    def from(json: string): Json.Object? raises Error
        var parser = new Json.Parser()
        try
            if parser.load_from_data(json)
                var node = parser.get_root()
                if node.get_node_type() == Json.NodeType.OBJECT
                    return node.get_object()
                else
                    raise new Error.PARSING("Not a JSON object")
            else
                raise new Error.PARSING("No JSON to parse")
        except e: GLib.Error
            raise new Error.PARSING(e.message)
