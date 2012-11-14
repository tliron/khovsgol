[indent=4]

uses
    Gst

namespace GstUtil

    _initialized: bool = false
    
    def initialize()
        if !_initialized
            var arguments = new array of string[0]
            weak_arguments: weak array of string = arguments
            Gst.init(ref weak_arguments)
            _initialized = true
            Logging.get_logger("gstreamer").info("Initialized %s", Gst.version_string())

    def list_element_factories()
        var l = ElementFactory.list_get_elements(ElementFactoryType.ANY, Rank.PRIMARY)
        for var e in l
            print e.get_name()
    
    class Pipeline
        construct(name: string)
            initialize()
            _pipeline = new Gst.Pipeline(name)
            
            // Note: Gst requires us to use the default GLib.MainContext
            var bus = _pipeline.get_bus()
            bus.add_signal_watch()
            bus.message.connect(on_message)
            
        prop pipeline: Gst.Pipeline

        event state_changed(new_state: State, old_state: State, pending_state: State)
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
        construct(decodebin: dynamic Element, next: Element)
            _next = next
            ref() // We keep a ref until our pad is added
            decodebin.pad_added.connect(on_pad_added)

        def on_pad_added(element: dynamic Element, pad: Pad)
            var name = pad.query_caps(null).get_structure(0).get_name()
            if name == "audio/x-raw"
                pad.link(_next.get_static_pad("sink"))
            element.pad_added.disconnect(on_pad_added)
            unref() // Pad added, no need for us to exist anymore
        
        _next: Element
