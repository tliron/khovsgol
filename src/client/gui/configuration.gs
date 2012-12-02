[indent=4]

namespace Khovsgol.GUI

    class Configuration: Object
        construct() raises KeyFileError
            _file = "%s/.khovsgol/client.conf".printf(Environment.get_home_dir())
            _key_file = new KeyFile()
            try
                _key_file.load_from_file(_file, KeyFileFlags.KEEP_COMMENTS)
            except e: FileError
                _logger.message(e.message)
        
        prop x: int
            get
                try
                    return _key_file.get_integer("ui", "x")
                except e: KeyFileError
                    return int.MIN
            set
                _key_file.set_integer("ui", "x", value)
        
        prop y: int
            get
                try
                    return _key_file.get_integer("ui", "y")
                except e: KeyFileError
                    return int.MIN
            set
                _key_file.set_integer("ui", "y", value)
        
        prop width: int
            get
                try
                    return _key_file.get_integer("ui", "width")
                except e: KeyFileError
                    return int.MIN
            set
                _key_file.set_integer("ui", "width", value)
        
        prop height: int
            get
                try
                    return _key_file.get_integer("ui", "height")
                except e: KeyFileError
                    return int.MIN
            set
                _key_file.set_integer("ui", "height", value)
        
        prop split: int
            get
                try
                    return _key_file.get_integer("ui", "split")
                except e: KeyFileError
                    return int.MIN
            set
                _key_file.set_integer("ui", "split", value)

        prop play_list_style: string
            owned get
                try
                    return _key_file.get_string("ui", "playlist-style")
                except e: KeyFileError
                    return "group_by_albums"
            set
                _key_file.set_string("ui", "playlist-style", value)

        prop library_style: string
            owned get
                try
                    return _key_file.get_string("ui", "library-style")
                except e: KeyFileError
                    return "artists_albums"
            set
                _key_file.set_string("ui", "library-style", value)

        /*
         * Saves the configuration.
         */
        def save(): bool
            var data = _key_file.to_data()
            try
                return FileUtils.set_data(_file, data.data)
            except e: GLib.FileError
                _logger.warning(e.message)
                return false
    
        _file: string
        _key_file: KeyFile
        
        _logger: static Logging.Logger

        init
            _logger = Logging.get_logger("khovsgol.configuration")
