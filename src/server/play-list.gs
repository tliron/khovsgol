[indent=4]

uses
    JsonUtil

namespace Khovsgol.Server

    class PlayList: Object implements HasJsonObject
        prop crucible: Crucible
        prop player: Player
        prop id: string
        prop version: uint64 = uint64.MIN

        prop readonly tracks: list of Track
            get
                try
                    validate()
                except e: GLib.Error
                    _logger.exception(e)
                return _tracks

        prop readonly tracks_json: Json.Array
            get
                try
                    validate()
                except e: GLib.Error
                    _logger.exception(e)
                if _tracks_json is null
                    _tracks_json = to_object_array(_tracks)
                return _tracks_json

        def initialize() raises GLib.Error
            if _album_path is null
                // Magic prefix for playlist "albums"
                _album_path = "?" + player.name
                _id = DBus.generate_guid()
        
        def set_paths(paths: Json.Array) raises GLib.Error
            _player.position_in_play_list = int.MIN
            
            _crucible.libraries.begin()
            try
                _crucible.libraries.delete_track_pointers(_album_path)
                stable_position: int = int.MIN
                _crucible.libraries.add_transaction(_album_path, 0, paths, ref stable_position, false)
                update_stored_version()
            except e: GLib.Error
                _crucible.libraries.rollback()
                raise e
            _crucible.libraries.commit()
            
            _player.next()
            
        def add(destination: int, paths: Json.Array) raises GLib.Error
            var length = paths.get_length()
            if length == 0
                return

            var position_in_play_list = _player.position_in_play_list
            var final_position_in_play_list = position_in_play_list

            _crucible.libraries.begin()
            try
                destination = _crucible.libraries.add_transaction(_album_path, destination, paths, ref final_position_in_play_list, false)
                update_stored_version()
            except e: GLib.Error
                _crucible.libraries.rollback()
                raise e
            _crucible.libraries.commit()

            // If we're stopped, play first track we added
            if destination != int.MIN
                if _player.play_mode == PlayMode.STOPPED
                    _player.position_in_play_list = destination
                    return

            if final_position_in_play_list != position_in_play_list
                _player.position_in_play_list = final_position_in_play_list
        
        def remove(positions: Json.Array) raises GLib.Error
            var length = positions.get_length()
            if length == 0
                return
            
            var position_in_play_list = _player.position_in_play_list
            var final_position_in_play_list = position_in_play_list

            _crucible.libraries.begin()
            try
                _crucible.libraries.remove_transaction(_album_path, positions, ref final_position_in_play_list, false)
                update_stored_version()
            except e: GLib.Error
                _crucible.libraries.rollback()
                raise e
            _crucible.libraries.commit()

            if final_position_in_play_list != position_in_play_list
                _player.position_in_play_list = final_position_in_play_list

        def move(destination: int, positions: Json.Array) raises GLib.Error
            var length = positions.get_length()
            if length == 0
                return

            var position_in_play_list = _player.position_in_play_list
            var final_position_in_play_list = position_in_play_list
        
            _crucible.libraries.begin()
            try
                destination = _crucible.libraries.move_transaction(_album_path, destination, positions, ref final_position_in_play_list, false)
                update_stored_version()
            except e: GLib.Error
                _crucible.libraries.rollback()
                raise e
            _crucible.libraries.commit()

            if final_position_in_play_list != position_in_play_list
                _player.position_in_play_list = final_position_in_play_list

        def to_json(): Json.Object
            try
                validate()
            except e: GLib.Error
                _logger.exception(e)
            if _tracks_json is null
                _tracks_json = to_object_array(_tracks)
            if _albums_json is null
                _albums_json = to_object_array(_albums)

            var json = new Json.Object()
            json.set_string_member("id", _id)
            json.set_int_member("version", (int64) _version)
            json.set_array_member("tracks", _tracks_json)
            json.set_array_member("albums", _albums_json)
            return json
            
        _album_path: string
        _tracks: list of Track = new list of Track
        _tracks_json: Json.Array?
        _albums: list of Album = new list of Album
        _albums_json: Json.Array?

        def private update_stored_version(): uint64 raises GLib.Error
            var version = get_monotonic_time()
            var album = new Album()
            album.path = _album_path
            album.date = version
            album.album_type = AlbumType.OTHER
            _crucible.libraries.save_album(album)
            return version

        def private get_stored_version(): uint64 raises GLib.Error
            var album = _crucible.libraries.get_album(_album_path)
            if (album is not null) and (album.date != int64.MIN) and (album.date != 0)
                return album.date
            else
                return update_stored_version()

        /*
         * If the stored version is newer, refresh our track list.
         */
        def private validate() raises GLib.Error
            var libraries = _crucible.libraries
            
            // We are locking to make sure the play list does not change
            // while we are reading it
            libraries.write_lock()
            try
                var stored_version = get_stored_version()
                if stored_version > _version
                    var tracks = new list of Track
                    var albums = new list of Album

                    last_album_path: string? = null

                    var args = new IterateForAlbumArgs()
                    args.album = _album_path
                    args.sort.add("position")
                    for var track_pointer in libraries.iterate_raw_track_pointers_in_album(args)
                        track: Track? = null

                        var path = track_pointer.path
                        if path is null
                            _logger.warning("Null track pointer")
                            continue

                        // We may have the track info in memory already
                        for var t in _tracks
                            if t.path == path
                                track = t.clone()
                                break
                        
                        if track is null
                            // Get track
                            track = libraries.get_track(path)
                            if track is null
                                _logger.warningf("Unknown track: %s", path)
                                continue
                        
                        // Fit track in playlist
                        track.position_in_play_list = track_pointer.position
                        get_album_path_dynamic(track.to_json())

                        tracks.add(track)

                        var album_path = track.album_path
                        if (album_path is not null) and (album_path != last_album_path)
                            last_album_path = album_path

                            // We may have the album added already
                            for var a in albums
                                if a.path == album_path
                                    continue
                            
                            album: Album? = null

                            // We may have the album info in memory already
                            for var a in _albums
                                if a.path == album_path
                                    album = a
                                    break
                            
                            if album is null
                                // Get album
                                album = libraries.get_album(album_path)
                            
                            if album is not null
                                albums.add(album)
                        
                    _version = stored_version
                    _tracks = tracks
                    _albums = albums
                    _tracks_json = null
                    _albums_json = null
            finally
                libraries.write_unlock()

        _logger: Logging.Logger

        init
            _logger = Logging.get_logger("khovsgol.playlist")
