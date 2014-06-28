#
# Expected variables for this template: SRC, BIN
#

find-sources=$(shell find "$(SRC)/$1" \( -name '*.gs' -o -name '*.vala' \))

#
# Vala packages and their Ubuntu dependencies:
#
# Gee:          apt-get install libgee-dev            valac --pkg=gee-1.0
# Soup:         apt-get install libsoup2.4-dev        valac --pkg=libsoup-2.4
# Json:         apt-get install libjson-glib-dev      valac --pkg=json-glib-1.0
# Sqlite:       apt-get install libsqlite3-dev        valac --pkg=sqlite3
# Posix:                                              valac --pkg=posix --Xcc=-D_GNU_SOURCE
# Gtk:          apt-get install libgtk-3-dev          valac --pkg=gtk+-3.0
# Daemon:       apt-get install libdaemon-dev         valac --pkg=libdaemon
# Gst:          apt-get install libgstreamer1.0-dev   valac --pkg=gstreamer-1.0
# Unity:        apt-get install libunity-dev          valac --pkg=unity
# Indicate:     apt-get install libindicate-dev       valac --pkg=Indicate-0.7 --Xcc=-I/usr/include/libindicate-0.7 --Xcc=-lindicate
# TagLib:       apt-get install libtagc0-dev          valac --pkg=taglib_c
# AppIndicator: apt-get install libappindicator-dev   valac --pkg=appindicator-0.1
# Avahi:        apt-get install libavahi-gobject-dev  valac --pkg=avahi-gobject
#
# gstreamer1.0-pulseaudio, gstreamer1.0-features-base
#

#
# valac notes:
#
# 1) We are using --target-glib=2.32 in order to support GLib.Mutex as struct.
#
# 2) We are forwarding the defined C compiler flags to valac.
# See: http://wiki.debian.org/Hardening#Notes_for_packages_using_Vala
#

VALAC=valac \
	--basedir=$(SRC) \
	--vapidir=$(SRC) \
	--directory=$(BIN) \
	--thread \
	--debug \
	--target-glib=2.32 \
	--Xcc=-w \
	--Xcc=-lm \
	$(foreach w,$(CPPFLAGS) $(CFLAGS) $(LDFLAGS),-X $(w))

VALAC.C=valac \
	--ccode \
	--basedir=$(SRC) \
	--vapidir=$(SRC) \
	--thread \
	--debug \
	--target-glib=2.32 \
	--Xcc=-w \
	$(foreach w,$(CPPFLAGS) $(CFLAGS) $(LDFLAGS),-X $(w))

#
# khovsgold
#

KHOVSGOLD_SOURCES=\
	$(call find-sources,server) \
	$(SRC)/version.gs $(SRC)/models.gs $(SRC)/iterators.gs $(SRC)/utilities.gs \
	$(call find-sources,lib/logging) \
	$(call find-sources,lib/console) \
	$(call find-sources,lib/nap) \
	$(call find-sources,lib/json) \
	$(call find-sources,lib/avahi) \
	$(call find-sources,lib/sqlite) \
	$(call find-sources,lib/gstreamer) \
	$(call find-sources,lib/daemonize) \
	$(call find-sources,lib/system)

KHOVSGOLD_PACKAGES=\
	--pkg=libsoup-2.4 \
	--pkg=gee-1.0 \
	--pkg=json-glib-1.0 \
	--pkg=posix --Xcc=-D_GNU_SOURCE \
	--pkg=sqlite3 \
	--pkg=libdaemon \
	--pkg=gstreamer-audio-1.0 \
	--pkg=taglib_c \
	--pkg=avahi-gobject --pkg=lib/avahi/avahi-direct

khovsgold:
	$(VALAC) --output=khovsgold $(KHOVSGOLD_SOURCES) $(KHOVSGOLD_PACKAGES)

khovsgold.ccode:
	$(VALAC.C) --directory=c/khovsgold $(KHOVSGOLD_SOURCES) $(KHOVSGOLD_PACKAGES)

#
# khovsgolr
#

