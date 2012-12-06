#
# A few special targets:
#
# <component>.c:
#  Outputs the C code for a component into the "c/<component>" directory.
#
# dependencies.quantal:
#  Installs build dependencies for Ubuntu 12.10.
#
# dependencies.precise:
#  Installs build dependencies for Ubuntu 12.04.
#
# install.user:
#  Installs a ".desktop" file for the current user to run Khovsgol directly from
#  the build directory. DO NOT USE SUDO FOR THIS!
#
# deb:
#  Creates Debian packages for Ubuntu.
#  Make sure to set DEBSIGN_KEYID in the environment in order to sign the packages
#
# deb.pbuilder:
#  Creates Debian packages for Ubuntu in a pbuilder environment.
#

SRC=src
BIN=bin
RESOURCES=resources
DEBIAN=debian/khovsgol

all: khovsgold khovsgolc khovsgol

clean: deb.clean
	$(RM) -rf $(BIN)/*
	$(RM) -rf c/*

install.user:
	sed "s|/usr/bin/|$(CURDIR)/bin/|g" "$(RESOURCES)/khovsgol.desktop" > ~/.local/share/applications/khovsgol.desktop
	cp "$(RESOURCES)/khovsgol.svg" ~/.local/share/icons/

dependencies.quantal:
	sudo apt-get install \
		valac-0.18 \
		libgee-dev \
		libsoup2.4-dev \
		libjson-glib-dev \
		libsqlite3-dev \
		libgtk-3-dev \
		libdaemon-dev \
		libgstreamer1.0-dev \
		libunity-dev \
		libindicate-dev \
		libtagc0-dev \
		libappindicator-dev \
		libavahi-gobject-dev

dependencies.precise: .dependencies.precise.repositories dependencies.quantal

.dependencies.precise.repositories:
	sudo add-apt-repository ppa:vala-team
	sudo add-apt-repository ppa:gstreamer-developers
	sudo apt-get update

deb: .deb.prepare
	cd $(DEBIAN); debuild -k$(DEBSIGN_KEYID)

deb.pbuilder: .deb.prepare
	cd $(DEBIAN); pdebuild --debsign-k $(DEBSIGN_KEYID)

deb.clean:
	$(RM) -f debian/*.mk
	$(RM) -f debian/*.dsc
	$(RM) -f debian/*.deb
	$(RM) -f debian/*.tar.gz
	$(RM) -f debian/*.changes
	$(RM) -f debian/*.build
	$(RM) -f $(DEBIAN)/debian/files
	$(RM) -f $(DEBIAN)/debian/*.substvars
	$(RM) -f $(DEBIAN)/debian/*.log
	$(RM) -rf $(DEBIAN)/debian/tmp/
	$(RM) -rf $(DEBIAN)/debian/khovsgol-server/
	$(RM) -rf $(DEBIAN)/debian/khovsgol-cli/
	$(RM) -rf $(DEBIAN)/debian/khovsgol-gtk/
	$(RM) -rf $(DEBIAN)/src/

.deb.prepare:
	cp *.mk $(DEBIAN)/
	cp -r src $(DEBIAN)/

include components.mk
