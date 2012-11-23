[indent=4]

uses
    Gtk
    Khovsgol

namespace Khovsgol.GUI
    
    interface Style: GLib.Object
        prop abstract readonly name: string
        prop abstract readonly label: string

    interface LibraryStyle: Style
        def abstract t()
    
    class ArtistsAndTheirAlbums: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "artists_albums"
        prop readonly label: string = "Artists and their albums"
        
        def t()
            pass
     
    class ArtistsAndTheirTracks: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "artists_tracks"
        prop readonly label: string = "Artists and their tracks"
        
        def t()
            pass
     
    class YearsAndAlbums: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "years_albums"
        prop readonly label: string = "Years and albums"
        
        def t()
            pass
     
    class AllAlbums: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "albums"
        prop readonly label: string = "All albums"
        
        def t()
            pass
     
    class CustomCompilations: GLib.Object implements Style, LibraryStyle
        prop readonly name: string = "custom_albums"
        prop readonly label: string = "Custom compilations"
        
        def t()
            pass
