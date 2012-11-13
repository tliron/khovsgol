[indent=4]

namespace Khovsgol
    
    class abstract Libraries: Object
        def get_library(name: string): Library
            return _libraries[name]
    
        def abstract get_track(path: string): Track? raises GLib.Error
        def abstract save_track(track: Track) raises GLib.Error
        def abstract delete_track(path: string) raises GLib.Error
        
        def abstract get_track_pointer(album: string, position: int): TrackPointer? raises GLib.Error
        def abstract save_track_pointer(track_pointer: TrackPointer) raises GLib.Error
        def abstract delete_track_pointer(album: string, position: int) raises GLib.Error
        def abstract delete_track_pointers(album: string) raises GLib.Error
        def abstract move_track_pointers(album: string, delta: int, from_position: int = -1) raises GLib.Error
        
        def abstract get_album(path: string): Album? raises GLib.Error
        def abstract save_album(album: Album) raises GLib.Error
        def abstract delete_album(path: string) raises GLib.Error

        def abstract iterate_tracks(args: IterateTracksArgs): TrackIterator raises GLib.Error
        def abstract iterate_tracks_in_album(args: IterateTracksInAlbumArgs): TrackIterator raises GLib.Error
        def abstract iterate_tracks_by_artist(args: IterateTracksByArtistArgs): TrackIterator raises GLib.Error
        
        _libraries: dict of string, Library = new dict of string, Library
    
    class Library: Object
        construct(libraries: Libraries)
            _libraries = libraries
    
        def get_directory(name: string): Directory
            return _directories[name]
    
        _libraries: Libraries
        _directories: dict of string, Directory = new dict of string, Directory

    class IterateTracksArgs
        prop title_like: string? = null
        prop artist_like: string? = null
        prop album_like: string? = null
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string
        
    class IterateTracksInAlbumArgs
        prop album: string? = null
        prop sort: list of string = new list of string

    class IterateTracksByArtistArgs
        prop artist: string? = null
        prop like: bool = false
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string
    
