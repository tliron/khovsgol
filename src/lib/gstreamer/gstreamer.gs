[indent=4]

uses
    Gst

namespace GstUtilities

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
        prop on_state_changed: unowned OnStateChanged?
        prop on_eos: unowned OnEOS?
        prop on_tag: unowned OnTag?
        prop on_error: unowned OnError?

        def private on_message(message: Message)
            var type = message.type
            if type == MessageType.STATE_CHANGED
                if on_state_changed is not null
                    new_state: State
                    old_state: State
                    pending_state: State
                    message.parse_state_changed(out new_state, out old_state, out pending_state)
                    on_state_changed(new_state, old_state, pending_state)
            else if type == MessageType.EOS
                if on_eos is not null
                    on_eos()
            else if type == MessageType.TAG
                if on_tag is not null
                    tag_list: TagList
                    message.parse_tag(out tag_list)
                    on_tag(tag_list)
            else if type == MessageType.ERROR
                if on_error is not null
                    error: GLib.Error
                    text: string
                    message.parse_error(out error, out text)
                    on_error(error, text)
        
        delegate OnStateChanged(new_state: State, old_state: State, pending_state: State)
        delegate OnEOS()
        delegate OnTag(tag_list: TagList)
        delegate OnError(error: GLib.Error, text: string)

    class LinkDecodeBinLater: GLib.Object
        construct(decodebin: dynamic Element, next: Element)
            _next = next
            ref()
            decodebin.pad_added.connect(on_pad_added)

        def on_pad_added(element: dynamic Element, pad: Pad)
            var name = pad.query_caps(null).get_structure(0).get_name()
            if name == "audio/x-raw"
                pad.link(_next.get_static_pad("sink"))
            element.pad_added.disconnect(on_pad_added)
            unref()
        
        _next: Element
