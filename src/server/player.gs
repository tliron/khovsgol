[indent=4]

namespace Khovsgol

    class Players
        def get_player(name: string, create: bool = true): Player
            var player = _players[name]
            if player is null
                _players[name] = player = new GStreamer.Player()
            return player
    
        _players: dict of string, Player = new dict of string, Player
    
    interface Player: Object
        def abstract start()
