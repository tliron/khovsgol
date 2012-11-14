[indent=4]

uses
    Json

namespace JsonUtil

    //
    // Types
    //
    
    def is_object(node: Json.Node?): bool
        return (node is not null) && (node.get_node_type() == NodeType.OBJECT)

    def is_array(node: Json.Node?): bool
        return (node is not null) && (node.get_node_type() == NodeType.ARRAY)

    def is_string(node: Json.Node?): bool
        return (node is not null) && (node.get_node_type() == NodeType.VALUE) && (node.get_value_type().name() == "gchararray")

    def is_int(node: Json.Node?): bool
        return (node is not null) && (node.get_node_type() == NodeType.VALUE) && (node.get_value_type().name() == "gint64")

    def is_double(node: Json.Node?): bool
        return (node is not null) && (node.get_node_type() == NodeType.VALUE) && (node.get_value_type().name() == "gdouble")
    
    //
    // Safe getters
    //
    
    def get_object_member_or_null(obj: Json.Object, key: string): Json.Object?
        var node = obj.get_member(key)
        return is_object(node) ? node.get_object() : null

    def get_array_member_or_null(obj: Json.Object, key: string): Json.Array?
        var node = obj.get_member(key)
        return is_array(node) ? node.get_array() : null

    def get_string_member_or_null(obj: Json.Object, key: string): string?
        var node = obj.get_member(key)
        return is_string(node) ? node.get_string() : null

    def get_int_member_or_min(obj: Json.Object, key: string): int
        var node = obj.get_member(key)
        return is_int(node) ? (int) node.get_int() : int.MIN

    def get_double_member_or_nan(obj: Json.Object, key: string): double
        var node = obj.get_member(key)
        return is_double(node) ? node.get_double() : double.NAN
    
    def get_object_element_or_null(arr: Json.Array, index: int): Json.Object?
        var node = arr.get_element(index)
        return is_object(node) ? node.get_object() : null

    def get_array_element_or_null(arr: Json.Array, index: int): Json.Array?
        var node = arr.get_element(index)
        return is_array(node) ? node.get_array() : null

    def get_string_element_or_null(arr: Json.Array, index: int): string?
        var node = arr.get_element(index)
        return is_string(node) ? node.get_string() : null

    def get_int_element_or_min(arr: Json.Array, index: int): int
        var node = arr.get_element(index)
        return is_int(node) ? (int) node.get_int() : int.MIN

    def get_double_element_or_nan(arr: Json.Array, index: int): double
        var node = arr.get_element(index)
        return is_double(node) ? node.get_double() : double.NAN
    
    //
    // Safe setters
    //

    def set_string_member_not_null(obj: Json.Object, key: string, value: string?)
        if value is not null
            obj.set_string_member(key, value)

    def set_int_member_not_min(obj: Json.Object, key: string, value: int)
        if value != int.MIN
            obj.set_int_member(key, value)

    def set_double_member_not_nan(obj: Json.Object, key: string, value: double)
        if value != double.NAN
            obj.set_double_member(key, value)
        
    //
    // Arrays
    //
        
    def array_concat(destination: Json.Array, source: Json.Array)
        for var e in source.get_elements()
            destination.add_element(e)

    //
    // Text conversion
    //

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
                if is_object(node)
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
                if is_array(node)
                    return node.get_array()
                else
                    raise new Error.PARSING("Not a JSON array")
            else
                raise new Error.PARSING("Invalid JSON")
        except e: GLib.Error
            raise new Error.PARSING(e.message)
