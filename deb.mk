
deb: .deb.prepare
	cd $(DEBIAN); debuild -k$(DEBSIGN_KEYID)

deb.pbuilder: .deb.prepare
	cd $(DEBIAN); pdebuild --debsign-k $(DEBSIGN_KEYID)

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
