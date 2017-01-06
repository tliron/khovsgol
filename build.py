#!/usr/bin/env python

from ronin.cli import cli
from ronin.contexts import new_context, current_context
from ronin.gcc import GccLink
from ronin.phases import Phase
from ronin.pkg_config import Package
from ronin.projects import Project
from ronin.utils.paths import glob, input_path
from ronin.vala import ValaBuild, ValaApi, ValaTranspile, ValaPackage, ValaGccCompile

class Dependencies(object):
    def __init__(self):
        self.gee = ValaPackage('gee-0.8')
        self.libsoup = ValaPackage('libsoup-2.4')
        self.json = ValaPackage('json-glib-1.0')
        self.sqlite = ValaPackage('sqlite3')
        self.posix = ValaPackage('posix',
                                 package=False,
                                 c_compile_arguments=['-D_GNU_SOURCE'])
        self.gtk = ValaPackage('gtk+-3.0')
        self.libdaemon = ValaPackage('libdaemon')
        self.gstreamer = ValaPackage('gstreamer-audio-1.0')
        self.unity = ValaPackage('unity')
        self.indicate = ValaPackage('Indicate-0.7',
                                    package=Package('indicate-0.7'),
                                    c_compile_arguments=['-I/usr/include/libindicate-0.7'],
                                    c_link_arguments=['-lindicate'])
        self.taglib = ValaPackage('taglib_c')
        self.appindicator = ValaPackage('appindicator-0.1')
        self.avahi = Package('avahi-client')
        self.avahi_gobject = ValaPackage('avahi-gobject')
        self.avahi_direct = ValaPackage('avahi-direct',
                                        package=False,
                                        vapi_paths=[input_path('src/lib/avahi')])
        self.m = ValaPackage(c_link_arguments=['-lm'])

def glob_src(pattern):
    return \
        glob(pattern + '/*.gs') + \
        glob(pattern + '/*.vala')

def create_project(name, inputs, extensions):
    project = Project(name, output_path_relative=name)
    
    with current_context() as ctx:
        single = ctx.get('vala.single') == 'true' 
    
    if not single:
        # API
        executor = ValaApi()
        executor.enable_deprecated()
        Phase(project=project,
              name='api',
              executor=executor,
              inputs=inputs)
        
        # Transpile
        executor = ValaTranspile(apis=['api'])
        executor.enable_experimental()
        executor.enable_deprecated()
        Phase(project=project,
              name='transpile',
              executor=executor,
              inputs=inputs,
              extensions=extensions)
     
        # Compile
        executor = ValaGccCompile()
        executor.disable_warning('deprecated-declarations')
        Phase(project=project,
              name='compile',
              executor=executor,
              inputs_from=['transpile'],
              extensions=extensions)
    
        # Link
        Phase(project=project,
              name='link',
              executor=GccLink(),
              inputs_from=['compile'],
              extensions=extensions,
              output=name)
    else:
        # Build
        executor = ValaBuild()
        executor.enable_threads()
        executor.enable_experimental()
        executor.enable_deprecated()
        executor.target_glib('2.32')
        Phase(project=project,
              name='build',
              executor=executor,
              inputs=inputs,
              extensions=extensions,
              output=name)
    
    return project

with new_context() as ctx:
    dependencies = Dependencies()

    khovsgold_inputs = \
        glob_src('src/server/**') + \
        glob('src/version.gs') + \
        glob('src/models.gs') + \
        glob('src/iterators.gs') + \
        glob('src/utilities.gs') + \
        glob_src('src/lib/logging/**') + \
        glob_src('src/lib/console/**') + \
        glob_src('src/lib/nap/**') + \
        glob_src('src/lib/json/**') + \
        glob_src('src/lib/avahi/**') + \
        glob_src('src/lib/sqlite/**') + \
        glob_src('src/lib/gstreamer/**') + \
        glob_src('src/lib/daemonize/**') + \
        glob_src('src/lib/system/**')

    khovsgold_extensions = [
        dependencies.libsoup,
        dependencies.gee,
        dependencies.json,
        dependencies.posix,
        dependencies.sqlite,
        dependencies.libdaemon,
        dependencies.gstreamer,
        dependencies.taglib,
        dependencies.avahi,
        dependencies.avahi_gobject,
        dependencies.avahi_direct,
        dependencies.m]

    khovsgolr_inputs = \
        glob_src('src/receiver/**') + \
        glob('src/version.gs') + \
        glob('src/models.gs') + \
        glob_src('src/lib/logging/**') + \
        glob_src('src/lib/console/**') + \
        glob_src('src/lib/nap/**') + \
        glob_src('src/lib/json/**') + \
        glob_src('src/lib/gstreamer/**') + \
        glob_src('src/lib/daemonize/**')

    khovsgolr_extensions = [
        dependencies.libsoup,
        dependencies.gee,
        dependencies.json,
        dependencies.posix,
        dependencies.libdaemon,
        dependencies.gstreamer,
        dependencies.m]
    
    khovsgolc_inputs = \
        glob_src('src/client/cli/**') + \
        glob('src/client/client.gs') + \
        glob('src/client/api.gs') + \
        glob('src/client/utilities.gs') + \
        glob('src/version.gs') + \
        glob('src/models.gs') + \
        glob('src/iterators.gs') + \
        glob_src('src/lib/logging/**') + \
        glob_src('src/lib/console/**') + \
        glob_src('src/lib/nap/**') + \
        glob_src('src/lib/json/**') + \
        glob_src('src/lib/avahi/**')
    
    khovsgolc_extensions = [
        dependencies.libsoup,
        dependencies.gee,
        dependencies.json,
        dependencies.posix,
        dependencies.avahi,
        dependencies.avahi_gobject,
        dependencies.avahi_direct,
        dependencies.m]

    khovsgol_inputs = \
        glob_src('src/client/gtk/**') + \
        glob_src('src/client/features/**') + \
        glob('src/client/client.gs') + \
        glob('src/client/configuration.gs') + \
        glob('src/client/api.gs') + \
        glob('src/client/utilities.gs') + \
        glob('src/client/playlist.gs') + \
        glob('src/server/configuration.gs') + \
        glob('src/receiver/configuration.gs') + \
        glob('src/version.gs') + \
        glob('src/models.gs') + \
        glob('src/iterators.gs') + \
        glob('src/utilities.gs') + \
        glob_src('src/lib/logging/**') + \
        glob_src('src/lib/console/**') + \
        glob_src('src/lib/nap/**') + \
        glob_src('src/lib/json/**') + \
        glob_src('src/lib/dbus/**') + \
        glob_src('src/lib/gtk/**') + \
        glob_src('src/lib/avahi/**') + \
        glob_src('src/lib/scrobbling/**')
    
    khovsgol_extensions = [
        dependencies.libsoup,
        dependencies.gee,
        dependencies.json,
        dependencies.posix,
        dependencies.sqlite,
        dependencies.gtk,
        dependencies.unity,
        dependencies.indicate,
        dependencies.avahi,
        dependencies.avahi_gobject,
        dependencies.avahi_direct,
        dependencies.m]
    
    khovsgold = create_project('khovsgold', khovsgold_inputs, khovsgold_extensions)
    khovsgolr = create_project('khovsgolr', khovsgolr_inputs, khovsgolr_extensions)
    khovsgolc = create_project('khovsgolc', khovsgolc_inputs, khovsgolc_extensions)
    khovsgol = create_project('khovsgol', khovsgol_inputs, khovsgol_extensions)
   
    cli(khovsgold, khovsgolr, khovsgolc, khovsgol)
