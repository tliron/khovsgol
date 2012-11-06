[indent=4]

uses
    Nap
    Posix

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
        _albumResource2 = new DelegatedResource(get_album2, null, null, null)

        var _get_album3 = new GetString(get_album3)
        _albumResource4 = new DelegatedResource(_get_album3.delegated, null, null, null, _get_album3)

        var _get_album4 = new GetJsonArgs(get_album4)
        var _set_album4 = new SetJson(set_album4)
        _albumResource4 = new DelegatedResource(_get_album4.delegated, _set_album4.delegated, null, null, _get_album4, _set_album4)
        
class Instance: GLib.Object
    construct(args: array of string)
        if !parse_arguments(args)
            Posix.exit(-1)

        var api = new API()

        var router = new Nap.Router()
        
        router.routes["/1"] = new AlbumResource1()
        router.routes["/2"] = api.albumResource2
        router.routes["/3"] = api.albumResource3
        router.routes["/4*"] = api.albumResource4

        Server.delay = _delay * 1000
        if _threads > 0
            try
                router.thread_pool = new Nap.ThreadPool(_threads)
            except e: ThreadError
                print e.message

        var context = new MainContext()

        _mainLoop = new MainLoop(context, false)
        
        _server = new Nap.Server(8080, context)
        _server.root_handler = router
        
    def start()
        _server.start()
        _mainLoop.run()

    def parse_arguments(args: array of string): bool
        try
            var options = new array of OptionEntry[3]
            options[0] = {"threads", 0, 0, OptionArg.INT, ref _threads, "Enable multithreaded web server", "number"}
            options[1] = {"delay", 0, 0, OptionArg.INT64, ref _delay, "Delay all web requests", "milliseconds"}
            options[2] = {null}
            
            var context = new OptionContext("- Khovsgol")
            context.set_help_enabled(true)
            context.add_main_entries(options, null)
            context.parse(ref args)
        except e: OptionError
            printf("%s\n", e.message)
            printf("Use '%s --help' to see a full list of available command line options.\n", args[0])
            return false
        return true
    
    _server: Nap.Server
    _mainLoop: MainLoop
    _threads: int = 0
    _delay: int = 0
            

init
    new Instance(args).start()
