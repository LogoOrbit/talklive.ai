package app.talklive.social

import android.content.Context
import app.talklive.call.CallManager
import app.talklive.call.CallPhase
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

enum class CallOutcome { Answered, Missed, Declined, NoAnswer }

/** One friend call in the log: who, which way, how it ended and how long it lasted. */
data class CallLogEntry(
    val id: Long,
    val clientId: String,
    val name: String,
    val animal: String?,
    val outgoing: Boolean,
    val outcome: CallOutcome,
    val ts: Long,
    val durationSec: Long = 0,
)

/**
 * Friend call history, kept on this phone like a phone's call log: calls made,
 * received, missed and declined, with talk time for answered ones, for three months.
 */
@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
@Singleton
class CallLogStore @Inject constructor(
    @ApplicationContext context: Context,
    private val social: SocialRepository,
    private val calls: CallManager,
) {
    private val prefs = context.getSharedPreferences("call_log", Context.MODE_PRIVATE)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default.limitedParallelism(1))
    private val _entries = MutableStateFlow(load())
    val entries: StateFlow<List<CallLogEntry>> = _entries

    private var connectedId: Long? = null
    private var connectedSince = 0L

    init {
        scope.launch {
            var last: OutgoingCall? = null
            social.outgoing.collect { o ->
                if (o != null && last?.person?.clientId != o.person.clientId) {
                    add(CallLogEntry(System.nanoTime(), o.person.clientId, o.person.displayName, o.person.animal, true, CallOutcome.NoAnswer, System.currentTimeMillis()))
                }
                last = o
            }
        }
        scope.launch {
            var last: IncomingCall? = null
            social.incoming.collect { i ->
                if (i != null && last?.fromClientId != i.fromClientId) {
                    add(CallLogEntry(System.nanoTime(), i.fromClientId, i.username, social.person(i.fromClientId)?.animal, false, CallOutcome.Missed, System.currentTimeMillis()))
                }
                last = i
            }
        }
        scope.launch {
            social.callDeclined.collect { id ->
                updateLatest(id) { if (!it.outgoing && it.outcome == CallOutcome.Missed) it.copy(outcome = CallOutcome.Declined) else it }
            }
        }
        scope.launch {
            calls.state.collect { st ->
                val p = st.phase
                if (st.friendCall && p is CallPhase.Connected) {
                    if (connectedId == null) {
                        val recent = _entries.value.firstOrNull {
                            it.clientId == p.partner.clientId && it.outcome != CallOutcome.Answered && System.currentTimeMillis() - it.ts < 3 * 60_000
                        }
                        val e = recent?.copy(outcome = CallOutcome.Answered)
                            ?: CallLogEntry(System.nanoTime(), p.partner.clientId, p.partner.username, p.partner.animal, st.isHost, CallOutcome.Answered, System.currentTimeMillis())
                        if (recent != null) replace(e) else add(e)
                        connectedId = e.id
                        connectedSince = p.sinceMs
                    }
                } else if (p !is CallPhase.Connected) {
                    val id = connectedId ?: return@collect
                    connectedId = null
                    val secs = ((System.currentTimeMillis() - connectedSince) / 1000).coerceAtLeast(1)
                    _entries.value.firstOrNull { it.id == id }?.let { replace(it.copy(durationSec = secs)) }
                }
            }
        }
    }

    private val _seenAt = MutableStateFlow(prefs.getLong("seen", 0L))
    /** When the log was last opened: missed calls after this are new. */
    val seenAt: StateFlow<Long> = _seenAt

    fun markSeen() { val now = System.currentTimeMillis(); _seenAt.value = now; prefs.edit().putLong("seen", now).apply() }

    fun clear() = scope.launch { _entries.value = emptyList(); save() }

    fun remove(id: Long) = scope.launch { _entries.update { l -> l.filterNot { it.id == id } }; save() }

    private fun add(e: CallLogEntry) { _entries.update { fresh(listOf(e) + it) }; save() }

    /** Calls stay for three months (a busy log is capped at 2000 so the file stays small). */
    private fun fresh(l: List<CallLogEntry>): List<CallLogEntry> {
        val cutoff = System.currentTimeMillis() - KEEP_MS
        return l.filter { it.ts >= cutoff }.take(2000)
    }

    private companion object { const val KEEP_MS = 90L * 24 * 60 * 60 * 1000 }

    private fun replace(e: CallLogEntry) { _entries.update { l -> l.map { if (it.id == e.id) e else it } }; save() }

    private fun updateLatest(clientId: String, f: (CallLogEntry) -> CallLogEntry) {
        val e = _entries.value.firstOrNull { it.clientId == clientId } ?: return
        replace(f(e))
    }

    private fun save() {
        val arr = JSONArray()
        _entries.value.forEach { e ->
            arr.put(
                JSONObject().put("id", e.id).put("c", e.clientId).put("n", e.name).put("a", e.animal ?: "")
                    .put("o", e.outgoing).put("r", e.outcome.name).put("t", e.ts).put("d", e.durationSec),
            )
        }
        prefs.edit().putString("entries", arr.toString()).apply()
    }

    private fun load(): List<CallLogEntry> = runCatching {
        val arr = JSONArray(prefs.getString("entries", "[]"))
        fresh((0 until arr.length()).mapNotNull { i ->
            val o = arr.optJSONObject(i) ?: return@mapNotNull null
            CallLogEntry(
                o.optLong("id"), o.optString("c"), o.optString("n"), o.optString("a").ifBlank { null },
                o.optBoolean("o"), runCatching { CallOutcome.valueOf(o.optString("r")) }.getOrDefault(CallOutcome.Missed),
                o.optLong("t"), o.optLong("d"),
            )
        })
    }.getOrDefault(emptyList())
}
