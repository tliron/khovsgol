
/*
 * There is a typo in "avahi-gobject/ga-entry-group.h" for the GaEntryGroupState enum, "COLLISTION"
 * is used instead of "COLLISION".
 * 
 * Our workaround is to create a vapi for the AvahiEntryGroupState enum directly.
 */
namespace Avahi {
    [CCode(cheader_filename="avahi-common/defs.h", cprefix="AVAHI_ENTRY_GROUP_", cname="AvahiEntryGroupState")]
    enum DirectEntryGroupState {
        [CCode(cname="AVAHI_ENTRY_GROUP_UNCOMMITED")]
        UNCOMMITED,
        [CCode(cname="AVAHI_ENTRY_GROUP_REGISTERING")]
        REGISTERING,
        [CCode(cname="AVAHI_ENTRY_GROUP_ESTABLISHED")]
        ESTABLISHED,
        [CCode(cname="AVAHI_ENTRY_GROUP_COLLISION")]
        COLLISION,
        [CCode(cname="AVAHI_ENTRY_GROUP_FAILURE")]
        FAILURE
    }
}
