[indent=4]

uses
    Gst

namespace GstUtil

    def initialize()
        if not _initialized
            var arguments = new array of string[0]
            weak_arguments: weak array of string = arguments
            Gst.init(ref weak_arguments)
            _initialized = true
            Logging.get_logger("gstreamer").messagef("Initialized %s", Gst.version_string())

    def list_element_factories()
        var l = ElementFactory.list_get_elements(ElementFactoryType.ANY, Rank.PRIMARY)
        for var e in l
            print e.get_name()
    
    class Pipeline: Gst.Pipeline
        construct(name: string)
            initialize()

            GLib.Object(name: name)
            
            // Note: Gst requires us to use the *default* GLib.MainContext in order to get messages
            var bus = get_bus()
            bus.add_signal_watch()
            bus.message.connect(on_message)
        
        def kill()
            // We are not allowed to die if the state is not null
            if state != State.NULL
                ref()
                _dying = true
                state = State.NULL

        prop readonly ownerships: list of GLib.Object = new list of GLib.Object

        prop state: State
            get
                state: State
                pending_state: State
                if get_state(out state, out pending_state, CLOCK_TIME_NONE) == StateChangeReturn.SUCCESS
                    return state
                else
                    return State.VOID_PENDING
            set
                set_state(value)

        prop readonly duration: int64
            get
                duration: int64
                if query_duration(Gst.Format.TIME, out duration)
                    return duration
                else
                    return int64.MIN

        prop position: int64
            get
                position: int64
                if query_position(Format.TIME, out position)
                    return position
                else
                    return int64.MIN
            set
                seek_simple(Format.TIME, SeekFlags.FLUSH, value)

        event state_change(source: Gst.Object, old_state: State, new_state: State, pending_state: State)
        event stream_start(source: Gst.Object)
        event eos(source: Gst.Object)
        event tag(tag_list: TagList)
        event error(source: Gst.Object, error: GLib.Error, text: string)

        def add_branch(branch: Bin)
            add(branch)
            
            // Link
            var tee = get_by_name("Tee")
            var src = tee.get_request_pad("src_%u")
            var sink = branch.get_static_pad("sink")
            src.link(sink)

            // Branch must be in same state as pipeline
            if branch.set_state(state) == StateChangeReturn.SUCCESS
                // Open valve
                valve: dynamic Element = branch.get_by_name("Valve")
                valve.drop = false
            /*else
                _logger.warningf("Could could not set branch status: %s to %d", branch.name, state)*/
        
        def private on_message(message: Message)
            // See: http://gstreamer.freedesktop.org/data/doc/gstreamer/head/gstreamer/html/gstreamer-GstMessage.html
            var type = message.type
            if type == MessageType.STATE_CHANGED
                new_state: State
                old_state: State
                pending_state: State
                message.parse_state_changed(out old_state, out new_state, out pending_state)
                if _dying and (new_state == State.NULL)
                    _dying = false
                    unref()
                    return
                state_change(message.src, old_state, new_state, pending_state)
            else if type == MessageType.STREAM_START
                stream_start(message.src)
            else if type == MessageType.EOS
                eos(message.src)
            else if type == MessageType.TAG
                tag_list: TagList
                message.parse_tag(out tag_list)
                tag(tag_list)
            else if type == MessageType.ERROR
                e: GLib.Error
                text: string
                message.parse_error(out e, out text)
                error(message.src, e, text)

        _dying: bool

    class LinkDecodeBinLater: GLib.Object
        construct(decodebin: dynamic Element, next: Element, once: bool = false)
            _next = next
            _once = once
            if _once
                ref() // We keep a ref until our pad is added
            decodebin.pad_added.connect(on_pad_added)

        def on_pad_added(element: dynamic Element, pad: Pad)
            var name = pad.query_caps(null).get_structure(0).get_name()
            if name == "audio/x-raw"
                pad.link(_next.get_static_pad("sink"))
                
            if _once
                // Pad added, no need for us to exist anymore
                element.pad_added.disconnect(on_pad_added)
                unref()
                
            // TODO: we need this owned somewhere!!!
        
        _next: Element
        _once: bool

    _initialized: private bool = false
