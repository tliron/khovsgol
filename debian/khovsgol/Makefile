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
# uninstall.user:
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

all.c: khovsgold.c khovsgolc.c khovsgol.c

clean: deb.clean
	$(RM) -rf $(BIN)/*
	$(RM) -rf c/*

install.user:
	mkdir -p ~/.local/share/applications/
	mkdir -p ~/.local/share/icons/
	sed "s|/usr/bin/|$(CURDIR)/bin/|g" "$(RESOURCES)/khovsgol.desktop" > ~/.local/share/applications/khovsgol.desktop
	cp "$(RESOURCES)/khovsgol.svg" ~/.local/share/icons/

uninstall.user:
	$(RM) -f ~/.local/share/applications/khovsgol.desktop
	$(RM) -f ~/.local/share/icons/khovsgol.svg

include components.mk
include dependencies.mk
include deb.mk
