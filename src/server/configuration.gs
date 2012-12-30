[indent=4]

namespace Khovsgol.Server

    class Configuration: Object implements Khovsgol.Configuration
        construct() raises KeyFileError
            _file = "%s/.khovsgol/server.conf".printf(Environment.get_home_dir())
            _key_file = new KeyFile()
            try
                _key_file.load_from_file(_file, KeyFileFlags.KEEP_COMMENTS)
            except e: FileError
                _logger.message(e.message)
        
        prop threads: uint
            get
                if _threads_override != int.MIN
                    return _threads_override
            
                try
                    return _key_file.get_integer("server", "threads")
                except e: KeyFileError
                    return 0
            set
                _key_file.set_integer("server", "threads", (int) value)
        
        prop threads_override: int = int.MIN

        prop port: uint
            get
                if _port_override != int.MIN
                    return _port_override
            
                try
                    return _key_file.get_integer("server", "port")
                except e: KeyFileError
                    return 8185
            set
                _key_file.set_integer("server", "port", (int) value)
        
        prop port_override: int = int.MIN
        
        prop delay: uint64
            get
                if _delay_override != int64.MIN
                    return _delay_override
            
                try
                    return _key_file.get_uint64("server", "delay")
                except e: KeyFileError
                    return 0
            set
                _key_file.set_uint64("server", "delay", value)
        
        prop delay_override: int64 = int64.MIN
        
        /*
         * Whether to advertise the server on Avahi.
         */
        prop advertise: bool
            get
                try
                    return _key_file.get_boolean("server", "advertise")
                except e: KeyFileError
                    return true
            set
                _key_file.set_boolean("server", "advertise", value)
        
        /*
         * Names of libraries.
         */
        prop readonly libraries: list of string
            get
                if _libraries.is_empty
                    for group in _key_file.get_groups()
                        if group.has_prefix("library.")
                            var library = group.substring(8)
                            _libraries.add(library)
                return _libraries
        
        def add_library(library: string)
            _key_file.set_string_list("library." + library, "directories", new array of string[0])
        
        def delete_library(library: string)
            try
                _key_file.remove_group("library." + library)
            except e: KeyFileError
                pass

        /*
         * Directory paths for a library.
         */
        def get_directories(library: string): list of string
            var directories = new list of string
            try
                for var directory in _key_file.get_string_list("library." + library, "directories")
                    directories.add(directory)
            except e: KeyFileError
                pass
            return directories

        def add_directory(library: string, directory: string)
            var group = "library." + library
            directories: array of string
            try
                directories = _key_file.get_string_list(group, "directories")
            except e: KeyFileError
                directories = new array of string[0]
            var new_directories = new array of string[directories.length + 1]
            var i = 0
            for var e in directories
                new_directories[i++] = e
            new_directories[i] = directory
            _key_file.set_string_list(group, "directories", new_directories)

        def delete_directory(library: string, directory: string)
            try
                var group = "library." + library
                var directories = _key_file.get_string_list(group, "directories")
                var new_directories = new array of string[directories.length - 1]
                var i = 0
                found: bool = false
                for var e in directories
                    if not found and (e == directory)
                        found = true
                        continue
                    new_directories[i++] = e
                _key_file.set_string_list(group, "directories", new_directories)
            except e: KeyFileError
                pass
        
        /*
         * Names of players.
         */
        prop readonly players: list of string
            get
                if _players.is_empty
                    for group in _key_file.get_groups()
                        if group.has_prefix("player.")
                            var player = group.substring(7)
                            _players.add(player)
                return _players
        
        def add_player(player: string)
            _key_file.set_string_list("player." + player, "plugs", new array of string[0])
        
        def delete_player(player: string)
            try
                _key_file.remove_group("player." + player)
            except e: KeyFileError
                pass
                
        /*
         * Player's position in playlist.
         */
        def get_position_in_playlist(player: string): int
            try
                return _key_file.get_integer("player." + player, "position-in-playlist")
            except e: KeyFileError
                return int.MIN

        def set_position_in_playlist(player: string, position_in_playlist: int)
            if position_in_playlist != int.MIN
                _key_file.set_integer("player." + player, "position-in-playlist", position_in_playlist)
            else
                try
                    _key_file.remove_key("player." + player, "position-in-playlist")
                except e: KeyFileError
                    pass

        /*
         * Player's volume.
         */
        def get_volume(player: string): double
            try
                return _key_file.get_double("player." + player, "volume")
            except e: KeyFileError
                return double.MIN

        def set_volume(player: string, volume: double)
            if volume != double.MIN
                _key_file.set_double("player." + player, "volume", volume)
            else
                try
                    _key_file.remove_key("player." + player, "volume")
                except e: KeyFileError
                    pass

        /*
         * Player's play mode.
         */
        def get_play_mode(player: string): string?
            try
                return _key_file.get_string("player." + player, "play-mode")
            except e: KeyFileError
                return null

        def set_play_mode(player: string, play_mode: string?)
            if play_mode is not null
                _key_file.set_string("player." + player, "play-mode", play_mode)
            else
                try
                    _key_file.remove_key("player." + player, "play-mode")
                except e: KeyFileError
                    pass

        /*
         * Plugs for a player.
         */
        def get_plugs(player: string): list of string
            var plugs = new list of string
            try
                for var plug in _key_file.get_string_list("player." + player, "plugs")
                    plugs.add(plug)
            except e: KeyFileError
                pass
            return plugs

        def add_plug(player: string, plug: string)
            var group = "player." + player
            plugs: array of string
            try
                plugs = _key_file.get_string_list(group, "plugs")
            except e: KeyFileError
                plugs = new array of string[0]
            var new_plugs = new array of string[plugs.length + 1]
            var i = 0
            for var e in plugs
                new_plugs[i++] = e
            new_plugs[i] = plug
            _key_file.set_string_list(group, "plugs", new_plugs)

        def delete_plug(player: string, plug: string)
            try
                var group = "player." + player
                var plugs = _key_file.get_string_list(group, "plugs")
                var new_plugs = new array of string[plugs.length - 1]
                var i = 0
                found: bool = false
                for var e in plugs
                    if not found and (e == plug)
                        found = true
                        continue
                    new_plugs[i++] = e
                _key_file.set_string_list(group, "plugs", new_plugs)
            except e: KeyFileError
                pass

        /*
         * Saves the configuration.
         */
        def save(): bool
            var data = _key_file.to_data()
            try
                var dir = File.new_for_path(_file).get_parent()
                if not dir.query_exists() or (dir.query_info(FileAttribute.STANDARD_TYPE, FileQueryInfoFlags.NONE).get_file_type() != FileType.DIRECTORY)
                    dir.make_directory_with_parents()
                return FileUtils.set_data(_file, data.data)
            except e: GLib.Error
                _logger.exception(e)
                return false
    
        _file: string
        _key_file: KeyFile
        _libraries: list of string = new list of string
        _players: list of string = new list of string
        
        _logger: static Logging.Logger

        init
            _logger = Logging.get_logger("khovsgol.configuration")
