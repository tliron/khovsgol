
SRC=src
BIN=bin
RESOURCES=resources
DEBIAN=debian/khovsgol

all: khovsgold khovsgolc khovsgol

all.ccode: khovsgold.ccode khovsgolc.ccode khovsgol.ccode

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
include debianized.mk
