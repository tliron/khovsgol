[indent=4]

uses
    Gst
    Gst.Audio
    GstUtil

namespace Khovsgol.Server.GStreamer

    class Player: Khovsgol.Server.Player
        prop readonly pipeline: GstUtil.Pipeline?
            get
                if _pipeline_container is not null
                    return _pipeline_container.pipeline
                else
                    return null
    
        prop override path: string?
            get
                return _path
            set
                if _path != value
                    _path = value
                    var pipeline = self.pipeline
                    if pipeline is not null
                        pipeline.state = State.NULL
                    if _path is not null
                        if validate_pipeline()
                            pipeline = self.pipeline
                            source: dynamic Element = pipeline.get_by_name("Source")
                            if source is not null
                                source.location = _path

        prop override volume: double
            get
                var pipeline = self.pipeline
                if pipeline is not null
                    volume: dynamic Element = pipeline.get_by_name("Volume")
                    if volume is not null
                        value: double = volume.volume
                        var converted = StreamVolume.convert_volume(StreamVolumeFormat.LINEAR, StreamVolumeFormat.CUBIC, value)
                        return converted
                return double.MIN
            set
                var pipeline = self.pipeline
                if pipeline is not null
                    volume: dynamic Element = pipeline.get_by_name("Volume")
                    if volume is not null
                        var converted = StreamVolume.convert_volume(StreamVolumeFormat.CUBIC, StreamVolumeFormat.LINEAR, value)
                        volume.volume = converted
                        if value != configuration.get_volume(name)
                            configuration.set_volume(name, value)
                            configuration.save()

        prop override play_mode: PlayMode
            get
                var pipeline = self.pipeline
                if pipeline is not null
                    var state = pipeline.state
                    if state == State.PLAYING
                        return PlayMode.PLAYING
                    else if state == State.PAUSED
                        return PlayMode.PAUSED
                return PlayMode.STOPPED
            set
                var pipeline = self.pipeline
                if pipeline is not null
                    if value == PlayMode.PAUSED
                        pipeline.state = State.PAUSED
                    else if value == PlayMode.PLAYING
                        var state = pipeline.state
                        if state == State.PAUSED
                            pipeline.state = State.PLAYING
                        else if state == State.NULL
                            if position_in_playlist != int.MIN
                                pipeline.state = State.PLAYING
                            else
                                next()
                    else if value == PlayMode.TOGGLE_PAUSED
                        var state = pipeline.state
                        if state == State.PLAYING
                            pipeline.state = State.PAUSED
                        else if state == State.PAUSED
                            pipeline.state = State.PLAYING
                        else if state == State.NULL
                            if position_in_playlist != int.MIN
                                pipeline.state = State.PLAYING
                            else
                                next()
                    else
                        pipeline.state = State.NULL
                else
                    if (value == PlayMode.PLAYING) or (value == PlayMode.TOGGLE_PAUSED)
                        next()
            
        prop override cursor_mode: CursorMode
        
        prop override position_in_track: double
            get
                var pipeline = self.pipeline
                if pipeline is not null
                    var position = pipeline.position
                    if position != int64.MIN
                        return position / 1000000000.0 // seconds to seconds
                return double.MIN
            set
                if validate_pipeline()
                    var pipeline = self.pipeline
                    var position = (int64) (value * 1000000000.0) // seconds to nanoseconds
                    if position < 0
                        position = 0
                    if position != 0
                        pipeline.position = position
                        pipeline.state = State.PLAYING
                    else
                        // We will consider position 0 as a request to restart the pipeline
                        pipeline = self.pipeline
                        pipeline.state = State.NULL
                        pipeline.state = State.PLAYING
        
        prop override ratio_in_track: double
            get
                var pipeline = self.pipeline
                if pipeline is not null
                    var duration = pipeline.duration
                    if duration != int64.MIN
                        var position = pipeline.position
                        if position != int64.MIN
                            return position / duration
                return double.MIN
            set
                if validate_pipeline()
                    var pipeline = self.pipeline
                    var duration = pipeline.duration
                    if duration != int64.MIN
                        pipeline.position = (int64) (value * duration)
                        pipeline.state = State.PLAYING
        
        prop override readonly track_duration: double
            get
                var pipeline = self.pipeline
                if pipeline is not null
                    var duration = pipeline.duration
                    if duration != int64.MIN
                        return duration / 1000000000.0 // nanoseconds to seconds
                return double.MIN
        
        def override validate_spec(spec: string, default_host: string?): string?
            if spec == "fake"
                return spec
            else if spec == "pulse"
                return spec
            else if spec.has_prefix("pulse:")
                var specs = spec.substring(6).split(":")
                if specs.length > 0
                    return spec
                else
                    return spec + default_host
            else if spec == "alsa"
                return spec
            else if spec == "jack"
                return spec
            else if spec.has_prefix("rtpL16:")
                var specs = spec.substring(7).split(":")
                if specs.length > 0
                    var transport = specs[0]
                    if transport == "udp"
                        if specs.length > 1
                            if specs.length > 2
                                return spec
                            else
                                return spec + ":" + default_host
            return null

        def override set_plug(spec: string, default_host: string?): Plug?
            var plug = get_plug(spec, default_host)
            if plug is null
                plug = super.set_plug(spec, default_host)
                if (plug is not null) and (pipeline is not null)
                    var branch = create_branch(plug)
                    if branch is not null
                        pipeline.add_branch(branch)
                
            return plug

        def override remove_plug(spec: string, default_host: string?): bool
            var pipeline = self.pipeline
            if pipeline is not null
                var branch = pipeline.get_by_name(spec)
                if branch is not null
                    pipeline.remove_safely(branch)
            return super.remove_plug(spec, default_host)

        def private validate_pipeline(): bool
            if _pipeline_container is not null
                return true
                
            var plugs = self.plugs
            if not plugs.iterator().next()
                return false
                
            var pipeline = new GstUtil.Pipeline("Player:" + name)
            pipeline.state_change.connect(on_state_changed)
            pipeline.eos.connect(on_eos)
            pipeline.tag.connect(on_tag)
            pipeline.error.connect(on_error)

            source: dynamic Element = ElementFactory.make("filesrc", "Source")
            var decode = ElementFactory.make("decodebin", "Decode")
            var volume = ElementFactory.make("volume", "Volume")
            tee: dynamic Element = ElementFactory.make("tee", "Tee")
            
            if (source is null) or (decode is null) or (volume is null) or (tee is null)
                return false
            
            if _path is not null
                source.location = _path

            //tee.silent = false // ??
            
            pipeline.add_many(source, decode, volume, tee)
            source.link(decode)
            link_on_demand(decode, volume)
            volume.link(tee)
            
            if not pipeline.add_branch(new FakeBranch("fake"))
                return false
            
            var has_branches = false
            for var plug in plugs
                var branch = create_branch(plug)
                if branch is not null
                    if not pipeline.add_branch(branch)
                        return false
                    has_branches = true
            
            if has_branches
                _pipeline_container = new PipelineContainer(pipeline)
                return true
            else
                // Don't allow pipelines with no sinks
                return false
        
        /*
         * Supported specs:
         * 
         * fake
         * pulse
         * pulse:[host]
         * alsa
         * jack
         * rtpL16:udp:[http_port]:[host]
         */
        def private create_branch(plug: Plug): Bin?
            var spec = plug.spec
            if spec == "fake"
                return new FakeBranch(spec)
            else if spec == "pulse"
                return new PulseAudioBranch(spec)
            else if spec.has_prefix("pulse:")
                var specs = spec.substring(6).split(":")
                if specs.length > 0
                    var server = specs[0]
                    return new PulseAudioBranch(spec, server)
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
                                return new RtpL16Branch(spec, host, http_port, http_port + 1)
            return null
        
        /*
         * Base class for branches.
         */
        class abstract Branch: Bin
            construct(name: string)
                GLib.Object(name: name)

            def initialize(first: Element, ...): bool
                var queue = ElementFactory.make("queue", "Queue")
                if queue is null
                    _logger.warningf("Could not create queue")
                    return false
                if not add(queue)
                    _logger.warningf("Could not add element: %s", queue.name)
                    return false
                if not add(first)
                    _logger.warningf("Could not add element: %s", first.name)
                    return false
                if not queue.link(first)
                    _logger.warningf("Could not link elements: %s, %s", queue.name, first.name)
                    return false
                
                var previous = first
                var args = va_list()
                element: Element? = args.arg()
                while element is not null
                    if not add(element)
                        _logger.warningf("Could not add element: %s", element.name)
                        return false
                    if not previous.link(element)
                        _logger.warningf("Could not link elements: %s, %s", previous.name, element.name)
                        return false
                    previous = element
                    element = args.arg()
                
                var sink = queue.get_static_pad("sink")
                if sink is null
                    _logger.warningf("Could not get sink pad: %s", queue.name)
                    return false
                
                if not add_pad(new GhostPad("sink", sink))
                    _logger.warningf("Could not add ghost pad: %s", name)
                    return false
                return true

        /*
         * Fake branch.
         */
        class FakeBranch: Branch
            construct(name: string)
                super(name)
                sink: dynamic Element = ElementFactory.make("fakesink", "Sink")
                if sink is null
                    _logger.warningf("Could not create fakesink")
                    return
                sink.sync = true // without this, we would empty out the pipeline at full speed!
                initialize(sink)

        /*
         * PulseAudio branch.
         */
        class PulseAudioBranch: Branch
            construct(name: string, server: string? = null)
                super(name)
                var convert = ElementFactory.make("audioconvert", "Convert")
                if convert is null
                    _logger.warningf("Could not create audioconvert")
                    return
                var resample = ElementFactory.make("audioresample", "Resample")
                if resample is null
                    _logger.warningf("Could not create audioresample")
                    return
                sink: dynamic Element = ElementFactory.make("pulsesink", "Sink")
                if sink is null
                    _logger.warningf("Could not create pulsesink")
                    return

                sink.client_name = "Khövgsöl"
                if server is not null
                    sink.server = server

                initialize(convert, resample, sink)
        
        /*
         * Raw audio RTP over UDP branch.
         */
        class RtpL16Branch: Branch
            construct(name: string, host: string, http_port: uint, udp_port: uint)
                super(name)
                var convert = ElementFactory.make("audioconvert", "Convert")
                if convert is null
                    _logger.warningf("Could not create audioconvert")
                    return
                var pay = ElementFactory.make("rtpL16pay", "Pay")
                if pay is null
                    _logger.warningf("Could not create rtpL16pay")
                    return
                sink: dynamic Element = ElementFactory.make("udpsink", "RemoteSink:%s:%u:rtpL16:udp:%u".printf(host, http_port, udp_port))
                if sink is null
                    _logger.warningf("Could not create udpsink")
                    return
                
                sink.host = host
                sink.port = udp_port
                //sink.sync = false // this can cause CPU to spike?

                initialize(convert, pay, sink)
        
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
            
        _pipeline_container: PipelineContainer?
        _path: string?

        _logger: static Logging.Logger
        
        init
            _logger = Logging.get_logger("khovsgol.gstreamer")
