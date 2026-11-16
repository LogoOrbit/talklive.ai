package app.talklive.engage

import android.content.Context
import app.talklive.data.IdentityStore
import app.talklive.net.ServerConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * When TalkLive Plus may be offered, and how often. The same rules as the website
 * (public/plus-moments.js); both are tested against the same cases.
 *
 * Moments: [Restrict] (someone just touched a locked feature; never capped, they asked),
 * [Search] (waiting in a busy queue: one quiet line), [Good] (after a good call or mutual
 * heart), [Liked] (people liked you), [Pass] (the 1-day pass, once the subscription was
 * turned down twice).
 *
 * Proactive ones (everything but Restrict): never in a first session or before the third
 * finished call, at most one per 24 hours and three per 7 days. None of them while a call
 * is connecting or connected, none for Plus members, and the same moment is not repeated in
 * the same session after a dismissal.
 */
enum class PlusMoment(val key: String) { Restrict("restrict"), Search("search"), Good("good"), Liked("liked"), Pass("pass") }

data class MomentState(
    val sessions: Int = 0,
    val calls: Int = 0,
    val lastSeen: Long = 0,
    val shown: List<Long> = emptyList(),
    val subDismiss: Int = 0,
    val lastPassAt: Long = 0,
) {
    /** One short line for SharedPreferences: no JSON needed, and old values simply parse to defaults. */
    fun encode(): String = listOf(1, sessions, calls, lastSeen, subDismiss, lastPassAt, shown.joinToString(",")).joinToString("|")

    companion object {
        fun decode(s: String?): MomentState {
            val p = s?.split("|") ?: return MomentState()
            if (p.size < 7 || p[0] != "1") return MomentState()
            return MomentState(
                p[1].toIntOrNull() ?: 0, p[2].toIntOrNull() ?: 0, p[3].toLongOrNull() ?: 0, p[6].split(",").mapNotNull { it.toLongOrNull() },
                p[4].toIntOrNull() ?: 0, p[5].toLongOrNull() ?: 0,
            )
        }
    }
}

/** What is true right now. [dismissed] holds moment keys, or "restrict:<feature>", dismissed this session. */
data class MomentContext(
    val premium: Boolean = false,
    val inCall: Boolean = false,
    val key: String = "",
    val dismissed: Set<String> = emptySet(),
    val waitedSec: Int = 0,
    val contended: Boolean = false,
    val likedCount: Int = 0,
    val goodCall: Boolean = false,
)

data class MomentDecision(val ok: Boolean, val why: String? = null)

object PlusMoments {
    const val DAY = 86_400_000L
    const val SESSION_GAP_MS = 30 * 60 * 1000L
    const val MIN_SESSIONS = 2
    const val MIN_CALLS = 3
    const val PER_DAY = 1
    const val PER_WEEK = 3
    const val PASS_AFTER_DISMISSALS = 2
    const val PASS_COOLDOWN_MS = 14 * DAY
    const val SEARCH_AFTER_SEC = 20
    const val CALL_MIN_SEC = 15
    /** When several are due at once, the most relevant wins. */
    val ORDER = listOf(PlusMoment.Good, PlusMoment.Liked, PlusMoment.Pass, PlusMoment.Search)

    fun touch(s: MomentState, now: Long): MomentState =
        s.copy(sessions = if (s.lastSeen == 0L || now - s.lastSeen > SESSION_GAP_MS) s.sessions + 1 else s.sessions, lastSeen = now)

    fun finishedCall(s: MomentState, seconds: Long): MomentState = if (seconds >= CALL_MIN_SEC) s.copy(calls = s.calls + 1) else s

    fun blocked(s: MomentState, now: Long): String? {
        if (s.sessions < MIN_SESSIONS) return "first-session"
        if (s.calls < MIN_CALLS) return "few-calls"
        if (s.shown.count { now - it < DAY } >= PER_DAY) return "day-cap"
        if (s.shown.count { now - it < 7 * DAY } >= PER_WEEK) return "week-cap"
        return null
    }

