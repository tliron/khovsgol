[indent=4]

uses
    Gtk

namespace Khovsgol.GUI

    //def get_stock_icon_pixbuf(window, name):
      //  return window.render_icon(getattr(Gtk, 'STOCK_' + name), Gtk.IconSize.MENU, None)

    class ControlButton: Button
        construct(id: string, alt_key: uint, tooltip: string, accel_group: AccelGroup)
            image = new Image.from_stock(id, IconSize.BUTTON)
            relief = ReliefStyle.NONE
            add_accelerator("clicked", accel_group, alt_key, Gdk.ModifierType.MOD1_MASK, AccelFlags.VISIBLE|AccelFlags.LOCKED)
            tooltip_text = tooltip

    class ControlToolButton: ToolButton
        construct(id: string, alt_key: uint, tooltip: string, accel_group: AccelGroup)
            stock_id = id
            add_accelerator("clicked", accel_group, alt_key, Gdk.ModifierType.MOD1_MASK, AccelFlags.VISIBLE|AccelFlags.LOCKED)
            tooltip_text = tooltip

    class ControlToggleToolButton: ToggleToolButton
        construct(id: string, alt_key: uint, tooltip: string, accel_group: AccelGroup)
            stock_id = id
            add_accelerator("clicked", accel_group, alt_key, Gdk.ModifierType.MOD1_MASK, AccelFlags.VISIBLE|AccelFlags.LOCKED)
            tooltip_text = tooltip

    class EntryBox: Box
        construct(label: string, name: string? = null, value: string? = null)
            var entry = new Entry()
            if name is not null
                entry.name = name
            /*if sensitivity is not null
                entry.set_sensitive(sensitivity)*/
            if value is not null
                entry.text = value
            var box = new Box(Orientation.HORIZONTAL, 5)
            var l = new Label.with_mnemonic(label)
            l.use_markup = true
            l.mnemonic_widget = entry
            box.pack_start(l, false, true, 0)
            box.pack_start(entry, true, true, 0)
