[indent=4]

uses
    Gst
    Gst.Audio
    GstUtil

namespace Khovsgol.Server.GStreamer

    class Player: Khovsgol.Server.Player
        prop override path: string?
            get
                return _path
            set
                if _path != value
                    _path = value
                    if _pipeline != null
                        _pipeline.state = State.NULL
                    if _path != null
                        build()
                        source: dynamic Element =_pipeline.get_by_name("FileSource")
                        if source is not null
                            source.location = _path
                            _pipeline.state = State.PLAYING
        
        prop override volume: double
            get
                if _pipeline is not null
                    volume: dynamic Element =_pipeline.get_by_name("Volume")
                    if volume is not null
                        value: double = volume.volume
                        var converted = StreamVolume.convert_volume(StreamVolumeFormat.LINEAR, StreamVolumeFormat.CUBIC, value)
                        return converted
                return double.MIN
            set
                if _pipeline is not null
                    volume: dynamic Element =_pipeline.get_by_name("Volume")
                    if volume is not null
                        var converted = StreamVolume.convert_volume(StreamVolumeFormat.CUBIC, StreamVolumeFormat.LINEAR, value)
                        volume.volume = converted

        prop override play_mode: PlayMode
            get
                if _pipeline is not null
                    var state = _pipeline.state
                    if state == State.PLAYING
                        return PlayMode.PLAYING
                    else if state == State.PAUSED
                        return PlayMode.PAUSED
                return PlayMode.STOPPED
            set
                if _pipeline is not null
                    if value == PlayMode.PAUSED
                        _pipeline.state = State.PAUSED
                    else if value == PlayMode.PLAYING
                        var state = _pipeline.state
                        if state == State.PAUSED
                            _pipeline.state = State.PLAYING
                        else if state == State.NULL
                            if position_in_playlist != int.MIN
                                _pipeline.state = State.PLAYING
                            else
                                next()
                    else if value == PlayMode.TOGGLE_PAUSED
                        var state = _pipeline.state
                        if state == State.PLAYING
                            _pipeline.state = State.PAUSED
                        else if state == State.PAUSED
                            _pipeline.state = State.PLAYING
                        else if state == State.NULL
                            if position_in_playlist != int.MIN
                                _pipeline.state = State.PLAYING
                            else
                                next()
                    else
                        _pipeline.state = State.NULL
                else
                    if (value == PlayMode.PLAYING) or (value == PlayMode.TOGGLE_PAUSED)
                        next()
            
        prop override cursor_mode: CursorMode
        
        prop override position_in_track: double
            get
                if _pipeline is not null
                    var position = _pipeline.position
                    if position != int64.MIN
                        return position / 1000000000.0 // convert to seconds
                return double.MIN
            set
                if _pipeline is not null
                    var position = (int64) (value * 1000000000.0) // convert to nanoseconds
                    if position < 0
                        position = 0
                    _pipeline.position = position
        
        prop override ratio_in_track: double
            get
                if _pipeline is not null
                    var duration = _pipeline.duration
                    if duration != int64.MIN
                        var position = _pipeline.position
                        if position != int64.MIN
                            return position / duration
                return double.MIN
            set
                if _pipeline is not null
                    var duration = _pipeline.duration
                    if duration != int64.MIN
                        _pipeline.position = (int64) (value * duration)
        
        prop override readonly track_duration: double
            get
                if _pipeline is not null
                    var duration = _pipeline.duration
                    if duration != int64.MIN
                        return duration / 1000000000.0 // convert to seconds
                return double.MIN
        
        def private on_state_changed(new_state: State, old_state: State, pending_state: State)
            // TODO: state of which element?
            _state = new_state
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
            _pipeline.state_change.connect(on_state_changed)
            _pipeline.eos.connect(on_eos)
            _pipeline.tag.connect(on_tag)
            _pipeline.error.connect(on_error)

            source: Element = ElementFactory.make("filesrc", "FileSource")
            decode: Element = ElementFactory.make("decodebin", "DecodeBin")

            var convert = ElementFactory.make("audioconvert", "AudioConvert")
            var resample = ElementFactory.make("audioresample", "AudioResample")
            var volume = ElementFactory.make("volume", "Volume")
            var sink = ElementFactory.make("pulsesink", "PulseSink")

            _pipeline.add_many(source, decode, convert, resample, volume, sink)

            // The link between the source and the decoder must happen dynamically
            source.link(decode)
            _pipeline.ownerships.add(new LinkDecodeBinLater(decode, convert))
            convert.link_many(resample, volume, sink)
    
        _pipeline: GstUtil.Pipeline?
        _path: string?
        _state: State

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.gstreamer")
