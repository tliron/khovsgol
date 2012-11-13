[indent=4]

uses
    Gst
    GstUtilities

namespace Khovsgol.GStreamer

    class Player: GLib.Object implements Khovsgol.Player
        construct()
            _pipeline = new GstUtilities.Pipeline("player")
            _pipeline.on_state_changed = on_state_changed
            _pipeline.on_eos = on_eos
            _pipeline.on_tag = on_tag
            _pipeline.on_error = on_error
            start()
    
        def start()
            
            src: dynamic Element = ElementFactory.make("filesrc", "filesrc")
            src.location = "/home/emblemparade/Desktop/BootyWave.mp3"
            //src.location = "/Depot/Music/50 Foot Wave/Power+Light [EP]/01 - Power+Light.flac"

            decode: dynamic Element = ElementFactory.make("decodebin", "decodebin")

            var convert = ElementFactory.make("audioconvert", "audioconvert")

            var resample = ElementFactory.make("audioresample", "audioresample")

            var sink = ElementFactory.make("pulsesink", "pulsesink")

            _pipeline.pipeline.add_many(src, decode, convert, resample, sink)

            src.link(decode)
            new LinkDecodeBinLater(decode, convert)
            convert.link_many(resample, sink)

            _pipeline.pipeline.set_state(State.PLAYING)
            
        def on_state_changed(new_state: State, old_state: State, pending_state: State)
            print new_state.to_string()

        def on_eos()
            print "eos"
            
        def on_tag(tag_list: TagList)
            print "tag"
            bitrate: uint
            if tag_list.get_uint(Tags.BITRATE, out bitrate)
                print "bitrate %u", bitrate
            channel_mode: string
            if tag_list.get_string("channel-mode", out channel_mode)
                print "channel-mode %s", channel_mode
        
        def private on_error(error: GLib.Error, text: string)
            stderr.printf(text)
            _logger.warning(text)
        
        _pipeline: GstUtilities.Pipeline
        _logger: Logging.Logger = Logging.get_logger("khovsgol.gstreamer")
