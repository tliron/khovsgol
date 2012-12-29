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
            _logger = Logging.get_logger("gstreamer")
            _logger.messagef("Initialized %s", Gst.version_string())

    def list_element_factories()
        var l = ElementFactory.list_get_elements(ElementFactoryType.ANY, Rank.PRIMARY)
        for var e in l
            print e.get_name()

    def link_on_demand(element: Element, next: Element, pad_type: string = "audio/x-raw", once: bool = false)
        new LinkOnDemand(element, next, pad_type, once)
    
    /*
     * Enhanced Pipeline class.
     * 
     * Important: pipelines are not allowed to be detroyed if their state is not null,
     * and unfortunately setting the state is not necessarily synchronous. The correct
     * way to derefence a pipeline is:
     * 
     *  var pipeline = new Pipeline("Player")
     *  ...
     *  pipeline.kill()
     *  pipline = null
     * 
     * Or, just use the PipelineContainer class, which will make sure to call kill().
     */
    class Pipeline: Gst.Pipeline
        construct(name: string)
            initialize()

            GLib.Object(name: name)
            
            // Note: Gst requires us to use the *default* GLib.MainContext in order to get messages
            var bus = get_bus()
            bus.add_signal_watch()
            bus.message.connect(on_message)
        
        def kill()
            if state != State.NULL
                var result = set_state(State.NULL)
                if result == StateChangeReturn.ASYNC
                    // We'll have to do it later
                    _logger.infof("Killing pipeline: %s", name)
                    ref()
                    _dying = true
                else if result == StateChangeReturn.SUCCESS
                    _logger.infof("Killed pipeline: %s", name)
                else
                    // This is bad! We'll keep the pipeline in memory to avoid
                    // failure, but it is a memory leak...
                    _logger.warningf("Could not kill pipeline: %s", name)
                    ref()
            else
                _logger.infof("Killed pipeline: %s", name)

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
                    _logger.infof("Pipeline died: %s", name)
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

    /*
     * Makes sure to kill() the pipeline when finalized.
     */
    class PipelineContainer: GLib.Object
        construct(pipeline: Pipeline)
            _pipeline = pipeline
    
        final
            _pipeline.kill()
    
        prop readonly pipeline: Pipeline

    class private LinkOnDemand: GLib.Object
        construct(element: dynamic Element, next: Element, pad_type: string, once: bool)
            _next = next
            _pad_type = pad_type
            _once = once
            element.pad_added.connect(on_pad_added)
            element.set_data("GstUtil.LinkOnDemand", self)

        def on_pad_added(element: dynamic Element, pad: Pad)
            var caps = pad.query_caps(null)
            if caps is not null
                var structure = caps.get_structure(0)
                if structure is not null
                    var name = structure.get_name()
                    if name == _pad_type
                        pad.link(_next.get_static_pad("sink"))
                
                        if _once
                            element.pad_added.disconnect(on_pad_added)
                            element.set_data("GstUtil.LinkOnDemand", null)
        
        _next: Element
        _pad_type: string
        _once: bool
        
    _logger: Logging.Logger

    _initialized: private bool = false
