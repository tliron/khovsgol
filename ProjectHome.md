# Khövsgöl #

Download packages for Ubuntu from our [repository](https://launchpad.net/~emblem-parade/+archive/khovsgol).

#### Lean and Mean ####

At first glance, Khövsgöl is yet another easy-to-use, fast, flexible music player and library/playlist organizer that can handle even very large music libraries with ease. If you're a demanding minimalist -- like the author -- you will love Khövsgöl.

  * Simple two-pane user interface: your current playlist is on the left and your library is on the right, and you can drag and drop between them.
  * Yes, you can even drag _from_ your playlist _to_ your library. In Khövsgöl your saved playlists appear as "custom compilations" in your library, which you can edit in-place.
  * Switch between multiple styles for viewing each pane: group by albums, by artists, by years, etc.

#### Sharing ####

But then you realize that internally the "server" runs separately from the user interface, and can stream music to clients, even if they are not running Khövsgöl. Thus, Khövsgöl lets you:

  * Listen to other people's music on the local network. You can either play music independently from their server, or "plug in" to whatever somebody else is listening to. You can DJ for each other!
  * Have a single server running which all other users can use to play music. All the users need to do it run in client mode. This is great for offices, where people can pool all their music into the central server and listen from all of it.

#### Pronunciation of "Khövsgöl" ####

Khövsgöl is the name of a [beautiful lake in Mongolia](http://en.wikipedia.org/wiki/Kh%C3%B6vsg%C3%B6l_Nuur), one of the sources of Siberia's Lake Baikal. One hopes that the purity of its waters will cleanse bloat and detritus from this software.

For the lazy, just say "HOOVS-gool." Easy!

The Khalkh Mongolian pronunciation of the word is as follows: _kh_ is pronounced like the _ch_ in "Bach". The _ö_ vowel is somewhere between a Mid-Western American _oo_ in "booth" and a _o_ in "oar". The final _l_ is a breathy sound, like the Welsh _ll_. It's pronounced somewhere between an English dark _l_ and a whispered _th_.

(I'm referring to common English pronunciation only because this description is in English, the contemporary lingua franca of open source software. I apologize if this pronunciation guide is less helpful to native speakers of other languages!)

## Technology ##

Khövsgöl can stream music over the network using [PulseAudio](http://www.pulseaudio.org/) or [EsoundD](http://www.tux.org/~ricdude/EsounD.html) for clients that have those audio systems, or an internally implemented RTP for clients that don't. The RTP receiver that can run separately from the client, so you can listen to network music without Khövsgöl running (and on headless machines). Additionally, Khövsgöl lets you plug into an [IceCast](http://www.icecast.org/) server, so you can broadcast Internet radio, thus escaping the confines of your local network. We even support [JACK](http://jackaudio.org/) for professional audio production.

There are other nifty technological touches:

  * Desktop integration: pop-up notifications, Ubuntu's music menu, quicklists in Unity's launcher, GNOME's keyboard media keys
  * Updates your IM status on Pidgin
  * Scrobbles to [Last.fm](http://www.last.fm/)
  * Works as an [MPRIS](http://www.mpris.org/) server (version 1.0 and 2.0)
  * Command line client for easy remote access
  * Flexible [GStreamer](http://gstreamer.freedesktop.org/) (version 1.0) media backend
  * Advertises and discovers Khövsgöl servers on the local network using [Zeroconf](http://www.zeroconf.org/) (which Apple calls [Bonjour](http://www.apple.com/support/bonjour/))
  * Rich web client for easy remote access (todo...)

#### Developers, Developers, Developers, Developers ####

As a free siftware project, Khövsgöl makes it easy for developers to integrate with it or reuse its parts. It's designed to be very hackable!

  * Written in [Genie](https://live.gnome.org/Genie), GPL licensed
  * Khövsgöl server has a [well-documented](api.md), RESTful, JSON-speaking URI-space, so it's easy to create your own user interface. It's a more flexible alternative to [MPD](http://mpd.wikia.com/) and [XMMS2](http://xmms2.org/)
  * Simple plugin API

Please learn from and reuse our code, created with some hard-earned experience:

  * Our custom multi-threaded, minimalist REST server and client named "Nap" (get it? have a rest!); includes a simple implementation of [URI templates](http://code.google.com/p/uri-templates/); mimics [Prudence](http://threecrickets.com/prudence/)'s RESTful API for easy routing
  * Hierarchical logging system, fully compatible with GLib
  * Neat tricks with GStreamer 1.0