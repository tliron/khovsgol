[indent=4]

uses
    Nap
    
namespace Khovsgol.Server

    class Arguments: Object
        construct(args: array of string)
            restart_daemon: bool = false
            
            var options = new array of OptionEntry[8]
            options[0] = {"port",    0, 0, OptionArg.INT,   ref _port,          "Web server TCP port (defaults to 8080)", "number"}
            options[1] = {"threads", 0, 0, OptionArg.INT,   ref _threads,       "Non-zero number of threads to enable multithreaded web server, -1 to use all CPU cores (defaults to 0)", "number"}
            options[2] = {"delay",   0, 0, OptionArg.INT64, ref _delay,         "Delay all web responses (defaults to 0)", "milliseconds"}
            options[3] = {"start",   0, 0, OptionArg.NONE,  ref _start_daemon,  "Start as daemon", null}
            options[4] = {"stop",    0, 0, OptionArg.NONE,  ref _stop_daemon,   "Stop daemon", null}
            options[5] = {"restart", 0, 0, OptionArg.NONE,  ref restart_daemon, "Restart daemon", null}
            options[6] = {"status",  0, 0, OptionArg.NONE,  ref _status_daemon, "Show daemon status", null}
            options[7] = {null}
            
            var context = new OptionContext("- Khovsgol Server")
            context.set_summary("Music player server")
            context.set_help_enabled(true)
            context.add_main_entries(options, null)

            try
                context.parse(ref args)
                
                if restart_daemon
                    _stop_daemon = true
                    _start_daemon = true

                if _threads < 0
                    _threads = System.get_n_cpus()
                    
            except e: OptionError
                stderr.printf("%s\n", e.message)
                print "Use '%s --help' to see a full list of available command line options.\n", args[0]
                Posix.exit(1)
    
        prop readonly port: int = 8080
        prop readonly threads: int = 0
        prop readonly delay: int = 0
        
        prop readonly start_daemon: bool
        prop readonly stop_daemon: bool
        prop readonly status_daemon: bool

    class Instance: Object
        construct(args: array of string) raises Nap.Error
            _arguments = new Arguments(args)

            var context = new MainContext()
            _main_loop = new MainLoop(context, false)
            
            if _arguments.start_daemon || _arguments.stop_daemon || _arguments.status_daemon
                Daemonize.handle("khovsgol", _arguments.start_daemon, _arguments.stop_daemon, _main_loop)

            var api = new API()

            var router = new Router()
            
            router.map.add("/1", new AlbumResource1())
            router.map.add("/2", api.albumResource2)
            router.map.add("/3", api.albumResource3)
            router.map.add("/4*", api.albumResource4)
            router.map.add("/test/{first}/hello/{second}/", api.albumResource2)

            Connector._Soup.Server.delay = _arguments.delay * 1000

            _server = new Connector._Soup.Server(_arguments.port, context)
            _server.handler = router

            if _arguments.threads > 0
                try
                    _server.thread_pool = new Nap.ThreadPool(_arguments.threads)
                except e: ThreadError
                    print e.message

            _db = new DB()
            
        def start()
            stdout.printf("Starting Khövsgöl server at port %d, %d threads\n", _arguments.port, _arguments.threads)
            _server.start()
            _main_loop.run()

        _arguments: Arguments
        _server: Nap.Server
        _db: DB
        _main_loop: MainLoop



    class AlbumResource1: DocumentResource
        def override get_json(conversation: Conversation): Json.Object?
            var json = new Json.Object()
            json.set_string_member("a", "hi")
            return json

        def override post_json(conversation: Conversation, entity: Json.Object): Json.Object?
            var json = new Json.Object()
            json.set_object_member("entity", entity)
            return json
       
    class API: Object
        def get_album2(conversation: Conversation)
            conversation.response_text = "Disintegration %s %s".printf(conversation.variables["first"], conversation.variables["second"])

        def get_album3(): string
            return "Holy Bible"

        def get_album4(args: dict of string, string): Json.Object
            var json = new Json.Object()
            json.set_string_member("name", "Bloom")
            json.set_string_member("artist", "Beach House")
            return json

        def set_album4(a: Json.Object): Json.Object
            var json = new Json.Object()
            json.set_string_member("name", a.get_string_member("name"))
            json.set_string_member("artist", "Beach House")
            return json
        
        prop readonly albumResource2: Nap.Resource
        prop readonly albumResource3: Nap.Resource
        prop readonly albumResource4: Nap.Resource
        
        construct()
            _albumResource2 = new DelegatedResource.raw(get_album2, null, null, null)

            var _get_album3 = new GetStringHandler(get_album3)
            _albumResource3 = new DelegatedResource(_get_album3, null, null, null)

            var _get_album4 = new GetJsonArgsHandler(get_album4)
            var _set_album4 = new SetJsonHandler(set_album4)
            _albumResource4 = new DelegatedResource(_get_album4, _set_album4, null, null)

init
    try
        new Khovsgol.Server.Instance(args).start()
    except e: Nap.Error
        stdout.printf("%s\n", e.message)
