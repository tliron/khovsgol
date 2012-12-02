[indent=4]

namespace DbusUtil

    /*
     * Holds a DBus connection.
     */
    class ConnectionHolder
        prop connection: DBusConnection?

    /*
     * Tracks DBus property changes.
     */
    class Properties
        construct(connection_holder: ConnectionHolder, object_path: string, interface_name: string)
            _connection_holder = connection_holder
            _object_path = object_path
            _interface_name = interface_name

        def set(name: string, value: Variant)
            var existing = _properties[name]
            if existing is not null
                // Containers are not comparable, so we'll just consider
                // them always to have changed
                if value.is_container() || (existing.compare(value) != 0)
                    _changes[name] = value
                    _properties[name] = value
            else
                _changes[name] = value
                _properties[name] = value
        
        def emit_changes()
            var connection = _connection_holder.connection
            if (connection is not null) && (!_changes.is_empty)
                // Changes array
                var builder = new VariantBuilder(VariantType.ARRAY)
                for var name in _changes.keys
                    builder.add("{sv}", name, _changes[name])
                _changes.clear()
                
                // Invalid array
                var invalid_builder = new VariantBuilder(new VariantType("as"))
                
                var arguments = new Variant("(sa{sv}as)", _interface_name, builder, invalid_builder)
                try
                    connection.emit_signal(null, _object_path, "org.freedesktop.DBus.Properties", "PropertiesChanged", arguments)
                except e: GLib.Error
                    print e.message

        _connection_holder: ConnectionHolder
        _object_path: string
        _interface_name: string
        _properties: dict of string, Variant = new dict of string, Variant
        _changes: dict of string, Variant = new dict of string, Variant
