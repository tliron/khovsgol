[indent=4]

uses
    JsonUtil

namespace Nap

    /*
     * Simplified implementation of URI templates:
     * 
     * http://tools.ietf.org/html/rfc6570
     * 
     * Variables can be specified by the "{name}" notation. Patterns
     * ending in a "*" will match any suffix.
     */
    class Template
        /*
         * True is the template does not require a regex.
         */
        def static is_trivial(pattern: string): bool
            return not pattern.has_suffix("*") and (pattern.index_of_char('{') < 0)
        
        /*
         * Renders a pattern, filling the variables in order from the
         * arguments. Note that variable names have no meaning here.
         */
        def static render(pattern: string, ...): string
            var s = new StringBuilder()
            var args = va_list()

            var start = pattern.index_of_char('{')
            if start < 0
                s.append(pattern)
            else
                var last = 0
                while start >= 0
                    var after_start = start
                    if not pattern.get_next_char(ref after_start, null)
                        break
                    var end = pattern.index_of_char('}', after_start)
                    if end >= 0
                        s.append(pattern.slice(last, start))
                        value: string = args.arg()
                        s.append(value)
                        last = end
                        if not pattern.get_next_char(ref last, null)
                            break
                        start = pattern.index_of_char('{', last)
                    else
                        break
                if last < pattern.length
                    s.append(pattern.substring(last))

            return s.str

        /*
         * Renders a pattern, filling the variables (and URI-encoding
         * them) by name from the dict.
         */
        def static renderd(pattern: string, variables: dict of string, string): string
            var s = new StringBuilder()

            var start = pattern.index_of_char('{')
            if start < 0
                s.append(pattern)
            else
                var last = 0
                while start >= 0
                    var after_start = start
                    if not pattern.get_next_char(ref after_start, null)
                        break
                    var end = pattern.index_of_char('}', after_start)
                    if end >= 0
                        s.append(pattern.slice(last, start))
                        var variable = pattern.slice(after_start, end)
                        var value = variables[variable]
                        s.append(Soup.URI.encode(Soup.URI.encode(value, null), null))
                        last = end
                        if not pattern.get_next_char(ref last, null)
                            break
                        start = pattern.index_of_char('{', last)
                    else
                        break
                if last < pattern.length
                    s.append(pattern.substring(last))

            return s.str

        construct(pattern: string) raises RegexError
            var p = pattern
            var regex = new StringBuilder("^")
            
            wildcard: bool = false
            if p.has_suffix("*")
                p = p.substring(0, -1)
                wildcard = true
                
            var start = p.index_of_char('{')
            if start < 0
                regex.append(Regex.escape_string(p))
            else
                var last = 0
                while start >= 0
                    var after_start = start
                    if not pattern.get_next_char(ref after_start, null)
                        break
                    var end = p.index_of_char('}', after_start)
                    if end >= 0
                        regex.append(Regex.escape_string(p.slice(last, start)))
                        regex.append("(?<")
                        var variable = p.slice(after_start, end)
                        _variables.add(variable)
                        regex.append(variable)
                        regex.append(">[^/]*)")
                        last = end
                        if not pattern.get_next_char(ref last, null)
                            break
                        start = p.index_of_char('{', last)
                    else
                        break
                if last < p.length
                    regex.append(Regex.escape_string(p.substring(last)))
            
            if not wildcard
                regex.append("$")
                
            _regex = new Regex(regex.str)

        construct raw(regex: Regex)
            _regex = regex
    
        prop readonly regex: Regex
        prop readonly variables: list of string = new list of string
        
        /*
         * Checks if the conversation path matches the template. Note
         * that if template has variables, they will be extracted into
         * the conversation (and URI-decoded).
         */
        def matches(conversation: Conversation): bool
            info: MatchInfo
            if _regex.match(conversation.path, 0, out info)
                for variable in _variables
                    conversation.variables[variable] = Soup.URI.decode(info.fetch_named(variable))
                return true
            else
                return false
