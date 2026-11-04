package app.talklive.sound

import app.talklive.R
import app.talklive.call.CallManager
import app.talklive.call.CallPhase
import app.talklive.data.UiText
import app.talklive.game.Games
import app.talklive.game.Stage
import app.talklive.social.SocialRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Plays the website's sounds at the same moments: a match connects, a call
 * ends, a message arrives or is sent, a new friend, game moves and wins.
 * Watches the app's state instead of being wired into every screen.
 */
@Singleton
class SoundDirector @Inject constructor(
    private val sounds: Sounds,
    private val calls: CallManager,
    private val social: SocialRepository,
    private val games: Games,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    fun start() {
        scope.launch {
            var wasConnected = false
            calls.state.map { it.phase is CallPhase.Connected }.distinctUntilChanged().collect { connected ->
                if (connected && !wasConnected) sounds.play(Sounds.Fx.Connect)
                if (!connected && wasConnected) sounds.play(Sounds.Fx.Hangup)
                wasConnected = connected
            }
        }
        scope.launch {
            var seen = emptySet<String>()
            calls.chat.collect { list ->
                val fresh = list.filter { it.id !in seen }
                if (seen.isNotEmpty() || list.size <= 1) fresh.lastOrNull()?.let { sounds.play(if (it.mine) Sounds.Fx.Send else Sounds.Fx.Message) }
                seen = list.mapTo(HashSet()) { it.id }
            }
        }
        scope.launch {
            var seen: Set<String>? = null
            social.threads.collect { map ->
                val ids = map.values.flatten().mapTo(HashSet()) { it.id }
                val before = seen
                if (before != null) {
                    val fresh = map.values.flatten().filter { it.id !in before }
                    // Loading a whole history at once is not a new message.
                    if (fresh.size in 1..2) fresh.last().let { sounds.play(if (it.mine) Sounds.Fx.Send else Sounds.Fx.Message) }
                }
                seen = ids
            }
        }
        scope.launch {
            social.toasts.collect { t -> if (t is UiText.Res && t.id == R.string.t_now_friends) sounds.play(Sounds.Fx.FriendAdded) }
        }
        scope.launch {
            social.incoming.map { it != null }.distinctUntilChanged().collect { if (it) sounds.play(Sounds.Fx.Invite) }
        }
        scope.launch {
            var lastTurn = -1
            var lastOver = false
            var lastStage = Stage.Idle
            games.ui.collect { g ->
                if (g.stage != lastStage && g.stage == Stage.Invited) sounds.play(Sounds.Fx.Invite)
                lastStage = g.stage
                val b = g.board ?: run { lastTurn = -1; lastOver = false; return@collect }
                when {
                    b.over && !lastOver -> sounds.play(if (b.winner == g.me) Sounds.Fx.Win else Sounds.Fx.Move)
                    !b.over && lastTurn != -1 && b.turn != lastTurn -> sounds.play(if (b.turn == g.me) Sounds.Fx.Turn else Sounds.Fx.Move)
                }
                lastTurn = b.turn
                lastOver = b.over
            }
        }
    }
}