    fun decide(s: MomentState, m: PlusMoment, c: MomentContext, now: Long): MomentDecision {
        if (c.premium) return MomentDecision(false, "member")
        if (c.inCall) return MomentDecision(false, "in-call")
        if (m == PlusMoment.Restrict) {
            return if ("restrict:${c.key}" in c.dismissed) MomentDecision(false, "dismissed-this-session") else MomentDecision(true)
        }
        if (m.key in c.dismissed) return MomentDecision(false, "dismissed-this-session")
        blocked(s, now)?.let { return MomentDecision(false, it) }
        return when (m) {
            PlusMoment.Search -> if (c.contended && c.waitedSec >= SEARCH_AFTER_SEC) MomentDecision(true) else MomentDecision(false, "not-waiting-long")
            PlusMoment.Liked -> if (c.likedCount > 0) MomentDecision(true) else MomentDecision(false, "nobody-liked")
            PlusMoment.Good -> if (c.goodCall) MomentDecision(true) else MomentDecision(false, "not-a-good-call")
            PlusMoment.Pass -> when {
                s.subDismiss < PASS_AFTER_DISMISSALS -> MomentDecision(false, "subscription-not-dismissed-twice")
                now - s.lastPassAt < PASS_COOLDOWN_MS -> MomentDecision(false, "pass-cooldown")
                else -> MomentDecision(true)
            }
            PlusMoment.Restrict -> MomentDecision(true)
        }
    }

    /** The first of [among] that may show now, or null. */
    fun best(s: MomentState, c: (PlusMoment) -> MomentContext, now: Long, among: List<PlusMoment> = ORDER): PlusMoment? =
        among.firstOrNull { decide(s, it, c(it), now).ok }

    fun shown(s: MomentState, m: PlusMoment, now: Long): MomentState {
        if (m == PlusMoment.Restrict) return s
        val next = s.copy(shown = s.shown.filter { now - it < 7 * DAY } + now)
        // Offering the pass starts the count of subscription dismissals afresh.
        return if (m == PlusMoment.Pass) next.copy(lastPassAt = now, subDismiss = 0) else next
    }

    /** Turning down an offer of the subscription counts towards the pass offer. */
    fun dismissed(s: MomentState, m: PlusMoment): MomentState = if (m == PlusMoment.Pass) s else s.copy(subDismiss = s.subDismiss + 1)

    /** The analytics event the server accepts (server/plus-moments.js): plus_app_<moment>_<action>. */
    fun eventName(m: PlusMoment, action: String): String = "plus_app_${m.key}_$action"
}

/**
 * The persisted state and the analytics for [PlusMoments]. Counts are aggregate
 * (POST /events), with no identity attached.
 */
@Singleton
class PlusMomentsStore @Inject constructor(
    @ApplicationContext context: Context,
    @Suppress("unused") private val identity: IdentityStore,
) {
    private val prefs = context.getSharedPreferences("plus_moments", Context.MODE_PRIVATE)
    private val http = app.talklive.net.Http.withTimeout(10)
    private var state = MomentState.decode(prefs.getString("state", null))
    private val dismissedNow = mutableSetOf<String>()

    @Synchronized fun touch(now: Long = System.currentTimeMillis()) = update { PlusMoments.touch(it, now) }
    @Synchronized fun finishedCall(seconds: Long) = update { PlusMoments.finishedCall(it, seconds) }
    @Synchronized fun current(): MomentState = state
    @Synchronized fun dismissedSet(): Set<String> = dismissedNow.toSet()

    @Synchronized fun decide(m: PlusMoment, c: MomentContext, now: Long = System.currentTimeMillis()): MomentDecision =
        PlusMoments.decide(state, m, c.copy(dismissed = dismissedNow.toSet()), now)

    @Synchronized fun best(c: (PlusMoment) -> MomentContext, among: List<PlusMoment> = PlusMoments.ORDER, now: Long = System.currentTimeMillis()): PlusMoment? =
        PlusMoments.best(state, { c(it).copy(dismissed = dismissedNow.toSet()) }, now, among)

    fun onShown(m: PlusMoment, now: Long = System.currentTimeMillis()) { update { PlusMoments.shown(it, m, now) }; track(m, "view") }
    fun onDismissed(m: PlusMoment, key: String = "") {
        synchronized(this) { dismissedNow += if (m == PlusMoment.Restrict) "restrict:$key" else m.key }
        update { PlusMoments.dismissed(it, m) }
        track(m, "dismiss")
    }
    fun onTapped(m: PlusMoment) = track(m, "tap")

    @Synchronized private fun update(f: (MomentState) -> MomentState) {
        state = f(state)
        prefs.edit().putString("state", state.encode()).apply()
    }

    private fun track(m: PlusMoment, action: String) {
        val body = """{"event":"${PlusMoments.eventName(m, action)}"}""".toRequestBody("application/json".toMediaType())
        Thread {
            runCatching { http.newCall(Request.Builder().url("${ServerConfig.url}/events").post(body).build()).execute().close() }
        }.apply { isDaemon = true }.start()
    }
}
