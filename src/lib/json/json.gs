[indent=4]

uses
    Json

namespace JSON

    def object_to(obj: Json.Object, human: bool = false): string
        var root = new Json.Node(NodeType.OBJECT)
        root.set_object(obj)
        var generator = new Generator()
        generator.root = root
        if human
            generator.pretty = true
        return generator.to_data(null)

    def array_to(arr: Json.Array, human: bool = false): string
        var root = new Json.Node(NodeType.ARRAY)
        root.set_array(arr)
        var generator = new Generator()
        generator.root = root
        if human
            generator.pretty = true
        return generator.to_data(null)

    def from_object(json: string): Json.Object raises Error
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

    def from_array(json: string): Json.Array raises Error
        var parser = new Parser()
        try
            if parser.load_from_data(json)
                var node = parser.get_root()
                if node.get_node_type() == NodeType.ARRAY
                    return node.get_array()
                else
                    raise new Error.PARSING("Not a JSON array")
            else
                raise new Error.PARSING("Invalid JSON")
        except e: GLib.Error
            raise new Error.PARSING(e.message)
