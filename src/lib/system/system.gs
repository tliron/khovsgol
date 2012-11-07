[indent=4]

uses
    Posix

namespace System

    def get_n_cpus(): int
        // See: https://mail.gnome.org/archives/vala-list/2011-January/msg00004.html
        var size = CpuSet.alloc_size()
        var cpu_set = new CpuSet()
        cpu_set.zero_sized(size)
        cpu_set.getaffinity(size)
        return cpu_set.count_sized(size)
