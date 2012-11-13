[indent=4]

uses
    Nap
    
namespace Khovsgol.Server

    def get_list_of_string(str: string?): list of string
        var strings = new list of string
        if str is not null
            for var s in str.split(",")
                strings.add(s)
        return strings

    class Resources
        construct(libraries: Libraries) raises GLib.Error
            _libraries = libraries
            _router = new Router()
            router.add_node("/libraries/track/{path}/", new DelegatedResource(new GetJsonObjectArgsHandler(get_track), null, null, null))
            router.add_node("/libraries/album/{path}/", new DelegatedResource(new GetJsonObjectArgsHandler(get_album), null, null, null))
            router.add_node("/libraries/albums/", new DelegatedResource(new GetJsonArrayArgsHandler(get_albums), null, null, null))
            router.add_node("/libraries/artists/", new DelegatedResource(new GetJsonArrayArgsHandler(get_artists), null, null, null))
        
        prop readonly router: Router

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
        
        def get_album(arguments: Nap.Arguments): Json.Object? raises GLib.Error
            var path = arguments.variables["path"]
            try
                var album = _libraries.get_album(path)
                if album is not null
                    return album.to_json()
            except e: Khovsgol.Error
                pass
            return null

        def get_albums(arguments: Nap.Arguments): Json.Array? raises GLib.Error
            var libraries = get_list_of_string(arguments.variables["library"])
            var like = arguments.query["like"] == "true"
            var sort = get_list_of_string(arguments.query["sort"])
            var artist = arguments.query["artist"]
            var album_artist = arguments.query["albumartist"]
            var date = arguments.query["date"]
            
            if artist is not null
                var args = new IterateForArtistArgs()
                args.artist = artist
                args.like = like
                args.libraries.add_all(libraries)
                args.sort.add_all(sort)
                return _libraries.iterate_albums_with_artist(args).to_json()
            else if album_artist is not null
                var args = new IterateForArtistArgs()
                args.artist = album_artist
                args.like = like
                args.libraries.add_all(libraries)
                args.sort.add_all(sort)
                return _libraries.iterate_albums_by_artist(args).to_json()
            else if date is not null
                var args = new IterateForDateArgs()
                args.date = int.parse(date)
                args.like = like
                args.libraries.add_all(libraries)
                args.sort.add_all(sort)
                return _libraries.iterate_albums_at(args).to_json()
            else
                var args = new IterateAlbumsArgs()
                args.libraries.add_all(libraries)
                args.sort.add_all(sort)
                var compilation_type_str = arguments.query["compilation_type"]
                if compilation_type_str is not null
                    args.compilation_type = int.parse(compilation_type_str)

                return _libraries.iterate_albums(args).to_json()

        def get_artists(arguments: Nap.Arguments): Json.Array? raises GLib.Error
            var libraries = get_list_of_string(arguments.variables["library"])
            var album_artist = arguments.query["album"] == "true"
            var sort = get_list_of_string(arguments.query["sort"])
            var args = new IterateArtistsArgs()
            args.libraries.add_all(libraries)
            args.album_artist = album_artist
            args.sort.add_all(sort)
            return _libraries.iterate_artists(args).to_json()

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
