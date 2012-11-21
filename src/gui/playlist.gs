[indent=4]

uses
    Gtk
    Khovsgol

namespace Khovsgol.GUI

    class PlayList: Box
        construct(instance: Instance)
            _instance = instance
            _accel_group = new AccelGroup()

            unrealize.connect(on_unrealize)
            
            // Main

            var progress_renderer = new CellRendererProgress()
            progress_renderer.width = 70

            var renderer1 = new CellRendererText()
            renderer1.ellipsize = Pango.EllipsizeMode.END // This also mysteriously enables right alignment for RTL text
            var renderer2 = new CellRendererText()
            renderer2.xalign = 1
            renderer2.alignment = Pango.Alignment.RIGHT
            var column = new TreeViewColumn()
            column.pack_start(renderer1, true)
            column.pack_start(renderer2, false)
            column.pack_start(progress_renderer, false)
            column.add_attribute(renderer1, "markup", 2)
            column.add_attribute(renderer2, "markup", 3)
            column.set_cell_data_func(progress_renderer, on_progress_render)
            column.set_cell_data_func(renderer2, on_markup2_render)

            // object, search, markup1, markup2, position
            _store = new ListStore(5, typeof(Object), typeof(string), typeof(string), typeof(string), typeof(uint))

            _tree_view = new TreeView.with_model(_store)
            _tree_view.headers_visible = false
            _tree_view.get_selection().mode = SelectionMode.MULTIPLE
            _tree_view.set_row_separator_func(on_row_separator)
            _tree_view.append_column(column)
            _tree_view.search_column = 1
            //_tree_view.enable_model_drag_source(ModifierType.BUTTON1_MASK, self.DRAG_TARGETS, Gdk.DragAction.LINK | Gdk.DragAction.MOVE)
            //_tree_view.enable_model_drag_dest(self.DROP_TARGETS, Gdk.DragAction.LINK | Gdk.DragAction.MOVE)
            //clickable_draggable_treeview(self.tree_view, self.on_right_clicked, self.on_double_clicked)
            _tree_view.key_press_event.connect(on_key_pressed)
            _tree_view.drag_data_get.connect(on_dragged)
            _tree_view.drag_data_received.connect(on_dropped)
            var tree_scrolled = new ScrolledWindow(null, null)
            tree_scrolled.add(_tree_view)
            var tree_frame = new Frame("")
            tree_frame.add(tree_scrolled)
        
        prop readonly accel_group: AccelGroup
            
        def private on_unrealize()
            pass
        
        def private on_progress_render(layout: CellLayout, renderer: CellRenderer, model: TreeModel, iter: TreeIter)
            pass
            
        def private on_markup2_render(layout: CellLayout, renderer: CellRenderer, model: TreeModel, iter: TreeIter)
            pass
            
        def private on_row_separator(mode: TreeModel, iter: TreeIter): bool
            return false

        def private on_key_pressed(event: Gdk.EventKey): bool
            return false
 
        def private on_dragged(context: Gdk.DragContext, selection_data: SelectionData, info: uint, time: uint)
            pass
        
        def private on_dropped(context: Gdk.DragContext, x: int, y: int, selection_data: SelectionData, info: uint, time: uint)
            pass
            
        _instance: Instance
        _store: ListStore
        _tree_view: TreeView
