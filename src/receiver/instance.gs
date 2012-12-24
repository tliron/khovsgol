[indent=4]

// Server: gst-launch-1.0 filesrc location=... ! decodebin ! audioconvert ! rtpL16pay ! udpsink host=localhost port=9999
// Receiver: gst-launch-1.0 udpsrc port=9999 caps="application/x-rtp, media=(string)audio, clock-rate=(int)44100, encoding-name=(string)L16, encoding-params=(string)2, channels=(int)2, payload=(int)96, ssrc=(uint)828824404, timestamp-offset=(uint)2490881599, seqnum-offset=(uint)64183" ! rtpL16depay ! audioconvert ! audioresample ! pulsesink

uses
    Nap
    JsonUtil
    Gst

namespace Khovsgol.Receiver

    class Instance
        construct(args: array of string) raises GLib.Error
            _arguments = new Arguments(args)

            // Note: the Gst bus seems to work only with the default GLib.MainContext
            _main_loop = new MainLoop(null, false)
            
            if _arguments.start_daemon or _arguments.stop_daemon or _arguments.status_daemon
                Daemonize.handle("khovsgol", "khovsgolr", _arguments.start_daemon, _arguments.stop_daemon, _main_loop)
                
            _configuration = new Configuration()
            initialize_logging(_arguments.console)

            _uri_space = new UriSpace(self)

            if _arguments.port != int.MIN
                _configuration.port_override = _arguments.port

            _server = new _Soup.Server(_configuration.port, _main_loop.get_context())
            _server.set_handler(_uri_space.handle)
            
        def start()
            _server.start()
            _main_loop.run()
        
        def post_receiver(conversation: Conversation)
            var entity = conversation.request_json_object
            if entity is not null
                var port = get_int_member_or_min(entity, "port")
                if port != int.MIN
                    var caps = get_string_member_or_null(entity, "caps")
                    if caps is not null
                        _logger.messagef("Start receiving at port: %d, caps: %s", port, caps)
                        
                        if _pipeline is not null
                            _pipeline.kill()
                    
                        _pipeline = new GstUtil.Pipeline("Receiver")
                        _pipeline.error.connect(on_error)
                    
                        source: dynamic Element = ElementFactory.make("udpsrc", "Source")
                        source.port = port
                        source.caps = Caps.from_string(caps)
                        
                        var buffer = ElementFactory.make("rtpjitterbuffer", "Buffer")
                        var depay = ElementFactory.make("rtpL16depay", "Depay")
                        var convert = ElementFactory.make("audioconvert", "AudioConvert")
                        var resample = ElementFactory.make("audioresample", "AudioResample")
                        var volume = ElementFactory.make("volume", "Volume")
                        var sink = ElementFactory.make("pulsesink", "Sink")
                        
                        _pipeline.add_many(source, buffer, depay, convert, resample, volume, sink)
                        source.link_many(buffer, depay, convert, resample, volume, sink)

                        _pipeline.state = State.PLAYING

        def private on_error(error: GLib.Error, text: string)
            _logger.warning(text)

        _arguments: Arguments
        _configuration: Configuration
        _server: Nap.Server
        _main_loop: MainLoop
        _uri_space: UriSpace
        _pipeline: GstUtil.Pipeline

    _logger: Logging.Logger
    
    def private static initialize_logging(console: bool) raises GLib.Error
        _logger = Logging.get_logger("khovsgol.receiver")
        
        if not console
            var appender = new Logging.FileAppender()
            appender.deepest_level = LogLevelFlags.LEVEL_DEBUG // LogLevelFlags.LEVEL_MESSAGE
            appender.set_path("%s/.khovsgol/log/receiver.log".printf(Environment.get_home_dir()))
            Logging.get_logger().appender = appender
        else
            var appender = new Logging.StreamAppender()
            Logging.get_logger().appender = appender

    class UriSpace: Router
        construct(instance: Instance)
            add_node("/receiver/", new DelegatedResource(null, instance.post_receiver))

init
    try
        new Khovsgol.Receiver.Instance(args).start()
    except e: GLib.Error
        stderr.printf("%s\n", e.message)
        Posix.exit(1)
