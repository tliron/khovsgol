[indent=4]

uses
    Avahi

namespace AvahiUtil

    /*
     * Manages a client.
     */
    class Client: Object
        prop readonly client: Avahi.Client? = new Avahi.Client()
        
        event started()
        event registering()
        event running()
        event collision()
        event failure()
        event connecting()
        
        def start()
            try
                _client.state_changed.connect(on_state_changed)
                _client.start()
            except e: Avahi.Error
                _logger.exception(e)
            
        def add_resolver(resolver: Browser.Resolver)
            _resolvers.add(resolver)
        
        _resolvers: list of Browser.Resolver = new list of Browser.Resolver
    
        def private on_state_changed(state: ClientState)
            if state == ClientState.NOT_STARTED
                _logger.info("NOT_STARTED")
                started()
            else if state == ClientState.S_REGISTERING
                _logger.info("S_REGISTERING")
                registering()
            else if state == ClientState.S_RUNNING
                _logger.info("S_RUNNING")
                running()
            else if state == ClientState.S_COLLISION
                _logger.info("S_COLLISION")
                collision()
            else if state == ClientState.FAILURE
                _logger.info("FAILURE")
                failure()
            else if state == ClientState.CONNECTING
                _logger.info("CONNECTING")
                connecting()
            else
                _logger.warningf("Unknown state: %d", state)

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("avahi")
            
    class ServiceInfo
        @interface: Interface
        protocol: Protocol
        name: string
        type: string
        domain: string
        flags: LookupResultFlags
        
        def to_id(): string
            return "%s:%s:%s:%d".printf(type, domain, name, protocol.to_af())
    
    class ServiceFoundInfo: ServiceInfo
        hostname: string
        address: Address?
        port: uint16
        txt: unowned StringList?
    
    /*
     * Browses (and resolves) services.
     */
    class Browser: Object
        construct(type: string, client: Client? = null)
            _type = type
            if client is not null
                _client = client
            else
                _client = new Client()
            
            _client.running.connect(on_running)
        
        // Note: if we use Avahi.Interface or Avahi.Protocol in the signal, we get compilation errors
        event found(info: ServiceFoundInfo)
        event removed(info: ServiceInfo)
        
        def start()
            _client.start()
        
        _type: string
        _client: Client
        _service_browser: ServiceBrowser
        
        def private on_running()
            try
                _service_browser = new ServiceBrowser(_type)
                _service_browser.new_service.connect(on_new_service)
                _service_browser.removed_service.connect(on_service_removed)
                _service_browser.failure.connect(on_failed)
                _service_browser.attach(_client.client)
            except e: Avahi.Error
                _logger.exception(e)

        def private on_new_service(@interface: Interface, protocol: Protocol, name: string, type: string, domain: string, flags: LookupResultFlags)
            try
                new Resolver(self, @interface, protocol, name, type, domain)
            except e: Avahi.Error
                _logger.exception(e)

        def private on_service_removed(@interface: Interface, protocol: Protocol, name: string, type: string, domain: string, flags: LookupResultFlags)
            var info = new ServiceInfo()
            info.@interface = @interface
            info.protocol = protocol
            info.name = name
            info.type = type
            info.domain = domain
            info.flags = flags
            removed(info)
        
        def private on_failed(e: GLib.Error)
            _logger.exception(e)

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("avahi.browser")

        class Resolver: GLib.Object
            construct(browser: Browser, @interface: Interface, protocol: Protocol, name: string, type: string, domain: string) raises Avahi.Error
                _browser = browser
                _resolver = new ServiceResolver(@interface, protocol, name, type, domain, protocol)
                _resolver.found.connect(on_found)
                _resolver.failure.connect(on_failed)
                _resolver.attach(_browser._client.client)

                // The ServiceResolver instance can only be safely destroyed while the client is still connected,
                // so we'll let the client own us
                _browser._client.add_resolver(self)

            def private on_found(@interface: Interface, protocol: Protocol, name: string, type: string, domain: string, hostname: string, address: Address?, port: uint16, txt: StringList?, flags: LookupResultFlags)
                var info = new ServiceFoundInfo()
                info.@interface = @interface
                info.protocol = protocol
                info.name = name
                info.type = type
                info.domain = domain
                info.hostname = hostname
                info.address = address
                info.port = port
                info.txt = txt
                info.flags = flags
                _browser.found(info)
                stop()

            def private on_failed(e: GLib.Error)
                _logger.exception(e)
                stop()
            
            def private stop()
                _resolver.found.disconnect(on_found)
                _resolver.failure.disconnect(on_failed)
            
            _browser: Browser
            _resolver: ServiceResolver
    
    /*
     * Publishes a service.
     * 
     * Automatically handles name collisions by attempting to re-publish with an alternative name.
     * 
     * See: http://avahi.org/download/doxygen/client-publish-service_8c-example.html
     */
    class Publisher: Object
        construct(name: string, type: string, port: uint16, client: Client? = null)
            _name = name
            _type = type
            _port = port
            if client is not null
                _client = client
            else
                _client = new Client()
            _client.running.connect(on_running)
            _client.registering.connect(on_registering)
            if client is null
                _client.start()
                
        final
            try
                _entry_group.reset()
            except e: Avahi.Error
                _logger.exception(e)

        _client: Client
        _entry_group: EntryGroup
        _name: string
        _type: string
        _port: uint16
        
        def private publish() raises Avahi.Error
            if _entry_group is not null
                _logger.messagef("Attempting to publish: %s:%s:%d", _name, _type, _port)
                _entry_group.add_service_full(Interface.UNSPEC, Protocol.INET, 0, _name, _type, "", "", _port)
                _entry_group.commit()
        
        def private on_running()
            _entry_group = new EntryGroup()
            _entry_group.state_changed.connect(on_state_changed)
            try
                _entry_group.attach(_client.client)
                publish()
            except e: Avahi.Error
                _logger.exception(e)
        
        def private on_registering()
            if _entry_group is not null
                try
                    _entry_group.reset()
                except e: Avahi.Error
                    _logger.exception(e)
        
        def private on_state_changed(state: EntryGroupState)
            if state == EntryGroupState.UNCOMMITED
                _logger.info("UNCOMMITED")
            else if state == EntryGroupState.REGISTERING
                _logger.info("REGISTERING")
            else if state == EntryGroupState.ESTABLISHED
                _logger.info("ESTABLISHED")
                _logger.messagef("Published: %s:%s:%d", _name, _type, _port)
            else if state == (EntryGroupState) DirectEntryGroupState.COLLISION
                _logger.info("COLLISION")
                _logger.messagef("Name already in use: %s", _name)
                _name = Alternative.service_name(_name)
                try
                    publish()
                except e: Avahi.Error
                    _logger.exception(e)
            else if state == EntryGroupState.FAILURE
                _logger.info("FAILURE")
                _logger.warningf("Failed to publish: %s:%s:%d", _name, _type, _port)
            else
                _logger.warningf("Unknown state: %d", state)

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("avahi.publisher")
