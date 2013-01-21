
# Default to using the current distribution
DISTRIBUTION=$(shell lsb_release --short --code)

dsc: .debian.prepare
ifdef DEBSIGN_KEYID
	cd $(DEBIAN); debuild -S -k$(DEBSIGN_KEYID)
else
	cd $(DEBIAN); debuild -S
endif

deb: .debian.prepare
ifdef DEBSIGN_KEYID
	cd $(DEBIAN); debuild -b -k$(DEBSIGN_KEYID)
else
	cd $(DEBIAN); debuild -b
endif

deb.pbuilder: .debian.prepare
ifdef DEBSIGN_KEYID
	cd $(DEBIAN); pdebuild --debsign-k $(DEBSIGN_KEYID) --buildresult $(shell pwd)/debian
else
	cd $(DEBIAN); pdebuild --buildresult $(shell pwd)/debian
endif

debian.clean:
	$(RM) -f $(DEBIAN)/README
	$(RM) -f $(DEBIAN)/Makefile
	$(RM) -f $(DEBIAN)/*.mk
	$(RM) -rf $(DEBIAN)/src/
	$(RM) -rf $(DEBIAN)/resources/
	$(RM) -rf $(DEBIAN)/bin/
	$(RM) -f $(DEBIAN)/debian/changelog
	$(RM) -f $(DEBIAN)/debian/files
	$(RM) -f $(DEBIAN)/debian/*.substvars
	$(RM) -f $(DEBIAN)/debian/*.log
	$(RM) -rf $(DEBIAN)/debian/tmp/
	$(RM) -rf $(DEBIAN)/debian/khovsgol-server/
	$(RM) -rf $(DEBIAN)/debian/khovsgol-receiver/
	$(RM) -rf $(DEBIAN)/debian/khovsgol-cli/
	$(RM) -rf $(DEBIAN)/debian/khovsgol-gtk/
	$(RM) -f debian/*.dsc
	$(RM) -f debian/*.deb
	$(RM) -f debian/*.tar.gz
	$(RM) -f debian/*.changes
	$(RM) -f debian/*.build
	$(RM) -f debian/*.upload

.debian.prepare:
	cp README $(DEBIAN)/
	cp Makefile $(DEBIAN)/
	cp *.mk $(DEBIAN)/
	cp -r src $(DEBIAN)/
	cp -r resources $(DEBIAN)/
	sed "s|%DISTRIBUTION%|$(DISTRIBUTION)|g" $(DEBIAN)/debian/changelog.template > $(DEBIAN)/debian/changelog
