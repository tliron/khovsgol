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
                    validate_tracks()
                except e: GLib.Error
                    _logger.warning(e.message)
                return _tracks

        prop readonly tracks_json: Json.Array
            get
                try
                    validate_tracks()
                except e: GLib.Error
                    _logger.warning(e.message)
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
                _crucible.libraries.add_transaction(_album_path, 0, paths, false)
                update_version()
            except e: GLib.Error
                _crucible.libraries.rollback()
                raise e
            _crucible.libraries.commit()
            _player.next()
            
        def add(position: int, paths: Json.Array) raises GLib.Error
            _crucible.libraries.begin()
            try
                position = _crucible.libraries.add_transaction(_album_path, position, paths, false)
                update_version()
            except e: GLib.Error
                _crucible.libraries.rollback()
                raise e
            _crucible.libraries.commit()
            if (position != int.MIN) && (_player.play_mode == PlayMode.STOPPED)
                _player.position_in_play_list = position
        
        def remove(positions: Json.Array) raises GLib.Error
            var length = positions.get_length()
            if length == 0
                return
            var last = length - 1
        
            // Reset player if we are removing its current track,
            // or update its position if our removal will affect its number
            var position_in_play_list = _player.position_in_play_list
            var final_position_in_play_list = position_in_play_list
            for var i = 0 to last
                var position = get_int_element_or_min(positions, i)
                if position != int.MIN
                    if position == position_in_play_list
                        final_position_in_play_list = int.MIN
                        break
                    else if position < position_in_play_list
                        final_position_in_play_list--

            _crucible.libraries.begin()
            try
                _crucible.libraries.remove_transaction(_album_path, positions, false)
                update_version()
            except e: GLib.Error
                _crucible.libraries.rollback()
                raise e
            _crucible.libraries.commit()

            if final_position_in_play_list != position_in_play_list
                player.position_in_play_list = final_position_in_play_list

        def move(position: int, positions: Json.Array) raises GLib.Error
            // TODO: player cursor...
            
            _crucible.libraries.begin()
            try
                _crucible.libraries.move_transaction(_album_path, position, positions, false)
                update_version()
            except e: GLib.Error
                _crucible.libraries.rollback()
                raise e
            _crucible.libraries.commit()

        def to_json(): Json.Object
            var json = new Json.Object()
            json.set_string_member("id", _id)
            json.set_int_member("version", (int64) _version)
            json.set_array_member("tracks", tracks_json)
            return json
            
        _album_path: string
        _tracks: list of Track = new list of Track
        _tracks_json: Json.Array?

        def private get_stored_version(): uint64 raises GLib.Error
            var album = _crucible.libraries.get_album(_album_path)
            if (album is not null) && (album.date != int64.MIN) && (album.date != 0)
                return album.date
            else
                _crucible.libraries.begin()
                try
                    update_version()
                except e: GLib.Error
                    _crucible.libraries.rollback()
                    raise e
                _crucible.libraries.commit()
                return _version

        def private update_version() raises GLib.Error
            var timestamp = get_monotonic_time()
            var album = new Album()
            album.path = _album_path
            album.date = timestamp
            _crucible.libraries.save_album(album)
        
        /*
         * If the stored version is newer, refresh our track list.
         */
        def private validate_tracks() raises GLib.Error
            var stored_version = get_stored_version()
            if stored_version > _version
                var tracks = new list of Track
                var args = new IterateForAlbumArgs()
                args.album = _album_path
                args.sort.add("position")
                for var track_pointer in _crucible.libraries.iterate_raw_track_pointers_in_album(args)
                    // We may have the track info in memory already
                    track: Track = null
                    var path = track_pointer.path
                    if path is null
                        _logger.warning("Null track")
                        continue
                    for var t in _tracks
                        if t.path == path
                            track = t.clone()
                            break
                    if track is null
                        track = crucible.libraries.get_track(path)
                        if track is null
                            _logger.warningf("Unknown track: %s", path)
                            continue
                    
                    // Fix track to fit in playlist
                    track.position = track_pointer.position
                    get_album_path_dynamic(track.to_json())
                    tracks.add(track)
                    
                _version = stored_version
                _tracks = tracks
                _tracks_json = null

        _logger: Logging.Logger

        init
            _logger = Logging.get_logger("khovsgol.playlist")
