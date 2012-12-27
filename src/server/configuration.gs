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
        
        _logger: static Logging.Logger

        init
            _logger = Logging.get_logger("khovsgol.configuration")
