[indent=4]

namespace Khovsgol.Client

    /*
     * Playlist files base.
     */
    class abstract PlaylistFile
        prop file: File
        prop readonly paths: list of string = new list of string
        prop abstract readonly extension: string

        def virtual to_stream(stream: DataOutputStream) raises Error
            pass

        def virtual from_stream(stream: DataInputStream) raises Error
            pass
        
        def virtual save() raises Error
            var stream = file.create(FileCreateFlags.REPLACE_DESTINATION)
            try
                to_stream(new DataOutputStream(stream))
            finally
                try
                    stream.close()
                except e: Error
                    pass

        def virtual load() raises Error
            var stream = file.read()
            try
                from_stream(new DataInputStream(stream))
            finally
                try
                    stream.close()
                except e: Error
                    pass

    /*
     * XSPF format.
     */
    class Xspf: PlaylistFile
        prop override readonly extension: string = "xspf"

        def override to_stream(stream: DataOutputStream) raises Error
            stream.put_string("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n")
            stream.put_string("<playlist version=\"1\" xmlns=\"http://xspf.org/ns/0/\">\r\n")
            stream.put_string("  <trackList>\r\n")
            for var path in paths
                var uri = File.new_for_path(path).get_uri()
                uri = uri.replace("<", "&lt;").replace(">", "&gt;")
                stream.put_string("    <track><location>%s</location></track>\r\n".printf(uri))
            stream.put_string("  </trackList>\r\n")
            stream.put_string("</playlist>\r\n")
            
        def override load() raises Error
            pass
            /*
            var reader = new XmlStreamReader(file.get_path())
            
            var in_playlist = false
            var in_tracklist = false
            var in_track = false
            var in_location = false
            
            begin: MarkupSourceLocation
            end: MarkupSourceLocation
            var token = reader.read_token(out begin, out end)
            while token != MarkupTokenType.EOF
                if (token == MarkupTokenType.START_ELEMENT) and (reader.name == "playlist")
                    in_playlist = true
                else if in_playlist and (token == MarkupTokenType.END_ELEMENT) and (reader.name == "playlist")
                    in_playlist = false
                else if in_playlist and (token == MarkupTokenType.START_ELEMENT) and (reader.name == "trackList")
                    in_tracklist = true
                else if in_tracklist and (token == MarkupTokenType.END_ELEMENT) and (reader.name == "trackList")
                    in_tracklist = false
                else if in_tracklist and (token == MarkupTokenType.START_ELEMENT) and (reader.name == "track")
                    in_track = true
                else if in_track and (token == MarkupTokenType.END_ELEMENT) and (reader.name == "track")
                    in_track = false
                else if in_track and (token == MarkupTokenType.START_ELEMENT) and (reader.name == "location")
                    in_location = true
                else if in_location and (token == MarkupTokenType.END_ELEMENT) and (reader.name == "location")
                    in_location = false
                else if in_location and (token == MarkupTokenType.TEXT)
                    var path = File.new_for_uri(reader.content).get_path()
                    paths.add(path)

                token = reader.read_token(out begin, out end)
            */

    /*
     * PLS format.
     */
    class Pls: PlaylistFile
        prop override readonly extension: string = "pls"

        def override to_stream(stream: DataOutputStream) raises Error
            stream.put_string("[playlist]\r\n")
            stream.put_string("Version=2\r\n")
            index: uint = 0
            for var path in paths
                stream.put_string("File%u=%s\r\n".printf(++index, path))
            stream.put_string("NumberOfEntries=%u\r\n".printf(index))

        def override load() raises Error
            var key_file = new KeyFile()
            key_file.load_from_file(file.get_path(), KeyFileFlags.NONE)
            var num = key_file.get_integer("playlist", "NumberOfEntries")
            if num > 0
                for index: uint = 1 to num
                    var path = key_file.get_string("playlist", "File%u".printf(index))
                    paths.add(path)

    /*
     * M3U format.
     */
    class M3u: PlaylistFile
        prop override readonly extension: string = "m3u"

        def override to_stream(stream: DataOutputStream) raises Error
            for var path in paths
                var uri = File.new_for_path(path).get_uri()
                stream.put_string("%s\r\n".printf(uri))
            
        def override from_stream(stream: DataInputStream) raises Error
            length: size_t
            var line = stream.read_line_utf8(out length)
            while line is not null
                line = line.strip()
                if (line.length == 0) or line.has_prefix("#")
                    continue
                var path = File.new_for_uri(line).get_path()
                paths.add(path)
                line = stream.read_line_utf8(out length)
