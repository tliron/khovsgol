[indent=4]

uses
    Nap
    
namespace Khovsgol.Server

    class Resources
        construct(libraries: Libraries) raises GLib.Error
            _router = new Router()
            router.add_node("/album/{path}/", new DelegatedResource(new GetJsonArgsHandler(get_album), null, null, null))
            router.add_node("/track/{path}/", new DelegatedResource(new GetJsonArgsHandler(get_track), null, null, null))
        
        prop readonly router: Router
        
        def get_album(arguments: Nap.Arguments): Json.Object? raises GLib.Error
            var path = arguments.variables["path"]
            try
                var album = _libraries.get_album(path)
                if album is not null
                    return album.to_json()
            except e: Khovsgol.Error
                pass
            return null

        def get_track(arguments: Nap.Arguments): Json.Object? raises GLib.Error
            var path = arguments.variables["path"]
            try
                var track = _libraries.get_track(path)
                if track is not null
                    return track.to_json()
            except e: Khovsgol.Error
                pass
            return null
        
        _libraries: Libraries

    class AlbumResource1: DocumentResource
        def override get_json(conversation: Conversation): Json.Object?
            var json = new Json.Object()
            json.set_string_member("a", "hi")
            return json

        def override post_json(conversation: Conversation, entity: Json.Object): Json.Object?
            var json = new Json.Object()
            json.set_object_member("entity", entity)
            return json
       
    /*class TAPI: Object
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
            _albumResource4 = new DelegatedResource(_get_album4, _set_album4, null, null)*/
