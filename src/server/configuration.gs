[indent=4]

namespace Khovsgol.Server

    class Configuration: Object
        construct() raises KeyFileError
            _file = "%s/.khovsgol/server.conf".printf(Environment.get_home_dir())
            _key_file = new KeyFile()
            try
                _key_file.load_from_file(_file, KeyFileFlags.KEEP_COMMENTS)
            except e: FileError
                _logger.message(e.message)
        
        prop threads: uint
            get
                if _threads_override != uint.MIN
                    return _threads_override
            
                try
                    return _key_file.get_integer("server", "threads")
                except e: KeyFileError
                    return 0
            set
                _key_file.set_integer("server", "threads", (int) value)
        
        prop threads_override: uint = uint.MIN

        prop port: uint
            get
                if _port_override != uint.MIN
                    return _port_override
            
                try
                    return _key_file.get_integer("server", "port")
                except e: KeyFileError
                    return 8181
            set
                _key_file.set_integer("server", "port", (int) value)
        
        prop port_override: uint = uint.MIN
        
        prop delay: uint64
            get
                if _delay_override != uint64.MIN
                    return _delay_override
            
                try
                    return _key_file.get_uint64("server", "delay")
                except e: KeyFileError
                    return 0
            set
                _key_file.set_uint64("server", "delay", value)
        
        prop delay_override: uint64 = uint64.MIN
        
        /*
         * Whether to advertise the server on Avahi.
         */
        prop advertise: bool
            get
                try
                    return _key_file.get_boolean("server", "advertise")
                except e: KeyFileError
                    return false
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
        _libraries: list of string = new list of string
        
        _logger: static Logging.Logger

        init
            _logger = Logging.get_logger("khovsgol.configuration")
