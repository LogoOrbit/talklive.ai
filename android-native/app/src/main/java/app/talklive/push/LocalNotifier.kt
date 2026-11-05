package app.talklive.push

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ProcessLifecycleOwner
import app.talklive.MainActivity
import app.talklive.R
import app.talklive.TalkLiveApplication
import app.talklive.social.SocialRepository
import dagger.hilt.android.AndroidEntryPoint
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Notifications made on the phone from what the open connection hears, for
 * when the app is in the background: friend requests, accepted requests, new
 * messages, missed calls, and a ringing friend call with Accept / Decline.
 * They use the same tags as the server's pushes (req:, acc:, msg:, call:), so
 * a push for the same thing replaces this one instead of doubling it.
 */
@Singleton
class LocalNotifier @Inject constructor(
    @ApplicationContext private val context: Context,
    private val social: SocialRepository,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val nm get() = NotificationManagerCompat.from(context)

    private fun background() = !ProcessLifecycleOwner.get().lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)

    fun start() {
        scope.launch {
            var seen: Set<String>? = null
            social.requests.collect { list ->
                val ids = list.mapTo(HashSet()) { it.clientId }
                seen?.let { before ->
                    if (background()) list.filter { it.clientId !in before }.forEach { p ->
                        post("req:${p.clientId}", context.getString(R.string.n_request_title, p.displayName), context.getString(R.string.n_request_body), "requests")
                    }
                }
                seen = ids
            }
        }
        scope.launch {
            var seen: Set<String>? = null
            social.friends.collect { list ->
                val ids = list.mapTo(HashSet()) { it.clientId }
                seen?.let { before ->
                    if (background()) list.filter { it.clientId !in before }.forEach { p ->
                        post("acc:${p.clientId}", context.getString(R.string.n_accepted_title, p.displayName), context.getString(R.string.n_accepted_body), "chat:${p.clientId}")
                    }
                }
                seen = ids
            }
        }
        scope.launch {
            var seen: Set<String>? = null
            social.threads.collect { map ->
                val all = map.flatMap { (who, msgs) -> msgs.map { who to it } }
                val ids = all.mapTo(HashSet()) { it.second.id }
                seen?.let { before ->
                    val fresh = all.filter { it.second.id !in before && !it.second.mine }
                    // A whole history arriving at once is not news.
                    if (background() && fresh.size in 1..5) fresh.groupBy { it.first }.forEach { (who, msgs) ->
                        val name = social.friends.value.firstOrNull { it.clientId == who }?.displayName
                            ?: social.history.value.firstOrNull { it.clientId == who }?.displayName ?: "TalkLive"
                        val m = msgs.last().second
                        val text = when { m.gifUrl != null -> "GIF"; m.voiceMs != null -> context.getString(R.string.voice_message_short); else -> m.text }
                        post("msg:$who", name, text, "chat:$who")
                    }
                }
                seen = ids
            }
        }
        scope.launch {
            var seen: Set<String>? = null
            social.activity.collect { list ->
                val ids = list.mapTo(HashSet()) { it.id }
                seen?.let { before ->
                    if (background()) list.filter { it.id !in before && it.type == "call_back_request" }.forEach { a ->
                        post("call:${a.fromClientId}", context.getString(R.string.activity_missed_call, a.username), context.getString(R.string.n_missed_body), "requests", calls = true)
                    }
                }
                seen = ids
            }
        }
        scope.launch {
            social.incoming.collect { inc ->
                if (inc == null) { nm.cancel(TAG_RING, 0); return@collect }
                ring(inc.fromClientId, inc.username)
            }
        }
    }

    private fun open(target: String?): PendingIntent = PendingIntent.getActivity(
        context, target.hashCode(),
        Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP).apply { target?.let { putExtra(EXTRA_OPEN, it) } },
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    private fun post(tag: String, title: String, body: String, target: String?, calls: Boolean = false) = runCatching {
        val n = NotificationCompat.Builder(context, if (calls) TalkLiveApplication.CHANNEL_CALLS else TalkLiveApplication.CHANNEL_MESSAGES)
            .setSmallIcon(R.drawable.ic_stat_talklive)
            .setColor(0xFF6C5CE7.toInt())
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(open(target))
            .setCategory(if (calls) NotificationCompat.CATEGORY_MISSED_CALL else NotificationCompat.CATEGORY_MESSAGE)
            .build()
        nm.notify(tag, 0, n)
    }

    /** A friend is calling: a notification with Accept and Decline (never full screen). */
    private fun ring(fromClientId: String, name: String) = runCatching {
        val accept = PendingIntent.getActivity(
            context, 1,
            Intent(context, MainActivity::class.java).setAction(ACTION_ACCEPT).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val decline = PendingIntent.getBroadcast(
            context, 2, Intent(context, CallActionReceiver::class.java).setAction(ACTION_DECLINE),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val n = NotificationCompat.Builder(context, TalkLiveApplication.CHANNEL_CALLS)
            .setSmallIcon(R.drawable.ic_stat_call)
            .setColor(0xFF6C5CE7.toInt())
            .setContentTitle(name)
            .setContentText(context.getString(R.string.wants_to_talk))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setOngoing(true)
            .setTimeoutAfter(45_000)
            .setContentIntent(open(null))
            .addAction(0, context.getString(R.string.decline), decline)
            .addAction(0, context.getString(R.string.accept), accept)
            .build()
        nm.notify(TAG_RING, 0, n)
    }

    companion object {
        const val TAG_RING = "ring"
        const val ACTION_ACCEPT = "app.talklive.ACCEPT_CALL"
        const val ACTION_DECLINE = "app.talklive.DECLINE_CALL"
        const val EXTRA_OPEN = "open"
    }
}

/** Decline from the ringing notification, without opening the app. */
@AndroidEntryPoint
class CallActionReceiver : BroadcastReceiver() {
    @Inject lateinit var social: SocialRepository
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == LocalNotifier.ACTION_DECLINE) {
            social.answer(false)
            NotificationManagerCompat.from(context).cancel(LocalNotifier.TAG_RING, 0)
        }
    }
}
