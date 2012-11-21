[indent=4]

uses
    Json

namespace JsonUtil

    interface HasJsonObject
        def abstract to_json(): Json.Object

    interface HasJsonArray
        def abstract to_json(): Json.Array

    //
    // Types
    //
    
    def is_object(node: Json.Node?): bool
        return (node is not null) && (node.get_node_type() == NodeType.OBJECT)

    def is_array(node: Json.Node?): bool
        return (node is not null) && (node.get_node_type() == NodeType.ARRAY)

    def is_string(node: Json.Node?): bool
        return (node is not null) && (node.get_node_type() == NodeType.VALUE) && node.get_value_type().is_a(typeof(string))

    def is_int64(node: Json.Node?): bool
        return (node is not null) && (node.get_node_type() == NodeType.VALUE) && node.get_value_type().is_a(typeof(int64))

    def is_double(node: Json.Node?): bool
        return (node is not null) && (node.get_node_type() == NodeType.VALUE) && node.get_value_type().is_a(typeof(double))

    def is_bool(node: Json.Node?): bool
        return (node is not null) && (node.get_node_type() == NodeType.VALUE) && node.get_value_type().is_a(typeof(bool))
    
    //
    // Safe getters
    //
    
    def get_member_or_null(obj: Json.Object, key: string): Json.Node?
        return obj.has_member(key) ? obj.get_member(key) : null
    
    def get_object_member_or_null(obj: Json.Object, key: string): Json.Object?
        var node = get_member_or_null(obj, key)
        return is_object(node) ? node.get_object() : null

    def get_array_member_or_null(obj: Json.Object, key: string): Json.Array?
        var node = get_member_or_null(obj, key)
        return is_array(node) ? node.get_array() : null

    def get_string_member_or_null(obj: Json.Object, key: string): string?
        var node = get_member_or_null(obj, key)
        return is_string(node) ? node.get_string() : null

    def get_int64_member_or_min(obj: Json.Object, key: string): int64
        var node = get_member_or_null(obj, key)
        if is_int64(node)
            return node.get_int()
        else if is_double(node)
            return (int64) node.get_double()
        else
            return int64.MIN

    def get_int_member_or_min(obj: Json.Object, key: string): int
        var node = get_member_or_null(obj, key)
        if is_int64(node)
            return (int) node.get_int()
        else if is_double(node)
            return (int) node.get_double()
        else
            return int.MIN

    def get_double_member_or_min(obj: Json.Object, key: string): double
        var node = get_member_or_null(obj, key)
        if is_double(node)
            return node.get_double()
        else if is_int64(node)
            return (double) node.get_int()
        else
            return double.MIN

    def get_bool_member_or_false(obj: Json.Object, key: string): bool
        var node = get_member_or_null(obj, key)
        return is_bool(node) ? node.get_boolean() : false
    
    def get_object_element_or_null(arr: Json.Array, index: int): Json.Object?
        var node = arr.get_element(index)
        return is_object(node) ? node.get_object() : null

    def get_array_element_or_null(arr: Json.Array, index: int): Json.Array?
        var node = arr.get_element(index)
        return is_array(node) ? node.get_array() : null

    def get_string_element_or_null(arr: Json.Array, index: int): string?
        var node = arr.get_element(index)
        return is_string(node) ? node.get_string() : null

    def get_int64_element_or_min(arr: Json.Array, index: int): int64
        var node = arr.get_element(index)
        if is_int64(node)
            return node.get_int()
        else if is_double(node)
            return (int64) node.get_double()
        else
            return int64.MIN

    def get_int_element_or_min(arr: Json.Array, index: int): int
        var node = arr.get_element(index)
        if is_int64(node)
            return (int) node.get_int()
        else if is_double(node)
            return (int) node.get_double()
        else
            return int.MIN

    def get_double_element_or_min(arr: Json.Array, index: int): double
        var node = arr.get_element(index)
        if is_double(node)
            return node.get_double()
        else if is_int64(node)
            return (double) node.get_int()
        else
            return double.MIN

    def get_bool_element_or_false(arr: Json.Array, index: int): bool
        var node = arr.get_element(index)
        return is_bool(node) ? node.get_boolean() : false
    
    //
    // Safe setters
    //

    def set_string_member_not_null(obj: Json.Object, key: string, value: string?)
        if value is not null
            obj.set_string_member(key, value)

    def set_int64_member_not_min(obj: Json.Object, key: string, value: int64)
        if value != int64.MIN
            obj.set_int_member(key, value)

    def set_int_member_not_min(obj: Json.Object, key: string, value: int)
        if value != int.MIN
            obj.set_int_member(key, value)

    def set_double_member_not_min(obj: Json.Object, key: string, value: double)
        if value != double.MIN
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
