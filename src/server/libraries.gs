[indent=4]

uses
    JsonUtil

namespace Khovsgol.Server

    const SEPARATOR: string = "/"

    class abstract Libraries: Object implements HasJsonArray
        prop crucible: Crucible
        prop configuration: Configuration
    
        def virtual initialize() raises GLib.Error
            for var name in _configuration.libraries
                var library = _crucible.create_library()
                library.name = name
                for var path in _configuration.get_directories(name)
                    var directory = _crucible.create_directory()
                    directory.path = path
                    directory.library = library
                    library.add_directory(directory, false)
                _libraries[name] = library
    
        def get_library(name: string): Library?
            return _libraries[name]

        def add_library(library: Library)
            _libraries[library.name] = library
            _configuration.add_library(library.name)
            _configuration.save()

        def remove_library(name: string)
            _libraries.unset(name)
            _configuration.delete_library(name)
            _configuration.save()

        def abstract begin() raises GLib.Error
        def abstract commit() raises GLib.Error
        def abstract rollback() raises GLib.Error
        def abstract write_lock()
        def abstract write_unlock()
        
        // Tracks
        def abstract get_track(path: string): Track? raises GLib.Error
        def abstract save_track(track: Track) raises GLib.Error
        def abstract delete_track(path: string) raises GLib.Error
        
        // Track pointers
        def abstract get_track_pointer(album: string, position: int): TrackPointer? raises GLib.Error
        def abstract save_track_pointer(track_pointer: TrackPointer) raises GLib.Error
        def abstract delete_track_pointer(album: string, position: int) raises GLib.Error
        def abstract delete_track_pointers(album: string) raises GLib.Error
        def abstract move_track_pointers(album: string, delta: int, from_position: int = int.MIN) raises GLib.Error
        
        // Albums
        def abstract get_album(path: string): Album? raises GLib.Error
        def abstract save_album(album: Album) raises GLib.Error
        def abstract delete_album(path: string) raises GLib.Error

        // Iterate tracks
        def abstract iterate_tracks(args: IterateTracksArgs): IterableOfTrack raises GLib.Error
        def abstract iterate_tracks_in_album(args: IterateForAlbumArgs): IterableOfTrack raises GLib.Error
        def abstract iterate_tracks_by_artist(args: IterateForArtistArgs): IterableOfTrack raises GLib.Error
        def abstract iterate_track_paths(path: string): IterableOfString raises GLib.Error
        
        // Iterate track pointers
        def abstract iterate_raw_track_pointers_in_album(args: IterateForAlbumArgs): IterableOfTrackPointer raises GLib.Error
        def abstract iterate_track_pointers_in_album(args: IterateForAlbumArgs): IterableOfTrack raises GLib.Error
        def abstract iterate_track_pointers(args: IterateTracksArgs): IterableOfTrack raises GLib.Error
        
        // Iterate albums
        def abstract iterate_albums(args: IterateAlbumsArgs): IterableOfAlbum raises GLib.Error
        def abstract iterate_album_paths(path: string): IterableOfString raises GLib.Error
        def abstract iterate_albums_with_artist(args: IterateForArtistArgs): IterableOfAlbum raises GLib.Error
        def abstract iterate_albums_by_artist(args: IterateForArtistArgs): IterableOfAlbum raises GLib.Error
        def abstract iterate_albums_at(args: IterateForDateArgs): IterableOfAlbum raises GLib.Error
        
        // Iterate artists
        def abstract iterate_artists(args: IterateByAlbumsOrTracksArgs): IterableOfArtist raises GLib.Error

        // Iterate dates
        def abstract iterate_dates(args: IterateByAlbumsOrTracksArgs): IterableOfInt raises GLib.Error
        
        // Timestamps
        def abstract get_timestamp(path: string): int64 raises GLib.Error
        def abstract set_timestamp(path: string, timestamp: int64) raises GLib.Error
        def abstract delete_timestamp(path: string) raises GLib.Error
        
        def add_to_album(album_path: string, destination: int, paths: Json.Array, ref stable_position: int, transaction: bool = true): int raises GLib.Error
            var length = paths.get_length()
            if length == 0
                return destination
            
            if destination == int.MIN
                // Set destination position at end of current track pointers
                destination = 0
                var args = new IterateForAlbumArgs()
                args.album = album_path
                for var track_pointer in iterate_raw_track_pointers_in_album(args)
                    var position = track_pointer.position
                    if position > destination
                        destination = position
                destination++

            if transaction
                begin()
            try
                // Make room by moving the track pointers after us forward
                move_track_pointers(album_path, (int) length, destination)
                
                // Add the track pointers at the destination
                var position = destination
                for var path in new JsonStrings(paths)
                    var track_pointer = new TrackPointer()
                    track_pointer.path = path
                    track_pointer.album = album_path
                    track_pointer.position = position++
                    save_track_pointer(track_pointer)
            except e: GLib.Error
                if transaction
                    rollback()
                raise e
            if transaction
                commit()

            if (stable_position != int.MIN) and (destination <= stable_position)
                stable_position += (int) length
            
            return destination
        
        /*
         * Note: we will change the positions array!
         */
        def remove_from_album(album_path: string, positions: Json.Array, ref stable_position: int, transaction: bool = true) raises GLib.Error
            var length = positions.get_length()
            if length == 0
                return
            var last = length - 1

            if transaction
                begin()
            try
                for var i = 0 to last
                    var position = get_int_element_or_min(positions, i)
                    if position != int.MIN
                        delete_track_pointer(album_path, position)
                
                        // Move positions back for all remaining track pointers
                        move_track_pointers(album_path, -1, position + 1)
                    
                        // We need to also move back positions in the array
                        if i < last
                            for var ii = (i + 1) to last
                                var p = get_int_element_or_min(positions, ii)
                                if p > position
                                    positions.get_element(ii).set_int(p - 1)
                        
                        // Stable position might be affected
                        if stable_position != int.MIN
                            if position == stable_position
                                stable_position = int.MIN
                            else if position < stable_position
                                stable_position--
            except e: GLib.Error
                if transaction
                    rollback()
                raise e
            if transaction
                commit()
        
        /*
         * Note: we will change the positions array!
         */
        def move_in_album(album_path: string, destination: int, positions: Json.Array, ref stable_position: int, transaction: bool = true): int raises GLib.Error
            var length = positions.get_length()
            if length == 0
                return destination
            var last = length - 1

            if destination == int.MIN
                // Set destination position at end of current track pointers
                destination = 0
                var args = new IterateForAlbumArgs()
                args.album = album_path
                for var track_pointer in iterate_raw_track_pointers_in_album(args)
                    var position = track_pointer.position
                    if position > destination
                        destination = position
                destination++
                
            if transaction
                begin()
            try
                var paths = new list of string
                for var i = 0 to last
                    var position = get_int_element_or_min(positions, i)
                    if position != int.MIN
                        var track_pointer = get_track_pointer(album_path, position)
                        paths.add(track_pointer.path)
                        delete_track_pointer(album_path, position)
                
                        // Move positions back for all remaining track pointers
                        move_track_pointers(album_path, -1, position + 1)
                    
                        // We need to also move back positions in the array
                        if i < last
                            for var ii = (i + 1) to last
                                var p = get_int_element_or_min(positions, ii)
                                if p > position
                                    positions.get_element(ii).set_int(p - 1)
                                
                        // We need to also move back the destination position
                        if position < destination
                            destination--

                        // Stable position might be affected
                        if stable_position != int.MIN
                            if position == stable_position
                                stable_position = destination
                            else if position < stable_position
                                stable_position--

                // Make room by moving the remaining track pointers forward
                move_track_pointers(album_path, paths.size, destination)
                
                // Add the removed track pointers at the destination
                var position = destination
                for var path in paths
                    var track_pointer = new TrackPointer()
                    track_pointer.path = path
                    track_pointer.album = album_path
                    track_pointer.position = position
                    save_track_pointer(track_pointer)

                    // Stable position might be affected
                    if (stable_position != int.MIN) and (position < stable_position)
                        stable_position++
                    
                    position++
            except e: GLib.Error
                if transaction
                    rollback()
                raise e
            if transaction
                commit()
            
            return destination

        def to_json(): Json.Array
            return to_object_array(_libraries.values)
            
        _libraries: dict of string, Library = new dict of string, Library
    
    class Library: Object implements HasJsonObject
        prop crucible: Crucible
        prop configuration: Configuration
        prop name: string
        
        def get_directory(name: string): Directory?
            return _directories[name]

        def add_directory(directory: Directory, save: bool = true)
            var path = directory.path
            _directories[path] = directory
            if save
                _configuration.add_directory(_name, path)
                _configuration.save()

        def remove_directory(path: string)
            _directories.unset(path)
            _configuration.delete_directory(_name, path)
            _configuration.save()

        def scan_all()
            for directory in _directories.values
                if not directory.is_scanning
                    directory.scan()

        def abort_all()
            for directory in _directories.values
                if directory.is_scanning
                    directory.abort()
    
        def to_json(): Json.Object
            var json = new Json.Object()
            set_string_member_not_null(json, "name", _name)
            json.set_array_member("directories", to_object_array(_directories.values))
            return json

        _directories: dict of string, Directory = new dict of string, Directory

    class IterateForDateArgs
        prop date: int = int.MIN
        prop like: bool = false
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string
    
    class IterateTracksArgs
        prop title_like: string? = null
        prop artist_like: string? = null
        prop album_like: string? = null
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string
        
    class IterateForAlbumArgs
        prop album: string? = null
        prop sort: list of string = new list of string

    class IterateForArtistArgs
        prop artist: string? = null
        prop like: bool = false
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string
    
    class IterateAlbumsArgs
        prop album_type: AlbumType = AlbumType.ANY
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string

    class IterateByAlbumsOrTracksArgs
        prop album_artist: bool = true
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string
