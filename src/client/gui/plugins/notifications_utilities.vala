
namespace Khovsgol.GUI.Plugins {

    /*
     * Written in Vala due to Genie limitation, see: https://bugzilla.gnome.org/show_bug.cgi?id=687703
     */
    [DBus(name="org.freedesktop.Notifications")]
    private interface Notifications: Object {
        public abstract uint32 Notify(string app_name, uint32 replaces_id, string app_icon, string summary, string body, string[] actions, HashTable<string, Variant> hints, int32 expires_timeout) throws IOError;
        public signal void NotificationClosed(uint32 id, uint32 reason);
        public signal void ActionInvoked(uint32 id, string action_key);
    }
}
