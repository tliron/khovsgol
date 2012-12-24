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
                        source: dynamic Element =_pipeline.get_by_name("Source")
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
        
        def private on_state_changed(source: Gst.Object, new_state: State, old_state: State, pending_state: State)
            _state = new_state // are we using this?
            if (new_state == State.PAUSED) and source.name.has_prefix("RemoteSink:")
                // TODO: maybe STREAM_STATUS msg?
                // STREAM_START?
                // see: http://gstreamer.freedesktop.org/data/doc/gstreamer/head/gstreamer/html/gstreamer-GstMessage.html
            
                var info = source.name.substring(11)
                var infos = info.split(":", 3)
                if infos.length == 3
                    var host = infos[0]
                    var http_port = int.parse(infos[1])
                    var udp_port = int.parse(infos[2])

                    var caps = ((Element) source).get_static_pad("sink").caps.to_string()
                
                    // Tell receiver to start playing
                    var client = new Nap._Soup.Client()
                    client.base_url = "http://%s:%d".printf(host, http_port)
                    try
                        var conversation = client.create_conversation()
                        conversation.method = Nap.Method.POST
                        conversation.path = "/receiver/"
                        var payload = new Json.Object()
                        payload.set_int_member("port", udp_port)
                        payload.set_string_member("caps", caps)
                        conversation.request_json_object = payload
                        conversation.commit(true)
                    except e: GLib.Error
                        _logger.exception(e)

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
            
        def private create_local_branch(name: string): Bin
            var queue = ElementFactory.make("queue", "Queue")
            var resample = ElementFactory.make("audioresample", "AudioResample")
            var volume = ElementFactory.make("volume", "Volume")
            var sink = ElementFactory.make("pulsesink", "Sink")

            var bin = new Bin(name)
            bin.add_many(queue, resample, volume, sink)
            queue.link_many(resample, volume, sink)
            bin.add_pad(new GhostPad("sink", queue.get_static_pad("sink")))
            return bin
        
        def private create_remote_branch(name: string, host: string, http_port: int, udp_port: int): Bin
            var queue = ElementFactory.make("queue", "Queue")
            var pay = ElementFactory.make("rtpL16pay", "Pay")
            sink: dynamic Element = ElementFactory.make("udpsink", "RemoteSink:%s:%d:%d".printf(host, http_port, udp_port))
            sink.host = host
            sink.port = udp_port
            //sink.sync = false // this can cause CPU to spike

            var bin = new Bin(name)
            bin.add_many(queue, pay, sink)
            queue.link_many(pay, sink)
            bin.add_pad(new GhostPad("sink", queue.get_static_pad("sink")))
            return bin
        
        def private build()
            if _pipeline is not null
                return
        
            _pipeline = new GstUtil.Pipeline("Player:" + name)
            _pipeline.state_change.connect(on_state_changed)
            _pipeline.eos.connect(on_eos)
            _pipeline.tag.connect(on_tag)
            _pipeline.error.connect(on_error)

            var source = ElementFactory.make("filesrc", "Source")
            var decode = ElementFactory.make("decodebin", "DecodeBin")
            var convert = ElementFactory.make("audioconvert", "AudioConvert")
            var tee = ElementFactory.make("tee", "Tee")
            var local_branch = create_local_branch("Local")
            var remote_branch = create_remote_branch("Remote", "localhost", 8081, 8082)
            
            _pipeline.add_many(source, decode, convert, tee, remote_branch)
            source.link(decode)
            _pipeline.ownerships.add(new LinkDecodeBinLater(decode, convert))
            convert.link(tee)
            
            //tee.get_request_pad("src_%u").link(local_branch.get_static_pad("sink"))
            tee.get_request_pad("src_%u").link(remote_branch.get_static_pad("sink"))
    
        _pipeline: GstUtil.Pipeline?
        _path: string?
        _state: State

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.gstreamer")
