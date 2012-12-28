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
                    if _pipeline is not null
                        _pipeline.state = State.NULL
                    if _path is not null
                        if validate_pipeline()
                            source: dynamic Element =_pipeline.get_by_name("Source")
                            if source is not null
                                source.location = _path

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
        
        def override set_plug(spec: string): Plug?
            var plug = get_plug(spec)
            if plug is null
                plug = super.set_plug(spec)
                if _pipeline is not null
                    var branch = create_branch(plug)
                    if branch is not null
                        _pipeline.add_branch(branch)
                
            return plug
        
        def override remove_plug(spec: string): bool
            return super.remove_plug(spec)

        def private validate_pipeline(): bool
            if _pipeline is not null
                return true
                
            var plugs = self.plugs
            if not plugs.iterator().next()
                return false
                
            _pipeline = new GstUtil.Pipeline("Pipeline:" + name)
            _pipeline.state_change.connect(on_state_changed)
            _pipeline.eos.connect(on_eos)
            _pipeline.tag.connect(on_tag)
            _pipeline.error.connect(on_error)

            var source = ElementFactory.make("filesrc", "Source")
            var decode = ElementFactory.make("decodebin", "Decode")
            var convert = ElementFactory.make("audioconvert", "Convert")
            var tee = ElementFactory.make("tee", "Tee")
            
            _pipeline.add_many(source, decode, convert, tee)
            source.link(decode)
            _pipeline.ownerships.add(new LinkDecodeBinLater(decode, convert))
            convert.link(tee)
            
            has_branches: bool = false
            for var plug in plugs
                var branch = create_branch(plug)
                if branch is not null
                    _pipeline.add_branch(branch)
                    has_branches = true
            
            if not has_branches
                // Don't allow pipelines with no sinks
                _pipeline = null
                return false
            
            return true
        
        /*
         * Supported specs:
         * 
         * pulse
         * pulse:[host]
         * alsa
         * jack
         * 
         * rtpL16:udp:[http_port]
         */
        def private create_branch(plug: Plug): Bin?
            var spec = plug.spec
            if spec == "pulse"
                return create_pulse_branch(spec)
            else if spec.has_prefix("pulse:")
                var specs = spec.substring(6).split(":")
                if specs.length > 0
                    var server = specs[0]
                    return create_pulse_branch(spec, server)
            else if spec == "alsa"
                pass
            else if spec == "jack"
                pass
            else if spec.has_prefix("rtpL16:")
                var specs = spec.substring(7).split(":")
                if specs.length > 0
                    var transport = specs[0]
                    if transport == "udp"
                        if specs.length > 1
                            var http_port = int.parse(specs[1])
                            if specs.length > 2
                                var host = specs[2]
                                return create_rtpL16_branch(spec, host, http_port, http_port + 1)
            return null

        def private create_pulse_branch(name: string, server: string? = null): Bin
            valve: dynamic Element = ElementFactory.make("valve", "Valve")
            var queue = ElementFactory.make("queue", "Queue")
            var resample = ElementFactory.make("audioresample", "Resample")
            var volume = ElementFactory.make("volume", "Volume")
            sink: dynamic Element = ElementFactory.make("pulsesink", "Sink")

            valve.drop = true
            sink.client_name = "Khövgsöl"
            if server is not null
                sink.server = server

            var bin = new Bin(name)
            bin.add_many(valve, queue, resample, volume, sink)
            valve.link_many(queue, resample, volume, sink)
            bin.add_pad(new GhostPad("sink", valve.get_static_pad("sink")))
            return bin
        
        def private create_rtpL16_branch(name: string, host: string, http_port: uint, udp_port: uint): Bin
            valve: dynamic Element = ElementFactory.make("valve", "Valve")
            var queue = ElementFactory.make("queue", "Queue")
            var pay = ElementFactory.make("rtpL16pay", "Pay")
            sink: dynamic Element = ElementFactory.make("udpsink", "RemoteSink:%s:%u:rtpL16:udp:%u".printf(host, http_port, udp_port))
            
            valve.drop = true
            sink.host = host
            sink.port = udp_port
            //sink.sync = false // this can cause CPU to spike?

            var bin = new Bin(name)
            bin.add_many(valve, queue, pay, sink)
            valve.link_many(queue, pay, sink)
            bin.add_pad(new GhostPad("sink", valve.get_static_pad("sink")))
            return bin
        
        def private put_receiver(host: string, http_port: uint, spec: string)
            var client = new Nap._Soup.Client()
            client.base_url = "http://%s:%u".printf(host, http_port)
            try
                var conversation = client.create_conversation()
                conversation.method = Nap.Method.PUT
                conversation.path = "/receiver/"
                var payload = new Json.Object()
                payload.set_string_member("spec", spec)
                conversation.request_json_object = payload
                conversation.commit(true)
            except e: GLib.Error
                _logger.exception(e)

        /*
         * Supported specs:
         * 
         * RemoteSink:[host]:[http_port]:rtpL16:udp:[udp_port]
         */
        def private on_remote_sink(source: Element)
            var spec = source.name.substring(11)
            var specs = spec.split(":")
            if specs.length > 2
                var host = specs[0]
                var http_port = int.parse(specs[1])
                var tech = specs[2]
                if tech == "rtpL16"
                    if specs.length > 3
                        var transport = specs[3]
                        if transport == "udp"
                            if specs.length > 4
                                var udp_port = int.parse(specs[4])
                                var sink = source.get_static_pad("sink")
                                var caps = sink.caps.to_string()
                                put_receiver(host, http_port, "rtpL16:udp:%u:%s".printf(udp_port, caps))
        
        def private on_state_changed(source: Gst.Object, old_state: State, new_state: State, pending_state: State)
            if (new_state == State.PLAYING) and source.name.has_prefix("RemoteSink:")
                on_remote_sink((Element) source)

        def private on_eos(source: Gst.Object)
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
        
        def private on_error(source: Gst.Object, error: GLib.Error, text: string)
            _logger.warning(text)
    
        _pipeline: GstUtil.Pipeline?
        _path: string?

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.gstreamer")
