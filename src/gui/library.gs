[indent=4]

uses
    Gtk
    Khovsgol

namespace Khovsgol.GUI
    
    class Library: Alignment
        construct(instance: Instance)
            _instance = instance
            _accel_group = new AccelGroup()

            unrealize.connect(on_unrealize)
            
            // Top
            
            var filter_box = new EntryBox("_Filter:")
            //var filter_entry = filter_box.children()[1]
            var clear_filter_button = new ControlButton(Stock.CLEAR, Gdk.Key.T, "Reset library filter\n<Alt>T", _accel_group)
            /*def on_clear(button):
                self.filter_entry.set_text('')
                self.filter_entry.emit('activate')
            clear_filter_button.connect('clicked', on_clear)*/
            filter_box.pack_start(clear_filter_button, false)
            //filter_entry.activate.connect(on_filter)

            var top_box = new Box(Orientation.HORIZONTAL, 5)
            top_box.pack_start(filter_box)

            // Assemble

            var box = new Box(Orientation.VERTICAL, 10)
            box.pack_start(top_box, false)
            //box.pack_start(tree_frame, true, true, 0)
            //box.pack_start(bottom_box, false, true, 0)
        
            add(box)
            set(0, 0, 1, 1)
        
        prop readonly accel_group: AccelGroup
            
        def private on_unrealize()
            pass
        
        /*def private on_progress_render(layout: CellLayout, renderer: CellRenderer, model: TreeModel, iter: TreeIter)
            pass
            
        def private on_markup2_render(layout: CellLayout, renderer: CellRenderer, model: TreeModel, iter: TreeIter)
            pass
            
        def private on_row_separator(mode: TreeModel, iter: TreeIter): bool
            return false

        def private on_key_pressed(event: EventKey): bool
            return false
 
        def private on_dragged(context: DragContext, selection_data: SelectionData, info: uint, time: uint)
            pass
        
        def private on_dropped(context: DragContext, x: int, y: int, selection_data: SelectionData, info: uint, time: uint)
            pass*/
            
        _instance: Instance

