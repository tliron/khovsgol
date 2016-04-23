
dependencies.xenial:
	sudo apt install \
		valac \
		libgee-0.8-dev \
		libsoup2.4-dev \
		libjson-glib-dev \
		libsqlite3-dev \
		libgtk-3-dev \
		libdaemon-dev \
		libgstreamer-plugins-base1.0-dev \
		gstreamer1.0-pulseaudio \
		libunity-dev \
		libindicate-dev \
		libtagc0-dev \
		libappindicator-dev \
		libavahi-gobject-dev

dependencies.trusty: .dependencies.saucy.repositories
	sudo apt-get install \
		valac-0.30 \
		libgee-dev \
		libsoup2.4-dev \
		libjson-glib-dev \
		libsqlite3-dev \
		libgtk-3-dev \
		libdaemon-dev \
		libgstreamer-plugins-base1.0-dev \
		gstreamer1.0-pulseaudio \
		libunity-dev \
		libindicate-dev \
		libtagc0-dev \
		libappindicator-dev \
		libavahi-gobject-dev

dependencies.precise: .dependencies.precise.repositories dependencies.raring

.dependencies.saucy.repositories:
	sudo add-apt-repository -y ppa:wayland.admin/daily-builds
	sudo add-apt-repository -y ppa:vala-team
	sudo apt-get update

.dependencies.precise.repositories:
	sudo add-apt-repository -y ppa:gstreamer-developers
	sudo apt-get update
