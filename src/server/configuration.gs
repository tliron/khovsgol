[indent=4]

namespace Khovsgol.Server

    class Configuration
        construct() raises KeyFileError
            _file = "%s/.khovsgol/server.conf".printf(Environment.get_home_dir())
            _key_file = new KeyFile()
            try
                _key_file.load_from_file(_file, KeyFileFlags.KEEP_COMMENTS)
            except e: FileError
                _logger.info(e.message)
        
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
                            var library = group.slice(8, group.length)
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
        _logger: Logging.Logger = Logging.get_logger("khovsgol.configuration")
