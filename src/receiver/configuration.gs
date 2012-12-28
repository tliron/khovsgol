[indent=4]

namespace Khovsgol.Receiver

    class Configuration: Object implements Khovsgol.Configuration
        construct() raises KeyFileError
            _file = "%s/.khovsgol/receiver.conf".printf(Environment.get_home_dir())
            _key_file = new KeyFile()
            try
                _key_file.load_from_file(_file, KeyFileFlags.KEEP_COMMENTS)
            except e: FileError
                _logger.message(e.message)
        
        prop port: uint
            get
                if _port_override != int.MIN
                    return _port_override
            
                try
                    return _key_file.get_integer("receiver", "port")
                except e: KeyFileError
                    return 8186
            set
                _key_file.set_integer("receiver", "port", (int) value)
        
        prop port_override: int = int.MIN

        prop player_latency: uint
            get
                if _player_latency_override != int.MIN
                    return _player_latency_override
            
                try
                    return _key_file.get_integer("player", "latency")
                except e: KeyFileError
                    return 200
            set
                _key_file.set_integer("player", "latency", (int) value)
        
        prop player_latency_override: int = int.MIN

        prop player_sink: string?
            owned get
                if _player_sink_override is not null
                    return _player_sink_override

                try
                    return _key_file.get_string("player", "sink")
                except e: KeyFileError
                    return "pulsesink"
            set
                if (value is not null) and (value.length > 0)
                    _key_file.set_string("player", "sink", value)
                else
                    try
                        _key_file.remove_key("player", "sink")
                    except e: KeyFileError
                        pass

        prop player_sink_override: string?

        prop player_spec: string?
            owned get
                try
                    return _key_file.get_string("player", "spec")
                except e: KeyFileError
                    return null
            set
                if (value is not null) and (value.length > 0)
                    _key_file.set_string("player", "spec", value)
                else
                    try
                        _key_file.remove_key("player", "spec")
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
        
        _logger: static Logging.Logger

        init
            _logger = Logging.get_logger("khovsgol.configuration")
