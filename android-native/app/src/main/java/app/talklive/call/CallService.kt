package app.talklive.call

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import app.talklive.MainActivity
import app.talklive.R
import app.talklive.TalkLiveApplication
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.distinctUntilChangedBy
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Keeps the microphone and the call alive while the app is in the background,
 * with an ongoing "On a TalkLive call" notification. Runs from the first
 * search until the user ends the session.
 */
@AndroidEntryPoint
class CallService : LifecycleService() {
    @Inject lateinit var calls: CallManager

    override fun onCreate() {
        super.onCreate()
        ServiceCompat.startForeground(
            this, NOTIFICATION_ID, notification(searching = true),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
        )
        // The service is started a moment before the search itself, so the
        // first state it sees is usually still Idle. Stopping on that left the
        // call with no foreground service: Android then cut the mic and the
        // connection as soon as the app left the screen (Recents, Home), and
        // the call dropped. Only stop once a call or search has actually run
        // and ended - or if nothing starts within a few seconds.
        lifecycleScope.launch {
            var started = false
            launch { kotlinx.coroutines.delay(8000); if (!started && calls.state.value.phase is CallPhase.Idle) stopSelf() }
            calls.state.distinctUntilChangedBy { it.phase::class }.collect { s ->
                when (s.phase) {
                    CallPhase.Idle -> if (started) stopSelf()
                    is CallPhase.Connected -> { started = true; notify(searching = false) }
                    else -> { started = true; notify(searching = true) }
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // "Hang up" from the notification.
        if (intent?.action == ACTION_HANG_UP) calls.end()
        return super.onStartCommand(intent, flags, startId)
    }

    private fun notify(searching: Boolean) {
        getSystemService(android.app.NotificationManager::class.java).notify(NOTIFICATION_ID, notification(searching))
    }

    private fun notification(searching: Boolean): Notification {
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return NotificationCompat.Builder(this, TalkLiveApplication.CHANNEL_CALL)
            .setSmallIcon(R.drawable.ic_stat_call)
            .setContentTitle(getString(if (searching) R.string.notif_searching else R.string.notif_in_call))
            .setContentIntent(open)
            .addAction(
                0, getString(if (searching) R.string.cancel else R.string.hang_up),
                PendingIntent.getService(this, 3, Intent(this, CallService::class.java).setAction(ACTION_HANG_UP), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT),
            )
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    companion object {
        private const val NOTIFICATION_ID = 1
        const val ACTION_HANG_UP = "app.talklive.HANG_UP"

        fun start(context: Context) {
            ContextCompat.startForegroundService(context, Intent(context, CallService::class.java))
        }
    }
}
