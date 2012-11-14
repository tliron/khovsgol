[indent=4]

uses
    Gst
    GstUtil

namespace Khovsgol.GStreamer

    class Player: Khovsgol.Player
        prop override play_mode: PlayMode
        prop override cursor_mode: CursorMode
        prop override position_in_play_list: int
        prop override position_in_track: double
        prop override ratio_in_track: double

        def override prev()
            pass
            
        def override next()
            pass

        def start()
            validate()
            
            src: dynamic Element = ElementFactory.make("filesrc", "filesrc")
            //src.location = "/home/emblemparade/Desktop/BootyWave.mp3"
            src.location = "/Depot/Music/50 Foot Wave/Power+Light [EP]/01 - Power+Light.flac"

            decode: dynamic Element = ElementFactory.make("decodebin", "decodebin")

            var convert = ElementFactory.make("audioconvert", "audioconvert")
            var resample = ElementFactory.make("audioresample", "audioresample")
            var sink = ElementFactory.make("pulsesink", "pulsesink")

            _pipeline.pipeline.add_many(src, decode, convert, resample, sink)

            src.link(decode)
            new LinkDecodeBinLater(decode, convert)
            convert.link_many(resample, sink)

            _pipeline.pipeline.set_state(State.PLAYING)
            
        def private on_state_changed(new_state: State, old_state: State, pending_state: State)
            print new_state.to_string()

        def private on_eos()
            print "eos"
            
        def private on_tag(tag_list: TagList)
            print "tag"
            bitrate: uint
            if tag_list.get_uint(Tags.BITRATE, out bitrate)
                print "bitrate %u", bitrate
            channel_mode: string
            if tag_list.get_string("channel-mode", out channel_mode)
                print "channel-mode %s", channel_mode
        
        def private validate()
            if _pipeline is not null
                return
                
            _pipeline = new GstUtil.Pipeline(name)
            _pipeline.state_changed.connect(on_state_changed)
            _pipeline.eos.connect(on_eos)
            _pipeline.tag.connect(on_tag)
            _pipeline.error.connect(on_error)

            //start()
    
        def private on_error(error: GLib.Error, text: string)
            stderr.printf(text)
            _logger.warning(text)
        
        _pipeline: GstUtil.Pipeline
        _logger: Logging.Logger = Logging.get_logger("khovsgol.gstreamer")
