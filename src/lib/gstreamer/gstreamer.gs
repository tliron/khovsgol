[indent=4]

uses
    Gst

namespace GstUtil

    PARTIAL: PadLinkCheck = PadLinkCheck.NOTHING

    def initialize()
        if not _initialized
            var arguments = new array of string[0]
            weak_arguments: weak array of string = arguments
            Gst.init(ref weak_arguments)
            _initialized = true
            _logger = Logging.get_logger("gstreamer")
            _logger.messagef("Initialized %s", Gst.version_string())

    def print_avilable_element_factories()
        var l = ElementFactory.list_get_elements(ElementFactoryType.ANY, Rank.PRIMARY)
        for var e in l
            print e.get_name()

    /*
     * Links the element only when a specific src pad type appears on it.
     * Useful for decodebin and similarly dynamic elements.
     * Uses fewer of the usual safety checks for linking.
     * 
     * The link is handled via the pad_added signal.
     */
    def link_on_demand(element: Element, next: Element, pad_type: string = "audio/x-raw", once: bool = false)
        new LinkOnDemand(element, next, pad_type, once)
    
    /*
     * Requests a new src pad and links it to the next element.
     * Useful for tee elements.
     * Uses fewer of the usual safety checks for linking.
     */
    def link_new(element: Element, next: Element): bool
        var src = element.get_request_pad("src_%u")
        if src is null
            _logger.warningf("Could not request src pad: %s", element.name)
            return false
        var sink = next.get_static_pad("sink")
        if sink is null
            _logger.warningf("Could not get sink pad: %s", next.name)
            return false
        return src.link(sink, PARTIAL) == PadLinkReturn.OK

    /*
     * Links two elements using fewer of the usual safety checks for linking.
     */
    def link_partial(element: Element, next: Element): bool
        return element.link_pads("src", next, "sink", PARTIAL)
    
    /*
     * Enhanced Pipeline class.
     * 
     * Important: pipelines are not allowed to be detroyed if their state is not NULL,
     * and unfortunately setting the state may not happen synchronously. To make sure
     * that the pipline stays referenced until it is NULL, use the nullify() method.
     * Example:
     * 
     *  var pipeline = new Pipeline("Player")
     *  ...
     *  pipeline.nullify(pipeline) // after this call, we can safely unref
     *  pipline = null
     * 
     * Or, just use the PipelineContainer class, which will make sure to call nullify().
     */
    class Pipeline: Gst.Pipeline
        construct(name: string)
            initialize()

            GLib.Object(name: name)
            
            // Note: Gst requires us to use the *default* GLib.MainContext in order to get messages
            var bus = get_bus()
            bus.add_signal_watch()
            bus.message.connect(on_message)
        
        /*
         * This should be called *before* you intend to dereference an active
         * element for the last time. It will make sure to keep a dangling
         * reference to the element until it is in the NULL state.
         */
        def nullify(element: Element)
            element.ref_count++
            element.set_data("GstUtil.nullify", new GLib.Object())
            if element.current_state != State.NULL
                var result = element.set_state(State.NULL)
                if result == StateChangeReturn.SUCCESS
                    _logger.infof("Nullified element: %s", element.name)
                    element.unref()
                else if result == StateChangeReturn.ASYNC
                    // The unref will happen in on_message()
                    _logger.infof("Nullifying element: %s", element.name)
                else
                    // This is bad! We'll keep the element in memory to avoid
                    // failure, but it is a memory leak...
                    _logger.warningf("Could not nullify element: %s", element.name)
            else
                _logger.infof("Nullified element: %s", element.name)
                element.unref()

        prop state: State
            get
                return current_state
                /*state: State
                pending_state: State
                if get_state(out state, out pending_state, CLOCK_TIME_NONE) == StateChangeReturn.SUCCESS
                    return state
                else
                    return State.VOID_PENDING*/
            set
                set_state(value)

        prop readonly duration: int64
            get
                // Note: this will emit a warning if not all elements are linked,
                // but it's safe
                duration: int64
                if query_duration(Gst.Format.TIME, out duration)
                    return duration
                else
                    return int64.MIN

        prop position: int64
            get
                // Note: this will emit a warning if not all elements are linked,
                // but it's safe
                position: int64
                if query_position(Format.TIME, out position)
                    return position
                else
                    return int64.MIN
            set
                if state != State.NULL // avoids warnings
                    seek_simple(Format.TIME, SeekFlags.FLUSH, value)

        event state_change(source: Gst.Object, old_state: State, new_state: State, pending_state: State)
        event stream_start(source: Gst.Object)
        event eos(source: Gst.Object)
        event tag(tag_list: TagList)
        event error(source: Gst.Object, error: GLib.Error, text: string)
        
        def add_branch(branch: Element): bool
            if not add(branch)
                _logger.warningf("Could not add branch: %s", branch.name)
                return false
                
            // Link to tee element
            var tee = get_by_name("Tee")
            if tee is not null
                if not link_new(tee, branch)
                    _logger.warningf("Could not link elements: %s, %s", tee.name, branch.name)

            branch.set_state(state)
            return true
            
        def remove_safely(element: Element)
            // Snip
            _logger.infof("Removing element: %s", element.name)
            var snip = new Snip(element)
            element.set_data("GstUtil.Snip", snip)
            snip.drain.connect(on_drained)
            
        def private on_drained(element: Element)
            // Safe to remove now
            element.set_data("GstUtil.Snip", null)
            
            var sink = element.get_static_pad("sink")
            if sink is null
                _logger.warningf("Could not get sink pad: %s", element.name)
                return
            var src = sink.get_peer()
            if src is null
                _logger.warningf("Could not get sink's peer: %s", element.name)
                return
            if not src.unlink(sink)
                _logger.warningf("Could not unlink pads: %s, %s", src.name, sink.name)
                return
            var previous = src.get_parent_element()
            if previous is null
                _logger.warningf("Could not get pad's parent: %s", src.name)
                return
            // TODO: make sure it's a request pad!
            previous.release_request_pad(src)
                
            if not ((Bin) element.parent).remove(element)
                _logger.warningf("Could not remove element: %s", element.name)
                return
            
            nullify(element)
            _logger.infof("Removed element: %s", element.name)

        def private on_message(message: Message)
            // See: http://gstreamer.freedesktop.org/data/doc/gstreamer/head/gstreamer/html/gstreamer-GstMessage.html
            var type = message.type
            if type == MessageType.STATE_CHANGED
                new_state: State
                old_state: State
                pending_state: State
                message.parse_state_changed(out old_state, out new_state, out pending_state)
                
                nullify: GLib.Object? = message.src.get_data("GstUtil.nullify")
                if (nullify is not null) and (new_state == State.NULL)
                    _logger.infof("Element nullified: %s", message.src.name)
                    message.src.set_data("GstUtil.nullify", null)
                    message.src.unref()
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

    /*
     * Makes sure to nullify() the contained pipeline when finalized.
     */
    class PipelineContainer: GLib.Object
        construct(pipeline: Pipeline)
            _pipeline = pipeline
    
        final
            _pipeline.nullify(_pipeline)
    
        prop readonly pipeline: Pipeline

    class private LinkOnDemand: GLib.Object
        construct(element: dynamic Element, next: Element, pad_type: string, once: bool)
            _next = next
            _pad_type = pad_type
            _once = once
            element.set_data("GstUtil.LinkOnDemand", self)
            element.pad_added.connect(on_pad_added)
        
        def on_pad_added(element: dynamic Element, pad: Pad)
            var caps = pad.query_caps(null)
            if caps is not null
                structure: unowned Structure = caps.get_structure(0)
                if structure is not null
                    var name = structure.get_name()
                    if name == _pad_type
                        var sink = _next.get_static_pad("sink")
                        if sink is not null
                            if pad.link(sink, PARTIAL) == PadLinkReturn.OK
                                _logger.infof("Linked on demand: %s, %s", element.name, _next.name)
                            else
                                _logger.warningf("Could not link elements: %s, %s", element.name, _next.name)
                        else
                            _logger.warningf("Could not get sink pad: %s", _next.name)
                
                        if _once
                            element.pad_added.disconnect(on_pad_added)
                            element.set_data("GstUtil.LinkOnDemand", null)
        
        _next: Element
        _pad_type: string
        _once: bool

    /*
     * Blocks the pad, sends an EOS to the element downstream, and waits for
     * the EOS to arrive at the other side, signifying that the element
     * is properly drained.
     * 
     * This is necessary in order to dynamically remove elements.
     * 
     * See: http://gstreamer.freedesktop.org/data/doc/gstreamer/head/manual/html/section-dynamic-pipelines.html
     */
    class private Snip: GLib.Object
        construct(element: Element)
            // Block the upstream src
            var sink = element.get_static_pad("sink")
            if sink is null
                _logger.warningf("Could not get sink pad: %s", element.name)
                return
            var src = sink.get_peer()
            if src is null
                _logger.warningf("Could not get sink's peer: %s", sink.name)
                return

            // BLOCK_DOWNSTREAM = BLOCK|DATA_DOWNSTREAM
            // DATA_DOWNSTREAM = TYPE_BUFFER|TYPE_BUFFER_LIST|EVENT_DOWNSTREAM
            _probe_id = src.add_probe(PadProbeType.BLOCK|PadProbeType.BUFFER|PadProbeType.BUFFER_LIST|PadProbeType.EVENT_DOWNSTREAM, on_blocked)
            
        event drain(element: Element)
    
        _probe_id: ulong
        
        def private on_blocked(pad: Pad, info: PadProbeInfo): PadProbeReturn
            _logger.debug("Pad blocked")
            pad.remove_probe(_probe_id)

            var sink = pad.get_peer()
            if sink is null
                _logger.warningf("Could not get pad's peer: %s", pad.name)
                return PadProbeReturn.DROP
            var next = sink.get_parent_element()
            if next is null
                _logger.warningf("Could not get pad's parent: %s", sink.name)
                return PadProbeReturn.DROP
            
            var src = next.get_static_pad("src")
            if src is not null
                // Wait for EOS event at next src (if we have one)
                _logger.debug("Sending EOS and waiting for it to arrive at the other side")
                _probe_id = src.add_probe(PadProbeType.BLOCK|PadProbeType.EVENT_DOWNSTREAM, on_event)
                sink.send_event(new Event.eos())
            else
                _logger.debug("Sending EOS")
                sink.send_event(new Event.eos())
                drain(next)

            return PadProbeReturn.OK

        def private on_event(pad: Pad, info: PadProbeInfo): PadProbeReturn
            _logger.debug("Event on pad")
            var @event = gst_pad_probe_info_get_event(&info)
            if (@event is not null) and (@event->type == EventType.EOS)
                _logger.debug("EOS arrived")
                pad.remove_probe(_probe_id)
                var element = pad.get_parent_element()
                if element is null
                    _logger.warningf("Could not get pad's parent: %s", pad.name)
                    return PadProbeReturn.DROP
                drain(element)
                return PadProbeReturn.DROP
            else
                return PadProbeReturn.OK
        
    _logger: Logging.Logger

    _initialized: private bool = false

def extern gst_pad_probe_info_get_event(info: PadProbeInfo*): Event*
