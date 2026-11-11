package app.talklive.push

import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ProcessLifecycleOwner
import app.talklive.MainActivity
import app.talklive.R
import app.talklive.TalkLiveApplication
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/**
 * While the app is closed Android shows the server's notifications itself,
 * except direct messages, which arrive as data and are built by [LocalNotifier].
 * In the foreground the app already shows the message or the ringing screen.
 */
@AndroidEntryPoint
class TalkLiveMessagingService : FirebaseMessagingService() {
    @Inject lateinit var registrar: PushRegistrar
    @Inject lateinit var notifier: LocalNotifier

    override fun onNewToken(token: String) {
        registrar.onNewToken(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val foreground = ProcessLifecycleOwner.get().lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)
        // A direct message comes as data only, so the app builds the notification
        // itself (text, per-friend stacking, Reply), also when it was not running.
        val d = message.data
        if (d["kind"] == "message") {
            if (!foreground) notifier.onPush(d["fromClientId"].orEmpty(), d["fromName"].orEmpty(), d["preview"].orEmpty(), d["msgId"].orEmpty(), d["ts"]?.toLongOrNull() ?: System.currentTimeMillis())
            return
        }
        val n = message.notification ?: return
        if (foreground) return
        val channel = n.channelId ?: TalkLiveApplication.CHANNEL_MESSAGES
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(this, channel)
            .setSmallIcon(R.drawable.ic_stat_talklive)
            .setColor(0xFF6C5CE7.toInt())
            .setContentTitle(n.title)
            .setContentText(n.body)
            .setAutoCancel(true)
            .setContentIntent(open)
            .setCategory(if (channel == TalkLiveApplication.CHANNEL_CALLS) NotificationCompat.CATEGORY_CALL else NotificationCompat.CATEGORY_MESSAGE)
            .build()
        runCatching { NotificationManagerCompat.from(this).notify(n.tag ?: "talklive", 0, notification) }
    }
}
