[indent=4]

uses
    Json

namespace JSON
    def to(obj: Json.Object, human: bool = false): string
        var root = new Json.Node(NodeType.OBJECT)
        root.set_object(obj)
        var generator = new Generator()
        generator.root = root
        if human
            generator.pretty = true
        return generator.to_data(null)

    def from(json: string): Json.Object raises Error
        var parser = new Parser()
        try
            if parser.load_from_data(json)
                var node = parser.get_root()
                if node.get_node_type() == NodeType.OBJECT
                    return node.get_object()
                else
                    raise new Error.PARSING("Not a JSON object")
            else
                raise new Error.PARSING("Invalid JSON")
        except e: GLib.Error
            raise new Error.PARSING(e.message)
