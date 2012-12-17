[indent=4]

namespace DBusUtil

    /*
     * Holds a DBus connection.
     */
    class Connector
        prop connection: DBusConnection?
        
        event connect(connection: DBusConnection)
        event disconnecting(connection: DBusConnection)
        
        def start(name: string): bool
            _name_id = Bus.own_name(BusType.SESSION, name, GLib.BusNameOwnerFlags.NONE, on_bus_acquired, on_name_acquired, on_name_lost)
            return _name_id != 0

        def stop(): bool
            if _connection is not null
                disconnecting(_connection)
            if _name_id != 0
                Bus.unown_name(_name_id)
                _name_id = 0
            if _connection is not null
                _connection = null
                return true
            else
                return false

        def private on_bus_acquired(connection: DBusConnection, name: string)
            _connection = connection
            connect(_connection)

        def private on_name_acquired(connection: DBusConnection, name: string)
            pass

        def private on_name_lost(connection: DBusConnection, name: string)
            pass

        _name_id: uint

    /*
     * Tracks DBus property changes.
     */
    class Properties
        construct(connector: Connector, object_path: string, interface_name: string, logger: Logging.Logger)
            _connector = connector
            _object_path = object_path
            _interface_name = interface_name
            _logger = logger

        def @set(name: string, value: Variant?)
            if value is not null
                var existing = _properties[name]
                if (existing is null) or existing.is_container() or (existing.compare(value) != 0)
                    // Note: containers are not comparable, so we'll just consider them always to be different
                    _changes[name] = value
                    _properties[name] = value
                    _removals.remove(name)
            else
                _removals.add(name)
                _changes.unset(name)
                _properties.unset(name)
        
        def emit_changes()
            var connection = _connector.connection
            if (connection is not null) and not _changes.is_empty
                // Copy changes to variant dict
                var builder = new VariantBuilder(VariantType.ARRAY)
                for var name in _changes.keys
                    builder.add("{sv}", name, _changes[name])
                _changes.clear()
                
                // Copy removals to variant array
                var invalid_builder = new VariantBuilder(new VariantType("as"))
                for var name in _removals
                    builder.add("s", name)
                _removals.clear()
                
                var arguments = new Variant("(sa{sv}as)", _interface_name, builder, invalid_builder)
                try
                    connection.emit_signal(null, _object_path, "org.freedesktop.DBus.Properties", "PropertiesChanged", arguments)
                except e: GLib.Error
                    _logger.exception(e)

        _connector: Connector
        _object_path: string
        _interface_name: string
        _logger: Logging.Logger
        _properties: dict of string, Variant = new dict of string, Variant
        _changes: dict of string, Variant = new dict of string, Variant
        _removals: Gee.HashSet of string = new Gee.HashSet of string
