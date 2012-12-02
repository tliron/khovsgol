[indent=4]

namespace Khovsgol.GUI.Plugins

        [DBus(name="org.mpris.MediaPlayer2")]
        class MprisRoot: Object
            prop readonly CanQuit: bool
                get
                    return true

            prop readonly CanRaise: bool
                get
                    return true

            prop readonly HasTrackList: bool
                get
                    return false

            prop readonly DesktopEntry: string
                get
                    return "khovsgol"

            prop readonly Identity: string
                owned get
                    return "Khövsgöl"

            prop readonly SupportedUriSchemes: array of string
                owned get
                    return {"http", "file", "https", "ftp"}

            prop readonly SupportedMimeTypes: array of string
                owned get
                    return {"application/x-ogg",
                        "application/ogg",
                        "video/3gpp",
                        "video/avi",
                        "video/dv",
                        "video/fli",
                        "video/flv",
                        "video/mp4",
                        "video/mp4v-es",
                        "video/mpeg",
                        "video/msvideo",
                        "video/ogg",
                        "video/quicktime",
                        "video/vivo",
                        "video/vnd.divx",
                        "video/vnd.vivo",
                        "video/x-anim",
                        "video/x-avi",
                        "video/x-flc",
                        "video/x-fli",
                        "video/x-flic",
                        "video/x-flv",
                        "video/x-m4v",
                        "video/x-matroska",
                        "video/x-mpeg",
                        "video/x-mpg",
                        "video/x-ms-asf",
                        "video/x-msvideo",
                        "video/x-ms-wm",
                        "video/x-ms-wmv",
                        "video/x-ms-wmx",
                        "video/x-ms-wvx",
                        "video/x-nsv",
                        "video/x-ogm+ogg",
                        "video/x-theora",
                        "video/x-theora+ogg",
                        "audio/x-vorbis+ogg",
                        "audio/x-scpls",
                        "audio/x-mp3",
                        "audio/x-mpeg",
                        "audio/mpeg",
                        "audio/x-mpegurl",
                        "audio/x-flac",
                        "x-content/audio-cdda",
                        "x-content/audio-player"}

            def Quit()
                pass

            def Raise()
                pass
