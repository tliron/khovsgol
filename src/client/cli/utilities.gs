[indent=4]

uses
    Posix

namespace Khovsgol.Client.CLI

    /*
     * Add an idle hook to quit() a GLib.MainLoop when a key is pressed.
     * 
     * Instances maintain their own references.
     */
    class ExitOnKeyPress: Object
        construct(main_loop: MainLoop)
            _main_loop = main_loop
            _stdin_spy = new StdinSpy()
            Idle.add(exit_on_key_press)
            ref_count++
        
        _main_loop: MainLoop
        _stdin_spy: StdinSpy
        
        def private exit_on_key_press(): bool
            if StdinSpy.has_input()
                Posix.stdin.getc()
                _main_loop.quit()
                unref()
                return false
            return true
    
    /*
     * Allow checkings whether stdin has input without reading from it.
     * 
     * Relies on Posix magic! See: http://rosettacode.org/wiki/Keyboard_input/Keypress_check#C
     */
    class StdinSpy
        construct()
            tcgetattr(STDIN_FILENO, out _original_termios)
            var new_termios = _original_termios
            new_termios.c_lflag &= ~(ICANON|ECHO)
            tcsetattr(STDIN_FILENO, TCSANOW, new_termios)
        
        final
            tcsetattr(STDIN_FILENO, TCSANOW, _original_termios)
        
        _original_termios: termios
        
        def static has_input(): bool
            fds: fd_set
            FD_ZERO(out fds)
            FD_SET(STDIN_FILENO, ref fds)
            var timeout = timeval()
            timeout.tv_usec = timeout.tv_sec = 0
            select(STDIN_FILENO + 1, &fds, null, null, timeout)
            return FD_ISSET(STDIN_FILENO, fds) == 1
