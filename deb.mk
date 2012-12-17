
# Default to using the current distribution
DISTRIBUTION=$(shell lsb_release --short --code)

dsc: .deb.prepare
	cd $(DEBIAN); debuild -S -k$(DEBSIGN_KEYID)

deb: .deb.prepare
	cd $(DEBIAN); debuild -b -k$(DEBSIGN_KEYID)

dsc.pbuilder: .deb.prepare
	cd $(DEBIAN); pdebuild -S --debsign-k $(DEBSIGN_KEYID)

deb.pbuilder: .deb.prepare
	cd $(DEBIAN); pdebuild -b --debsign-k $(DEBSIGN_KEYID)

deb.clean:
	$(RM) -f $(DEBIAN)/README
	$(RM) -f $(DEBIAN)/Makefile
	$(RM) -f $(DEBIAN)/*.mk
	$(RM) -rf $(DEBIAN)/src/
	$(RM) -rf $(DEBIAN)/resources/
	$(RM) -f debian/*.dsc
	$(RM) -f debian/*.deb
	$(RM) -f debian/*.tar.gz
	$(RM) -f debian/*.changes
	$(RM) -f debian/*.build
	$(RM) -f debian/*.upload
	$(RM) -f $(DEBIAN)/debian/files
	$(RM) -f $(DEBIAN)/debian/*.substvars
	$(RM) -f $(DEBIAN)/debian/*.log
	$(RM) -rf $(DEBIAN)/debian/tmp/
	$(RM) -rf $(DEBIAN)/debian/khovsgol-server/
	$(RM) -rf $(DEBIAN)/debian/khovsgol-cli/
	$(RM) -rf $(DEBIAN)/debian/khovsgol-gtk/

.deb.prepare:
	cp README $(DEBIAN)/
	cp Makefile $(DEBIAN)/
	cp *.mk $(DEBIAN)/
	cp -r src $(DEBIAN)/
	cp -r resources $(DEBIAN)/
	sed "s|%DISTRIBUTION%|$(DISTRIBUTION)|g" $(DEBIAN)/debian/changelog.template > $(DEBIAN)/debian/changelog
