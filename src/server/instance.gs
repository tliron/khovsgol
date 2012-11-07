[indent=4]

uses
    Nap
    Posix
    
namespace Khovsgol
            
    class ServerInstance: GLib.Object
        construct(args: array of string)
            if !parse_arguments(args)
                exit(-1)

            var api = new API()

            var router = new Router()
            
            router.routes.add("/1", new AlbumResource1())
            router.routes.add("/2", api.albumResource2)
            router.routes.add("/3", api.albumResource3)
            router.routes.add("/4*", api.albumResource4)

            SoupServer.delay = _delay * 1000

            var context = new MainContext()

            _server = new SoupServer(_port, context)
            _server.handler = router

            if _threads < 0
                _threads = System.get_n_cpus()
            if _threads > 0
                try
                    _server.thread_pool = new Nap.ThreadPool(_threads)
                except e: ThreadError
                    print e.message

            _mainLoop = new MainLoop(context, false)
            
            _db = new DB()
            
        def start()
            printf("Starting Khövsgöl server at port %d, %d threads\n", _port, _threads)
            _server.start()
            _mainLoop.run()

        def parse_arguments(args: array of string): bool
            try
                var options = new array of OptionEntry[4]
                options[0] = {"port", 0, 0, OptionArg.INT, ref _port, "Web server TCP port (defaults to 8080)", "number"}
                options[1] = {"threads", 0, 0, OptionArg.INT, ref _threads, "Non-zero number of threads to enable multithreaded web server, -1 to use all CPU cores (defaults to 0)", "number"}
                options[2] = {"delay", 0, 0, OptionArg.INT64, ref _delay, "Delay all web responses (defaults to 0)", "milliseconds"}
                options[3] = {null}
                
                var context = new OptionContext("- Khovsgol Daemon")
                context.set_summary("Music player daemon")
                context.set_help_enabled(true)
                context.add_main_entries(options, null)
                context.parse(ref args)
            except e: OptionError
                printf("%s\n", e.message)
                printf("Use '%s --help' to see a full list of available command line options.\n", args[0])
                return false
            return true
        
        _server: Server
        _db: DB
        _mainLoop: MainLoop
        _port: int = 8080
        _threads: int = 0
        _delay: int = 0

    class AlbumResource1: DocumentResource
        def override get_json(conversation: Conversation): Json.Object?
            var json = new Json.Object()
            json.set_string_member("a", "hi")
            return json

        def override post_json(conversation: Conversation, entity: Json.Object): Json.Object?
            var json = new Json.Object()
            json.set_object_member("entity", entity)
            return json
       
    class API: GLib.Object
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
