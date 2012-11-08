[indent=4]

uses
    Nap
    
namespace Khovsgol

    class ServerInstance: Object
        construct(args: array of string)
            if !parse_arguments(args)
                Posix.exit(1)

            var context = new MainContext()
            _main_loop = new MainLoop(context, false)
            Daemonize.handle("khovsgol", _start_daemon, _stop_daemon, _main_loop)

            var api = new API()

            var router = new Router()
            
            router.routes.add("/1", new AlbumResource1())
            router.routes.add("/2", api.albumResource2)
            router.routes.add("/3", api.albumResource3)
            router.routes.add("/4*", api.albumResource4)

            SoupServer.delay = _delay * 1000

            _server = new SoupServer(_port, context)
            _server.handler = router

            if _threads < 0
                _threads = System.get_n_cpus()
            if _threads > 0
                try
                    _server.thread_pool = new Nap.ThreadPool(_threads)
                except e: ThreadError
                    print e.message

            _db = new DB()
            
        def start()
            stdout.printf("Starting Khövsgöl server at port %d, %d threads\n", _port, _threads)
            _server.start()
            _main_loop.run()

        def parse_arguments(args: array of string): bool
            try
                restart_daemon: bool = false
                var options = new array of OptionEntry[8]
                options[0] = {"port", 0, 0, OptionArg.INT, ref _port, "Web server TCP port (defaults to 8080)", "number"}
                options[1] = {"threads", 0, 0, OptionArg.INT, ref _threads, "Non-zero number of threads to enable multithreaded web server, -1 to use all CPU cores (defaults to 0)", "number"}
                options[2] = {"delay", 0, 0, OptionArg.INT64, ref _delay, "Delay all web responses (defaults to 0)", "milliseconds"}
                options[3] = {"start", 0, 0, OptionArg.NONE, ref _start_daemon, "Start as daemon", null}
                options[4] = {"stop", 0, 0, OptionArg.NONE, ref _stop_daemon, "Stop daemon", null}
                options[5] = {"restart", 0, 0, OptionArg.NONE, ref restart_daemon, "Restart daemon", null}
                options[6] = {"status", 0, 0, OptionArg.NONE, ref _status_daemon, "Show daemon status", null}
                options[7] = {null}
                
                var context = new OptionContext("- Khovsgol Server")
                context.set_summary("Music player server")
                context.set_help_enabled(true)
                context.add_main_entries(options, null)
                context.parse(ref args)
                
                if restart_daemon
                    _stop_daemon = true
                    _start_daemon = true
            except e: OptionError
                stderr.printf("%s\n", e.message)
                stdout.printf("Use '%s --help' to see a full list of available command line options.\n", args[0])
                return false
            return true
        
        _port: int = 8080
        _threads: int = 0
        _delay: int = 0
        
        _start_daemon: bool
        _stop_daemon: bool
        _status_daemon: bool

        _server: Server
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
            conversation.response_text = "Disintegration"

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
    new Khovsgol.ServerInstance(args).start()
