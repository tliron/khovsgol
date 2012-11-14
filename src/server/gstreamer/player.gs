[indent=4]

uses
    Gst
    GstUtil

namespace Khovsgol.GStreamer

    class Player: Khovsgol.Player
        construct(name: string)
            self.name = name
            _pipeline = new GstUtil.Pipeline(name)
            _pipeline.state_changed.connect(on_state_changed)
            _pipeline.eos.connect(on_eos)
            _pipeline.tag.connect(on_tag)
            _pipeline.error.connect(on_error)
            
            var t = new Track()
            t.path = "/Depot/Music/50 Foot Wave/Power+Light [EP]/01 - Power+Light.flac"
            t.title = "Power+Light"
            t.title_sort = "powerlight"
            t.artist = "50 Foot Wave"
            t.artist_sort = "50footwave"
            t.album = "Power+Light [EP]"
            t.album_sort = "powerlightep"
            t.album_path = "/Depot/Music/50 Foot Wave/Power+Light [EP]"
            t.duration = 100
            t.file_type = "flac"
            t.position = 1
            play_list.tracks.add(t)
            play_list.version = 12345
            play_list.id = "05c14cdc-2e2b-11e2-acee-00241ddd2a14"

            //start()
    
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
        
        _pipeline: GstUtil.Pipeline
        _logger: Logging.Logger = Logging.get_logger("khovsgol.gstreamer")
