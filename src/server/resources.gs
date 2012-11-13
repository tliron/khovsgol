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

    def get_list_of_libraries(arguments: Nap.Arguments): list of string
        var library = arguments.variables["library"]
        if library is not null
            var libraries = new list of string
            libraries.add(library)
            return libraries
        else
            return get_list_of_string(arguments.query["library"])

    class Resources
        construct(libraries: Libraries) raises GLib.Error
            _libraries = libraries
            _router = new Router()
            
            router.add_node("/libraries/track/{path}/", new DelegatedResource(new GetJsonObjectArgsHandler(get_track), null, null, null))
            router.add_node("/libraries/album/{path}/", new DelegatedResource(new GetJsonObjectArgsHandler(get_album), null, null, null))

            router.add_node("/libraries/tracks/", new DelegatedResource(new GetJsonArrayArgsHandler(get_tracks), null, null, null))
            router.add_node("/libraries/albums/", new DelegatedResource(new GetJsonArrayArgsHandler(get_albums), null, null, null))
            router.add_node("/libraries/artists/", new DelegatedResource(new GetJsonArrayArgsHandler(get_artists), null, null, null))
            router.add_node("/libraries/dates/", new DelegatedResource(new GetJsonArrayArgsHandler(get_dates), null, null, null))
            
            router.add_node("/library/{library}/tracks/", new DelegatedResource(new GetJsonArrayArgsHandler(get_tracks), null, null, null))
            router.add_node("/library/{library}/albums/", new DelegatedResource(new GetJsonArrayArgsHandler(get_albums), null, null, null))
            router.add_node("/library/{library}/artists/", new DelegatedResource(new GetJsonArrayArgsHandler(get_artists), null, null, null))
            router.add_node("/library/{library}/dates/", new DelegatedResource(new GetJsonArrayArgsHandler(get_dates), null, null, null))
        
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
        
        def get_album(arguments: Nap.Arguments): Json.Object? raises GLib.Error
            var path = arguments.variables["path"]
            try
                var album = _libraries.get_album(path)
                if album is not null
                    return album.to_json()
            except e: Khovsgol.Error
                pass
            return null
        
        def get_tracks(arguments: Nap.Arguments): Json.Array? raises GLib.Error
            var artist = arguments.query["artist"]
            if artist is not null
                var args = new IterateForArtistArgs()
                args.artist = artist
                args.like = arguments.query["like"] == "true"
                args.libraries.add_all(get_list_of_libraries(arguments))
                args.sort.add_all(get_list_of_string(arguments.query["sort"]))
                var iterator = _libraries.iterate_tracks_by_artist(args)
                iterator.get_album_path = get_album_path_dynamic
                return iterator.to_json()

            var album = arguments.query["album"]
            if album is not null
                var args = new IterateForAlbumArgs()
                args.album = album
                args.sort.add_all(get_list_of_string(arguments.query["sort"]))
                iterator: TrackIterator
                if album.has_prefix("*")
                    // Custom compilation magic prefix
                    iterator = _libraries.iterate_track_pointers_in_album(args)
                else
                    iterator = _libraries.iterate_tracks_in_album(args)
                
                var album_path_constant = new AlbumPathConstant(album)
                iterator.get_album_path = album_path_constant.get_album_path
                return iterator.to_json()
            
            var args = new IterateTracksArgs()
            args.title_like = arguments.query["titlelike"]
            args.artist_like = arguments.query["artistlike"]
            args.album_like = arguments.query["albumlike"]
            args.libraries.add_all(get_list_of_libraries(arguments))
            args.sort.add_all(get_list_of_string(arguments.query["sort"]))
            var compilation = arguments.query["compilation"]
            compilation_type: int = -1
            if compilation is not null
                compilation_type = int.parse(compilation)
            // Note: the 'compilation=1' handling is identical to 'compilation=0'
            // Note: custom compilation tracks are alwyas put *after* regular tracks, whatever the sort order
            json: Json.Array = null
            if compilation_type < 2
                var iterator = _libraries.iterate_tracks(args)
                iterator.get_album_path = get_album_path_dynamic
                json = iterator.to_json()
            if (compilation_type == -1) || (compilation_type == 2)
                var json2 = _libraries.iterate_track_pointers(args).to_json()
                if json is null
                    json = json2
                else
                    JSON.array_add_all(json, json2)
            
            return json

        def get_albums(arguments: Nap.Arguments): Json.Array? raises GLib.Error
            var artist = arguments.query["artist"]
            if artist is not null
                var args = new IterateForArtistArgs()
                args.artist = artist
                args.like = arguments.query["like"] == "true"
                args.libraries.add_all(get_list_of_libraries(arguments))
                args.sort.add_all(get_list_of_string(arguments.query["sort"]))
                return _libraries.iterate_albums_with_artist(args).to_json()
                
            var album_artist = arguments.query["albumartist"]
            if album_artist is not null
                var args = new IterateForArtistArgs()
                args.artist = album_artist
                args.like = arguments.query["like"] == "true"
                args.libraries.add_all(get_list_of_libraries(arguments))
                args.sort.add_all(get_list_of_string(arguments.query["sort"]))
                return _libraries.iterate_albums_by_artist(args).to_json()
            
            var date = arguments.query["date"]
            if date is not null
                var args = new IterateForDateArgs()
                args.date = int.parse(date)
                args.like = arguments.query["like"] == "true"
                args.libraries.add_all(get_list_of_libraries(arguments))
                args.sort.add_all(get_list_of_string(arguments.query["sort"]))
                return _libraries.iterate_albums_at(args).to_json()
            
            var args = new IterateAlbumsArgs()
            args.libraries.add_all(get_list_of_libraries(arguments))
            args.sort.add_all(get_list_of_string(arguments.query["sort"]))
            var compilation = arguments.query["compilation"]
            if compilation is not null
                args.compilation_type = int.parse(compilation)
            return _libraries.iterate_albums(args).to_json()

        def get_artists(arguments: Nap.Arguments): Json.Array? raises GLib.Error
            var args = new IterateByAlbumsOrTracksArgs()
            args.libraries.add_all(get_list_of_libraries(arguments))
            args.album_artist = arguments.query["album"] == "true"
            args.sort.add_all(get_list_of_string(arguments.query["sort"]))
            return _libraries.iterate_artists(args).to_json()

        def get_dates(arguments: Nap.Arguments): Json.Array? raises GLib.Error
            var args = new IterateByAlbumsOrTracksArgs()
            args.libraries.add_all(get_list_of_libraries(arguments))
            args.album_artist = arguments.query["album"] == "true"
            args.sort.add_all(get_list_of_string(arguments.query["sort"]))
            return _libraries.iterate_dates(args).to_json()
        
        _libraries: Libraries

        def private get_album_path_dynamic(track: Track): string
            var path = File.new_for_path(track.path)
            return path.get_parent().get_path()

        class private AlbumPathConstant
            construct(album_path: string)
                _album_path = album_path
        
            def get_album_path(track: Track): string
                return _album_path
                
            _album_path: string

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
