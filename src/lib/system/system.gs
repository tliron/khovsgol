[indent=4]

namespace System

    def get_n_cpus(): int
        // See: https://mail.gnome.org/archives/vala-list/2011-January/msg00004.html

        var size = Posix.CpuSet.alloc_size()
        var cpu_set = new Posix.CpuSet()
        cpu_set.zero_sized(size)
        cpu_set.getaffinity(size)
        return cpu_set.count_sized(size)

    def get_hostname(): string
        // TODO: support IPv6, see http://stackoverflow.com/questions/504810/how-do-i-find-the-current-machines-full-hostname-in-c-hostname-and-domain-info
        var hostname = new array of char[1024]
        Posix.gethostname(hostname)
        return (string) hostname
