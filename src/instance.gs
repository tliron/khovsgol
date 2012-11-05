[indent=4]

// apt-get install libgee-dev, valac --pkg gee-1.0

uses
    Json // apt-get install libjson-glib-dev, valac --pkg json-glib-1.0

class MyResource: Nap.DocumentResource
    def override get_json(conversation: Nap.Conversation): Json.Object
        var json = new Json.Object()
        json.set_string_member("a", "hi")
        return json

init
    var router = new Nap.Router()
    router.routes["/"] = new MyResource()

    try
        router.thread_pool = new Nap.ThreadPool(10)
    except e: ThreadError
        print e.message

    var context = new MainContext()
    var server = new Nap.Server(8080, context)
    server.handler = router
    server.start()
    new MainLoop(context, false).run()
