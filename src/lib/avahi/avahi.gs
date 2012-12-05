[indent=4]

uses
    Avahi

namespace AvahiUtil

    /*
     * Manages a client.
     */
    class Client: Object
        construct()
            _client = new Avahi.Client()
            _client.state_changed.connect(on_state_changed)
            try
                _client.start()
            except e: Avahi.Error
                _client = null
                _logger.exception(e)
        
        prop readonly client: Avahi.Client?
        
        def private on_state_changed(state: ClientState)
            if state == ClientState.NOT_STARTED
                _logger.info("NOT_STARTED")
            else if state == ClientState.S_REGISTERING
                _logger.info("S_REGISTERING")
            else if state == ClientState.S_RUNNING
                _logger.info("S_RUNNING")
            else if state == ClientState.S_COLLISION
                _logger.info("S_COLLISION")
            else if state == ClientState.FAILURE
                _logger.info("FAILURE")
            else if state == ClientState.CONNECTING
                _logger.info("CONNECTING")
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
        construct(type: string, client: Client? = null) raises Avahi.Error
            if client is not null
                _client = client
            else
                _client = new Client()
            _service_browser = new ServiceBrowser(type)
            _service_browser.new_service.connect(on_new_service)
            _service_browser.removed_service.connect(on_service_removed)
            _service_browser.failure.connect(on_failed)
            _service_browser.attach(_client.client)
        
        // Note: if we use Avahi.Interface or Avahi.Protocol in the signal, we get compilation errors
        event found(info: ServiceFoundInfo)
        event removed(info: ServiceInfo)
            
        _client: Client
        _service_browser: ServiceBrowser

        def private on_new_service(@interface: Interface, protocol: Protocol, name: string, type: string, domain: string, flags: LookupResultFlags)
            try
                new Resolver(self, _client, @interface, protocol, name, type, domain)
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
            pass
        
        def private on_failed(e: GLib.Error)
            _logger.exception(e)

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("avahi.browser")

        class Resolver: GLib.Object
            construct(browser: Browser, client: Client, @interface: Interface, protocol: Protocol, name: string, type: string, domain: string) raises Avahi.Error
                _browser = browser
                _resolver = new ServiceResolver(@interface, protocol, name, type, domain, protocol)
                _resolver.found.connect(on_found)
                _resolver.failure.connect(on_failed)
                _resolver.attach(client.client)
                ref()
            
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
                unref()

            def private on_failed(e: GLib.Error)
                _logger.exception(e)
                unref()
            
            _browser: Browser
            _resolver: ServiceResolver
    
    /*
     * Publishes a service.
     */
    class Publisher: Object
        construct(name: string, type: string, port: uint16, client: Avahi.Client? = null) raises Avahi.Error
            _client: Avahi.Client
            if client is not null
                _client = client
            else
                _client = new Client().client
            _entry_group = new EntryGroup()
            _entry_group.attach(_client)
            _entry_group.add_service(name, type, port)
            _entry_group.commit()
            _logger.message("Published")

        final
            try
                _entry_group.reset()
                _logger.message("Unpublished")
            except e: Avahi.Error
                _logger.exception(e)

        _entry_group: EntryGroup

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("avahi.publisher")
