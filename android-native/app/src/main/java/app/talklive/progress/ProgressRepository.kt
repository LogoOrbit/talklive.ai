package app.talklive.progress

import app.talklive.data.IdentityStore
import app.talklive.net.ServerEvent
import app.talklive.net.TalkSocket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.launch
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Points, level and tier (spec 2): `progress-get` once registered, and whenever the server
 * pushes `progress`. Everything here is the server's word; an older server that does not
 * know these events simply leaves [progress] null and the app shows nothing about levels.
 */
data class Progress(
    val points: Int,
    val level: Int,
    /** none, silver, gold or diamond. */
    val tier: String,
    val nextTier: String?,
    val nextAt: Int?,
    val canClaim: Boolean,
    /** Epoch milliseconds when the daily reward can next be claimed (0 = now). */
    val nextClaimAt: Long,
    val code: String?,
    val redeemed: Boolean,
    val invitesCounted: Int,
) {
    companion object {
        const val SILVER_AT = 40
        const val GOLD_AT = 100
        const val DIAMOND_AT = 200

        /** Null when the object is not a progress payload (an empty or refused ack). */
        fun from(o: JSONObject?): Progress? {
            if (o == null || !o.has("points")) return null
            val points = o.optInt("points")
            val tier = o.optString("tier").takeIf { it in setOf("silver", "gold", "diamond") } ?: "none"
            val rawClaim = if (o.isNull("nextClaimAt")) 0L else o.optLong("nextClaimAt")
            return Progress(
                points = points,
                level = if (o.has("level")) o.optInt("level") else minOf(10, 1 + points / 20),
                tier = tier,
                nextTier = if (o.isNull("nextTier")) null else o.optString("nextTier").takeIf { it.isNotBlank() },
                nextAt = if (o.isNull("nextAt") || !o.has("nextAt")) null else o.optInt("nextAt"),
                canClaim = o.optBoolean("canClaim"),
                // Seconds from an older recipe still read right.
                nextClaimAt = if (rawClaim in 1 until 100_000_000_000L) rawClaim * 1000 else rawClaim,
                code = if (o.isNull("code")) null else o.optString("code").takeIf { it.isNotBlank() },
                redeemed = o.optBoolean("redeemed"),
                invitesCounted = o.optInt("invitesCounted"),
            )
        }

        fun tierAt(tier: String): Int = when (tier) { "silver" -> SILVER_AT; "gold" -> GOLD_AT; else -> DIAMOND_AT }
    }
}

/** What happened to a claim or a redeem. [reason] is the server's word for a refusal, null when nobody answered. */
sealed interface ProgressResult {
    data object Ok : ProgressResult
    data class Wait(val nextClaimAt: Long) : ProgressResult
    data class Failed(val reason: String?) : ProgressResult
}

@Singleton
class ProgressRepository @Inject constructor(
    private val socket: TalkSocket,
    identity: IdentityStore,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val _progress = MutableStateFlow<Progress?>(null)
    val progress: StateFlow<Progress?> = _progress

    private val _unlocks = MutableSharedFlow<String>(extraBufferCapacity = 4)
    /** A tier just reached (silver, gold, diamond): worth a celebration. */
    val unlocks: SharedFlow<String> = _unlocks

    init {
        socket.on("progress") { a -> (a.firstOrNull() as? JSONObject)?.let { accept(it) } }
        scope.launch { socket.events.collect { if (it == ServerEvent.Registered) refresh() } }
        // Another account on this phone: forget the last one's numbers.
        scope.launch { identity.switches.drop(1).collect { _progress.value = null } }
    }

    private fun accept(o: JSONObject?) {
        val next = Progress.from(o) ?: return
        val before = _progress.value
        _progress.value = next
        if (before != null && tierRank(next.tier) > tierRank(before.tier)) _unlocks.tryEmit(next.tier)
    }

    private fun tierRank(t: String) = when (t) { "silver" -> 1; "gold" -> 2; "diamond" -> 3; else -> 0 }

    fun refresh() {
        scope.launch { accept(socket.ask("progress-get")) }
    }

    /** The daily +1 point. */
    suspend fun claim(): ProgressResult {
        val r = socket.ask("progress-claim") ?: return ProgressResult.Failed(null)
        if (r.optBoolean("ok")) {
            accept(r)
            return ProgressResult.Ok
        }
        val reason = r.optString("reason").takeIf { it.isNotBlank() }
        if (reason == "wait") {
            val at = r.optLong("nextClaimAt").let { if (it in 1 until 100_000_000_000L) it * 1000 else it }
            _progress.value = _progress.value?.copy(canClaim = false, nextClaimAt = at)
            return ProgressResult.Wait(at)
        }
        return ProgressResult.Failed(reason)
    }

    /** A friend's invite code: +10 points once, with the reasons the server can refuse. */
    suspend fun redeem(code: String): ProgressResult {
        val r = socket.askWith("progress-redeem", JSONObject().put("code", code.trim())) ?: return ProgressResult.Failed(null)
        if (r.optBoolean("ok")) {
            refresh()
            return ProgressResult.Ok
        }
        return ProgressResult.Failed(r.optString("reason").takeIf { it.isNotBlank() } ?: "invalid")
    }
}
