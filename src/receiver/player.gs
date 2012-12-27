[indent=4]

uses
    Gst
    Gst.Audio
    JsonUtil

namespace Khovsgol.Receiver

    /*
     * Supported specs:
     * 
     * rtpL16:udp:[port]
     */
    def private create_player(configuration: Configuration, spec: string, caps: string?): Player?
        player: Player? = null
        if spec.has_prefix("rtpL16:")
            if caps is not null // requires caps
                var specs = spec.substring(7).split(":")
                if specs.length > 0
                    var transport = specs[0]
                    if transport == "udp"
                        if specs.length > 1
                            var port = int.parse(specs[1])
                            player = new PlayerRtpL16(configuration, port, caps)
        
        if player is not null
            player.spec = spec
            player.caps = caps
        return player

    /*
     * Player base.
     */
    class abstract Player
        final
            if _pipeline is not null
                _pipeline.kill()
    
        prop spec: string?
        prop caps: string?

        prop pipeline: GstUtil.Pipeline?
            get
                return _pipeline
            set
                if _pipeline != value
                    if _pipeline is not null
                        _pipeline.kill()
                    _pipeline = value
                    if _pipeline is not null
                        _pipeline.error.connect(on_error)

        prop volume: double
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
                        
        def play()
            if _pipeline is not null
                _pipeline.state = State.PLAYING
        
        def to_json(): Json.Object
            var json = new Json.Object()
            set_string_member_not_null(json, "spec", _spec)
            set_string_member_not_null(json, "caps", _caps)
            return json

        def private on_error(source: Gst.Object, error: GLib.Error, text: string)
            _logger.warning(text)

        _pipeline: GstUtil.Pipeline?

    /*
     * RTPL16 player.
     */
    class PlayerRtpL16: Player
        construct(configuration: Configuration, port: uint, caps: string)
            var pipeline = new GstUtil.Pipeline("Receiver")

            source: dynamic Element = ElementFactory.make("udpsrc", "Source")
            buffer: dynamic Element = ElementFactory.make("rtpjitterbuffer", "Buffer")
            var depay = ElementFactory.make("rtpL16depay", "Depay")
            var convert = ElementFactory.make("audioconvert", "AudioConvert")
            var resample = ElementFactory.make("audioresample", "AudioResample")
            var rate = ElementFactory.make("audiorate", "AudioRate") // will create a perfect stream for us, but do we really need this if we are not, say, saving to a WAV?
            var volume = ElementFactory.make("volume", "Volume")
            sink: dynamic Element = ElementFactory.make(configuration.player_sink, "Sink")

            source.port = port
            source.caps = Caps.from_string(caps)
            buffer.latency = configuration.player_latency
            buffer.do_lost = true // this message will be handled downstream by audiorate
            
            if configuration.player_sink == "pulsesink"
                sink.client_name = "Khövgsöl"
            
            pipeline.add_many(source, buffer, depay, convert, resample, rate, volume, sink)
            source.link_many(buffer, depay, convert, resample, rate, volume, sink)
            
            _logger.messagef("Created RTPL16 player: %u, caps: %s", port, caps)

            self.pipeline = pipeline
