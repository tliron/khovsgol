[indent=4]

namespace Khovsgol
    
    class abstract Libraries: Object
        def get_library(name: string): Library
            return _libraries[name]
    
        // Tracks
        def abstract get_track(path: string): Track? raises GLib.Error
        def abstract save_track(track: Track) raises GLib.Error
        def abstract delete_track(path: string) raises GLib.Error
        
        // Track pointers
        def abstract get_track_pointer(album: string, position: int): TrackPointer? raises GLib.Error
        def abstract save_track_pointer(track_pointer: TrackPointer) raises GLib.Error
        def abstract delete_track_pointer(album: string, position: int) raises GLib.Error
        def abstract delete_track_pointers(album: string) raises GLib.Error
        def abstract move_track_pointers(album: string, delta: int, from_position: int = -1) raises GLib.Error
        
        // Albums
        def abstract get_album(path: string): Album? raises GLib.Error
        def abstract save_album(album: Album) raises GLib.Error
        def abstract delete_album(path: string) raises GLib.Error

        // Iterate tracks
        def abstract iterate_tracks(args: IterateTracksArgs): TrackIterator raises GLib.Error
        def abstract iterate_tracks_in_album(args: IterateForAlbumArgs): TrackIterator raises GLib.Error
        def abstract iterate_tracks_by_artist(args: IterateForArtistArgs): TrackIterator raises GLib.Error
        def abstract iterate_track_paths(path: string): Khovsgol.StringIterator raises GLib.Error
        
        // Iterate track pointers
        def abstract iterate_raw_track_pointers_in_album(args: IterateForAlbumArgs): TrackPointerIterator raises GLib.Error
        def abstract iterate_track_pointers_in_album(args: IterateForAlbumArgs): Khovsgol.TrackIterator raises GLib.Error
        def abstract iterate_track_pointers(args: IterateTracksArgs): Khovsgol.TrackIterator raises GLib.Error
        
        // Iterate albums
        def abstract iterate_albums(args: IterateAlbumsArgs): Khovsgol.AlbumIterator raises GLib.Error
        def abstract iterate_album_paths(path: string): Khovsgol.StringIterator raises GLib.Error
        def abstract iterate_albums_with_artist(args: IterateForArtistArgs): Khovsgol.AlbumIterator raises GLib.Error
        def abstract iterate_albums_by_artist(args: IterateForArtistArgs): Khovsgol.AlbumIterator raises GLib.Error
        def abstract iterate_albums_at(args: IterateForDateArgs): Khovsgol.AlbumIterator raises GLib.Error
        
        // Iterate artists
        def abstract iterate_artists(args: IterateByAlbumsOrTracksArgs): Khovsgol.ArtistIterator raises GLib.Error

        // Iterate dates
        def abstract iterate_dates(args: IterateByAlbumsOrTracksArgs): Khovsgol.IntIterator raises GLib.Error
        
        // Timestamps
        def abstract get_timestamp(path: string): double raises GLib.Error
        def abstract set_timestamp(path: string, timestamp: double) raises GLib.Error
        
        _libraries: dict of string, Library = new dict of string, Library
    
    class Library: Object
        construct(libraries: Libraries)
            _libraries = libraries
    
        def get_directory(name: string): Directory
            return _directories[name]
    
        _libraries: Libraries
        _directories: dict of string, Directory = new dict of string, Directory

    class IterateForDateArgs
        prop date: int = -1
        prop like: bool = false
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string
    
    class IterateTracksArgs
        prop title_like: string? = null
        prop artist_like: string? = null
        prop album_like: string? = null
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string
        
    class IterateForAlbumArgs
        prop album: string? = null
        prop sort: list of string = new list of string

    class IterateForArtistArgs
        prop artist: string? = null
        prop like: bool = false
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string
    
    class IterateAlbumsArgs
        prop compilation_type: int = -1
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string

    class IterateByAlbumsOrTracksArgs
        prop album_artist: bool = true
        prop libraries: list of string = new list of string
        prop sort: list of string = new list of string
