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

        event state_change(new_state: State, old_state: State, pending_state: State)
        event eos()
        event tag(tag_list: TagList)
        event error(error: GLib.Error, text: string)
        
        def private on_message(message: Message)
            var type = message.type
            if type == MessageType.STATE_CHANGED
                new_state: State
                old_state: State
                pending_state: State
                message.parse_state_changed(out new_state, out old_state, out pending_state)
                state_changed(new_state, old_state, pending_state)
            else if type == MessageType.EOS
                eos()
            else if type == MessageType.TAG
                tag_list: TagList
                message.parse_tag(out tag_list)
                tag(tag_list)
            else if type == MessageType.ERROR
                e: GLib.Error
                text: string
                message.parse_error(out e, out text)
                error(e, text)

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
