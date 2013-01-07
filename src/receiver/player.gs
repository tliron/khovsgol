[indent=4]

uses
    Gst
    Gst.Audio
    GstUtil
    JsonUtil

namespace Khovsgol.Receiver

    /*
     * Supported specs:
     * 
     * rtpL16:udp:[port]:[caps]
     */
    def private create_player(configuration: Configuration, spec: string): Player?
        player: Player? = null
        if spec.has_prefix("rtpL16:")
            var specs = spec.substring(7).split(":")
            if specs.length > 0
                var transport = specs[0]
                if transport == "udp"
                    if specs.length > 2
                        var port = int.parse(specs[1])
                        var caps = specs[2]
                        player = new PlayerRtpL16(configuration, port, caps)
        
        if player is not null
            player.spec = spec
        return player

    /*
     * Player base.
     */
    class abstract Player
        prop spec: string?

        prop pipeline: GstUtil.Pipeline?
            get
                if _pipeline_container is not null
                    return _pipeline_container.pipeline
                else
                    return null
            set
                var pipeline = self.pipeline
                if pipeline != value
                    if value is not null
                        _pipeline_container = new PipelineContainer(value)
                        value.error.connect(on_error)
                    else
                        _pipeline_container = null

        prop volume: double
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
                        
        def play()
            var pipeline = pipeline
            if pipeline is not null
                pipeline.state = State.PLAYING
        
        def to_json(): Json.Object
            var json = new Json.Object()
            set_string_member_not_empty(json, "spec", _spec)
            //set_string_member_not_empty(json, "state", state)
            return json

        def private on_error(source: Gst.Object, error: GLib.Error, text: string)
            _logger.warning(text)

        _pipeline_container: PipelineContainer?

    /*
     * RTPL16 player.
     */
    class PlayerRtpL16: Player
        construct(configuration: Configuration, port: uint, caps: string)
            var pipeline = new GstUtil.Pipeline("Receiver")

            source: dynamic Element = ElementFactory.make("udpsrc", "Source")
            if source is null
                _logger.warning("Could not create udpsrc")
                return
            buffer: dynamic Element = ElementFactory.make("rtpjitterbuffer", "Buffer")
            if buffer is null
                _logger.warning("Could not create rtpjitterbuffer")
                return
            var depay = ElementFactory.make("rtpL16depay", "Depay")
            if depay is null
                _logger.warning("Could not create rtpL16depay")
                return
            var convert = ElementFactory.make("audioconvert", "AudioConvert")
            if convert is null
                _logger.warning("Could not create audioconvert")
                return
            var resample = ElementFactory.make("audioresample", "AudioResample")
            if resample is null
                _logger.warning("Could not create audioresample")
                return
            var rate = ElementFactory.make("audiorate", "AudioRate") // will create a perfect stream for us; but do we really need this if we are not, say, saving to a WAV?
            if rate is null
                _logger.warning("Could not create audiorate")
                return
            var volume = ElementFactory.make("volume", "Volume")
            if volume is null
                _logger.warning("Could not create volume")
                return
            sink: dynamic Element = ElementFactory.make(configuration.player_sink, "Sink")
            if sink is null
                _logger.warningf("Could not create %s", configuration.player_sink)
                return

            source.port = port
            source.caps = Caps.from_string(caps)
            buffer.latency = configuration.player_latency
            buffer.do_lost = true // this message will be handled downstream by audiorate
            
            if configuration.player_sink == "pulsesink"
                sink.client_name = "Khövgsöl"

            if not pipeline.add(source)
                _logger.warningf("Could not add element: %s", source.name)
                return
            if not pipeline.add(buffer)
                _logger.warningf("Could not add element: %s", buffer.name)
                return
            if not pipeline.add(depay)
                _logger.warningf("Could not add element: %s", depay.name)
                return
            if not pipeline.add(convert)
                _logger.warningf("Could not add element: %s", convert.name)
                return
            if not pipeline.add(resample)
                _logger.warningf("Could not add element: %s", resample.name)
                return
            if not pipeline.add(rate)
                _logger.warningf("Could not add element: %s", rate.name)
                return
            if not pipeline.add(volume)
                _logger.warningf("Could not add element: %s", volume.name)
                return
            if not pipeline.add(sink)
                _logger.warningf("Could not add element: %s", sink.name)
                return

            if not link_partial(source, buffer)
                _logger.warningf("Could not link elements: %s, %s", source.name, buffer.name)
                return
            if not link_partial(buffer, depay)
                _logger.warningf("Could not link elements: %s, %s", buffer.name, depay.name)
                return
            if not link_partial(depay, convert)
                _logger.warningf("Could not link elements: %s, %s", depay.name, convert.name)
                return
            if not link_partial(convert, resample)
                _logger.warningf("Could not link elements: %s, %s", convert.name, resample.name)
                return
            if not link_partial(resample, rate)
                _logger.warningf("Could not link elements: %s, %s", resample.name, rate.name)
                return
            if not link_partial(rate, volume)
                _logger.warningf("Could not link elements: %s, %s", rate.name, volume.name)
                return
            if not link_partial(volume, sink)
                _logger.warningf("Could not link elements: %s, %s", volume.name, sink.name)
                return
            
            _logger.messagef("Created RTPL16 player: port %u, caps: %s", port, caps)

            self.pipeline = pipeline