KHOVSGOLR_SOURCES=\
	$(call find-sources,receiver) \
	$(SRC)/version.gs $(SRC)/models.gs \
	$(call find-sources,lib/logging) \
	$(call find-sources,lib/console) \
	$(call find-sources,lib/nap) \
	$(call find-sources,lib/json) \
	$(call find-sources,lib/gstreamer) \
	$(call find-sources,lib/daemonize)

KHOVSGOLR_PACKAGES=\
	--pkg=libsoup-2.4 \
	--pkg=gee-1.0 \
	--pkg=json-glib-1.0 \
	--pkg=posix --Xcc=-D_GNU_SOURCE \
	--pkg=libdaemon \
	--pkg=gstreamer-audio-1.0

khovsgolr:
	$(VALAC) --output=khovsgolr $(KHOVSGOLR_SOURCES) $(KHOVSGOLR_PACKAGES)

khovsgolr.ccode:
	$(VALAC.C) --directory=c/khovsgolr $(KHOVSGOLR_SOURCES) $(KHOVSGOLR_PACKAGES)

#
# khovsgolc
#

KHOVSGOLC_SOURCES=\
	$(call find-sources,client/cli) \
	$(SRC)/client/client.gs $(SRC)/client/api.gs $(SRC)/client/utilities.gs \
	$(SRC)/version.gs $(SRC)/models.gs $(SRC)/iterators.gs \
	$(call find-sources,lib/logging) \
	$(call find-sources,lib/console) \
	$(call find-sources,lib/nap) \
	$(call find-sources,lib/json) \
	$(call find-sources,lib/avahi)

KHOVSGOLC_PACKAGES=\
	--pkg=libsoup-2.4 \
	--pkg=gee-1.0 \
	--pkg=json-glib-1.0 \
	--pkg=posix --Xcc=-D_GNU_SOURCE \
	--pkg=avahi-gobject --pkg=lib/avahi/avahi-direct

khovsgolc:
	$(VALAC) --output=khovsgolc $(KHOVSGOLC_SOURCES) $(KHOVSGOLC_PACKAGES)

khovsgolc.ccode:
	$(VALAC.C) --directory=c/khovsgolc $(KHOVSGOLC_SOURCES) $(KHOVSGOLC_PACKAGES)

#
# khovsgol
#

KHOVSGOL_SOURCES=\
	$(call find-sources,client/gtk) \
	$(call find-sources,client/features) \
	$(SRC)/client/client.gs $(SRC)/client/configuration.gs $(SRC)/client/api.gs $(SRC)/client/utilities.gs $(SRC)/client/playlist.gs \
	$(SRC)/server/configuration.gs \
	$(SRC)/receiver/configuration.gs \
	$(SRC)/version.gs $(SRC)/models.gs $(SRC)/iterators.gs $(SRC)/utilities.gs \
	$(call find-sources,lib/logging) \
	$(call find-sources,lib/console) \
	$(call find-sources,lib/nap) \
	$(call find-sources,lib/json) \
	$(call find-sources,lib/dbus) \
	$(call find-sources,lib/gtk) \
	$(call find-sources,lib/avahi) \
	$(call find-sources,lib/xml) \
	$(call find-sources,lib/scrobbling)

KHOVSGOL_PACKAGES=\
	--pkg=libsoup-2.4 \
	--pkg=gee-1.0 \
	--pkg=json-glib-1.0 \
	--pkg=posix --Xcc=-D_GNU_SOURCE \
	--pkg=sqlite3 \
	--pkg=gtk+-3.0 \
	--pkg=unity \
	--pkg=Indicate-0.7 --Xcc=-I/usr/include/libindicate-0.7 --Xcc=-lindicate \
	--pkg=avahi-gobject --pkg=lib/avahi/avahi-direct

khovsgol:
	$(VALAC) --output=khovsgol $(KHOVSGOL_SOURCES) $(KHOVSGOL_PACKAGES)

khovsgol.ccode:
	$(VALAC.C) --directory=c/khovsgol $(KHOVSGOL_SOURCES) $(KHOVSGOL_PACKAGES)
