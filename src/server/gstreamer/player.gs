[indent=4]

uses
    Gst
    GstUtil

namespace Khovsgol.GStreamer

    class Player: Khovsgol.Player
        prop override path: string?
            get
                return _path
            set
                _path = value
                
                if _pipeline != null
                    _pipeline.pipeline.set_state(State.NULL)
                if _path != null
                    build()
                    src: dynamic Element =_pipeline.pipeline.get_by_name("FileSource")
                    src.location = _path
                    _pipeline.pipeline.set_state(State.PLAYING)
        
        prop override play_mode: PlayMode
            get
                if _pipeline is not null
                    state: State
                    pending_state: State
                    if _pipeline.pipeline.get_state(out state, out pending_state, CLOCK_TIME_NONE) == StateChangeReturn.SUCCESS
                        if state == State.PLAYING
                            return PlayMode.PLAYING
                        else if state == State.PAUSED
                            return PlayMode.PAUSED
                return PlayMode.STOPPED
            set
                if _pipeline is not null
                    if value == PlayMode.PLAYING
                        _pipeline.pipeline.set_state(State.PLAYING)
                    else if value == PlayMode.PAUSED
                        _pipeline.pipeline.set_state(State.PAUSED)
                    else if value == PlayMode.TOGGLE_PAUSED
                        state: State
                        pending_state: State
                        if _pipeline.pipeline.get_state(out state, out pending_state, CLOCK_TIME_NONE) == StateChangeReturn.SUCCESS
                            if state == State.PLAYING
                                _pipeline.pipeline.set_state(State.PAUSED)
                            else if state == State.PAUSED
                                _pipeline.pipeline.set_state(State.PLAYING)
                    else
                        _pipeline.pipeline.set_state(State.NULL)
            
        prop override cursor_mode: CursorMode
        
        prop override position_in_track: double
            get
                if _pipeline is not null
                    position: int64
                    if _pipeline.pipeline.query_position(Format.TIME, out position)
                        return position / 1000000000.0 // convert to seconds
                return double.MIN
            set
                if _pipeline is not null
                    var position = (int64)(value * 1000000000) // convert to nanoseconds
                    _pipeline.pipeline.seek_simple(Format.TIME, SeekFlags.FLUSH, position)
        
        prop override ratio_in_track: double
            get
                if _pipeline is not null
                    duration: int64
                    if _pipeline.pipeline.query_duration(Gst.Format.TIME, out duration)
                        position: int64
                        if _pipeline.pipeline.query_position(Format.TIME, out position)
                            return position / duration
                return double.MIN
            set
                if _pipeline is not null
                    duration: int64
                    if _pipeline.pipeline.query_duration(Gst.Format.TIME, out duration)
                        var position = (int64)(value * duration)
                        _pipeline.pipeline.seek_simple(Format.TIME, SeekFlags.FLUSH, position)
        
        prop override readonly track_duration: double
            get
                if _pipeline is not null
                    duration: int64
                    if _pipeline.pipeline.query_duration(Gst.Format.TIME, out duration)
                        return duration / 1000000000.0 // convert to seconds
                return double.MIN

        def private on_state_changed(new_state: State, old_state: State, pending_state: State)
            //print new_state.to_string()
            pass

        def private on_eos()
            next()
            
        def private on_tag(tag_list: TagList)
            //print "tag"
            bitrate: uint
            if tag_list.get_uint(Tags.BITRATE, out bitrate)
                //print "bitrate %u", bitrate
                pass
            channel_mode: string
            if tag_list.get_string("channel-mode", out channel_mode)
                //print "channel-mode %s", channel_mode
                pass
        
        def private on_error(error: GLib.Error, text: string)
            _logger.warning(text)
        
        def private build()
            if _pipeline is not null
                return
        
            _pipeline = new GstUtil.Pipeline(name)
            _pipeline.state_changed.connect(on_state_changed)
            _pipeline.eos.connect(on_eos)
            _pipeline.tag.connect(on_tag)
            _pipeline.error.connect(on_error)

            src: Element = ElementFactory.make("filesrc", "FileSource")
            //src.location = "/home/emblemparade/Desktop/BootyWave.mp3"
            //src.location = "/Depot/Music/50 Foot Wave/Power+Light [EP]/01 - Power+Light.flac"

            decode: dynamic Element = ElementFactory.make("decodebin", "DecodeBin")

            var convert = ElementFactory.make("audioconvert", "AudioConvert")
            var resample = ElementFactory.make("audioresample", "AudioResample")
            var sink = ElementFactory.make("pulsesink", "PulseSink")

            _pipeline.pipeline.add_many(src, decode, convert, resample, sink)

            src.link(decode)
            _pipeline.ownerships.add(new LinkDecodeBinLater(decode, convert))
            convert.link_many(resample, sink)
    
        _pipeline: GstUtil.Pipeline?
        _logger: Logging.Logger = Logging.get_logger("khovsgol.gstreamer")
        _path: string?
