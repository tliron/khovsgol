[indent=4]

namespace Khovsgol.Filesystem
    
    class Directory: Khovsgol.Directory
        construct(path: string)
            self.path = path
    
        def override scan()
            pass

