[indent=4]

uses
    Gtk
    Khovsgol

namespace Khovsgol.GUI
    
    interface PlayListStyle: Style
        def abstract t()
    
    class GroupByAlbums: GLib.Object implements Style, PlayListStyle
        prop readonly name: string = "group_by_albums"
        prop readonly label: string = "Group by albums"
        
        def t()
            pass
     
    class Compact: GLib.Object implements Style, PlayListStyle
        prop readonly name: string = "compact"
        prop readonly label: string = "Compact"
        
        def t()
            pass
     
    class Extended: GLib.Object implements Style, PlayListStyle
        prop readonly name: string = "extended"
        prop readonly label: string = "Extended"
        
        def t()
            pass

