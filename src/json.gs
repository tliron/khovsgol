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
