
dependencies.raring: .dependencies.raring.repositories
	sudo apt-get install \
		valac-0.20 \
		libgee-dev \
		libsoup2.4-dev \
		libjson-glib-dev \
		libsqlite3-dev \
		libgtk-3-dev \
		libdaemon-dev \
		libgstreamer-plugins-base1.0-dev \
		libunity-dev \
		libindicate-dev \
		libtagc0-dev \
		libappindicator-dev \
		libavahi-gobject-dev

dependencies.precise: .dependencies.precise.repositories dependencies.raring

.dependencies.raring.repositories:
	sudo add-apt-repository ppa:vala-team
	sudo apt-get update

.dependencies.precise.repositories:
	sudo add-apt-repository ppa:gstreamer-developers
	sudo apt-get update
