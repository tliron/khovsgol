#!/usr/bin/env python

from ronin.cli import cli
from ronin.contexts import new_build_context
from ronin.gcc import GccLink
from ronin.phases import Phase
from ronin.pkg_config import Package
from ronin.projects import Project
from ronin.utils.paths import glob, input_path
from ronin.vala import ValaBuild, ValaApi, ValaTranspile, ValaExtension, ValaGccCompile

class Dependencies(object):
    def __init__(self):
        self.gee = ValaExtension('gee-0.8')
        self.libsoup = ValaExtension('libsoup-2.4')
        self.json = ValaExtension('json-glib-1.0')
        self.sqlite = ValaExtension('sqlite3')
        self.posix = ValaExtension('posix', package=False,
                                   c_compile_arguments=['-D_GNU_SOURCE'])
        self.gtk = ValaExtension('gtk+-3.0')
        self.libdaemon = ValaExtension('libdaemon')
        self.gstreamer = ValaExtension('gstreamer-audio-1.0')
        self.unity = ValaExtension('unity')
        self.indicate = ValaExtension('Indicate-0.7', package=Package('indicate-0.7'),
                                      c_compile_arguments=['-I/usr/include/libindicate-0.7'],
                                      c_link_arguments=['-lindicate'])
        self.taglib = ValaExtension('taglib_c')
        self.appindicator = ValaExtension('appindicator-0.1')
        self.avahi = Package('avahi-client')
        self.avahi_gobject = ValaExtension('avahi-gobject')
        self.avahi_direct = ValaExtension('avahi-direct', package=False,
                                          vapi_paths=[input_path('src/lib/avahi')])
        self.m = ValaExtension(c_link_arguments=['-lm'])

def glob_src(pattern):
    return \
        glob(pattern + '/*.gs') + \
        glob(pattern + '/*.vala')

def create_project(name, inputs, extensions, multi=True):
    project = Project(name, path=name)
    
    if multi:
        # API
        api = Phase(ValaApi(),
                    inputs=inputs)
        api.executor.enable_deprecated()
        
        # Transpile
        transpile = Phase(ValaTranspile(apis=[api]),
                          inputs=inputs,
                          extensions=extensions)
        transpile.executor.enable_experimental()
        transpile.executor.enable_deprecated()
     
        # Compile
        compile = Phase(ValaGccCompile(),
                        inputs_from=[transpile],
                        extensions=extensions)
        compile.executor.disable_warning('deprecated-declarations')
    
        # Link
        link = Phase(GccLink(),
                     inputs_from=[compile],
                     extensions=extensions,
                     output=name)
    
        project.phases['api'] = api
        project.phases['transpile'] = transpile
        project.phases['compile'] = compile
        project.phases['link'] = link
    else:
        # Build
        build = Phase(ValaBuild(),
                      inputs=inputs,
                      extensions=extensions,
                      output=name)
        build.executor.enable_threads()
        build.executor.enable_experimental()
        build.executor.enable_deprecated()
        build.executor.target_glib('2.32')
        project.phases['build'] = build
    
    return project

with new_build_context() as ctx:
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
