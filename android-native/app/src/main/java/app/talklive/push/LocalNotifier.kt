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
    private val notif: app.talklive.data.NotifSettings,
) {
    private fun on(k: app.talklive.data.NotifSettings.Kind) = notif.allows(k)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val nm get() = NotificationManagerCompat.from(context)

    private fun background() = !ProcessLifecycleOwner.get().lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)

    fun start() {
        scope.launch {
            var seen: Set<String>? = null
            social.requests.collect { list ->
                val ids = list.mapTo(HashSet()) { it.clientId }
                seen?.let { before ->
                    val fresh = list.filter { it.clientId !in before }
                    // A reloaded inbox (several at once) is not news.
                    if (background() && fresh.size <= 3 && on(app.talklive.data.NotifSettings.Kind.Friends)) fresh.forEach { p ->
                        post("req:${p.clientId}", context.getString(R.string.n_request_title, p.displayName), context.getString(R.string.n_request_body), "requests", social = true)
                    }
                }
                seen = ids
            }
        }
        // Who this user asked and is still waiting on: only they can "accept".
        // A friend list that reloads (sign-in, a reconnect, a profile switch
        // empties and refills it) must never read as a wave of new friends.
        var pendingAsked: Set<String> = emptySet()
        scope.launch { social.sent.collect { asked -> if (asked.isNotEmpty()) pendingAsked = pendingAsked + asked } }
        scope.launch {
            var seen: Set<String>? = null
            social.friends.collect { list ->
                val ids = list.mapTo(HashSet()) { it.clientId }
                seen?.let { before ->
                    val accepted = list.filter { it.clientId !in before && it.clientId in pendingAsked }
                    pendingAsked = pendingAsked - accepted.map { it.clientId }.toSet()
                    if (background() && accepted.size <= 3 && on(app.talklive.data.NotifSettings.Kind.Friends)) accepted.forEach { p ->
                        post("acc:${p.clientId}", context.getString(R.string.n_accepted_title, p.displayName), context.getString(R.string.n_accepted_body), "chat:${p.clientId}", social = true)
                    }
                }
                // Emptied (signed out, switching profile): the next list is a fresh start.
                seen = if (ids.isEmpty()) null else ids
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
                    if (fresh.size in 1..20) fresh.groupBy { it.first }.forEach { (who, msgs) ->
                        // Like a messenger: nothing while that chat is on screen, nothing for muted chats.
                        if (!background() && social.openChat == who) return@forEach
                        if (who in social.muted.value || !on(app.talklive.data.NotifSettings.Kind.Messages)) return@forEach
                        msgs.forEach { (_, m) -> pending.getOrPut(who) { mutableListOf() }.add(Line(textOf(m), m.ts, false)) }
                        if (background()) showConversation(who)
                    }
                }
                seen = ids
            }
        }
        // Read on any device (or opened here): the notification goes, like WhatsApp.
        scope.launch {
            social.unread.collect { unread ->
                pending.keys.filter { (unread[it] ?: 0) == 0 }.forEach { clearConversation(it) }
            }
        }
        scope.launch {
            var seen: Set<String>? = null
            social.activity.collect { list ->
                val ids = list.mapTo(HashSet()) { it.id }
                seen?.let { before ->
                    if (background() && on(app.talklive.data.NotifSettings.Kind.Calls)) list.filter { it.id !in before && it.type == "call_back_request" }.forEach { a ->
                        post("call:${a.fromClientId}", context.getString(R.string.activity_missed_call, a.username), context.getString(R.string.n_missed_body), "requests", calls = true)
                    }
                }
                seen = ids
            }
        }
        scope.launch {
            social.incoming.collect { inc ->
                if (inc == null) { nm.cancel(TAG_RING, 0); return@collect }
                if (!on(app.talklive.data.NotifSettings.Kind.Calls)) return@collect
                ring(inc.fromClientId, inc.username)
            }
        }
    }

    private data class Line(val text: String, val ts: Long, val mine: Boolean)
    /** Unread lines per chat, shown together in one notification per person. */
    private val pending = java.util.concurrent.ConcurrentHashMap<String, MutableList<Line>>()

    private fun textOf(m: app.talklive.social.ChatMessage) = when {
        m.gifUrl != null -> "GIF"
        m.voiceMs != null -> context.getString(R.string.voice_message_short)
        else -> m.text
    }

    private fun nameOf(who: String) = social.friends.value.firstOrNull { it.clientId == who }?.displayName
        ?: social.history.value.firstOrNull { it.clientId == who }?.displayName ?: "TalkLive"

    fun clearConversation(who: String) {
        pending.remove(who)
        nm.cancel("msg:$who", 0)
        if (pending.isEmpty()) nm.cancel(TAG_SUMMARY, 0)
    }

    /** After replying from the notification: show "You" under their messages, then settle. */
    fun addMyReply(who: String, text: String) {
        pending.getOrPut(who) { mutableListOf() }.add(Line(text, System.currentTimeMillis(), true))
        showConversation(who, silent = true)
    }

    private fun showConversation(who: String, silent: Boolean = false) = runCatching {
        val lines = pending[who] ?: return@runCatching
        val name = nameOf(who)
        val me = androidx.core.app.Person.Builder().setName(context.getString(R.string.you)).build()
        val them = androidx.core.app.Person.Builder().setName(name).setKey(who).build()
        val style = NotificationCompat.MessagingStyle(me)
        lines.takeLast(8).forEach { l -> style.addMessage(l.text, l.ts, if (l.mine) me else them) }
        val reply = androidx.core.app.RemoteInput.Builder(KEY_REPLY).setLabel(context.getString(R.string.reply)).build()
        val replyIntent = PendingIntent.getBroadcast(
            context, ("r$who").hashCode(),
            Intent(context, MessageActionReceiver::class.java).setAction(ACTION_REPLY).putExtra(EXTRA_WHO, who),
            PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val readIntent = PendingIntent.getBroadcast(
            context, ("m$who").hashCode(),
            Intent(context, MessageActionReceiver::class.java).setAction(ACTION_READ).putExtra(EXTRA_WHO, who),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val n = NotificationCompat.Builder(context, TalkLiveApplication.CHANNEL_MESSAGES)
            .setSmallIcon(R.drawable.ic_stat_talklive)
            .setColor(0xFF6C5CE7.toInt())
            .setStyle(style)
            .setContentIntent(open("chat:$who"))
            .setAutoCancel(true)
            .setOnlyAlertOnce(silent)
            .setSilent(silent)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setGroup(GROUP_MESSAGES)
            .setNumber(lines.count { !it.mine })
            .addAction(
                NotificationCompat.Action.Builder(0, context.getString(R.string.reply), replyIntent)
                    .addRemoteInput(reply).setAllowGeneratedReplies(true)
                    .setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_REPLY).build(),
            )
            .addAction(
                NotificationCompat.Action.Builder(0, context.getString(R.string.mark_read), readIntent)
                    .setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_MARK_AS_READ).setShowsUserInterface(false).build(),
            )
            .build()
        nm.notify("msg:$who", 0, n)
        // Several chats: one group, like other messengers.
        if (pending.size > 1) {
            val summary = NotificationCompat.Builder(context, TalkLiveApplication.CHANNEL_MESSAGES)
                .setSmallIcon(R.drawable.ic_stat_talklive)
                .setColor(0xFF6C5CE7.toInt())
                .setGroup(GROUP_MESSAGES).setGroupSummary(true).setAutoCancel(true).setSilent(true)
                .setStyle(NotificationCompat.InboxStyle().also { st -> pending.keys.forEach { st.addLine(nameOf(it)) } })
                .build()
            nm.notify(TAG_SUMMARY, 0, summary)
        }
    }

    private fun open(target: String?): PendingIntent = PendingIntent.getActivity(
        context, target.hashCode(),
        Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP).apply { target?.let { putExtra(EXTRA_OPEN, it) } },
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    private fun post(tag: String, title: String, body: String, target: String?, calls: Boolean = false, social: Boolean = false) = runCatching {
        val channel = when { calls -> TalkLiveApplication.CHANNEL_CALLS; social -> TalkLiveApplication.CHANNEL_SOCIAL; else -> TalkLiveApplication.CHANNEL_MESSAGES }
        val n = NotificationCompat.Builder(context, channel)
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
        const val TAG_SUMMARY = "msg-summary"
        const val GROUP_MESSAGES = "app.talklive.MESSAGES"
        const val KEY_REPLY = "reply"
        const val EXTRA_WHO = "who"
        const val ACTION_REPLY = "app.talklive.REPLY"
        const val ACTION_READ = "app.talklive.MARK_READ"
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

/** Reply and Mark as read, straight from a message notification. */
@AndroidEntryPoint
class MessageActionReceiver : BroadcastReceiver() {
    @Inject lateinit var social: SocialRepository
    @Inject lateinit var notifier: LocalNotifier
    override fun onReceive(context: Context, intent: Intent) {
        val who = intent.getStringExtra(LocalNotifier.EXTRA_WHO) ?: return
        when (intent.action) {
            LocalNotifier.ACTION_REPLY -> {
                val text = androidx.core.app.RemoteInput.getResultsFromIntent(intent)?.getCharSequence(LocalNotifier.KEY_REPLY)?.toString()?.trim()
                if (!text.isNullOrBlank()) {
                    social.send(who, text)
                    social.markRead(who)
                    notifier.addMyReply(who, text)
                }
            }
            LocalNotifier.ACTION_READ -> { social.markRead(who); notifier.clearConversation(who) }
        }
    }
}
