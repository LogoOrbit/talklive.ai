package app.talklive.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import app.talklive.MainActivity
import app.talklive.R
import app.talklive.net.TalkSocket
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/**
 * "Keep running in background": a quiet foreground service that holds the
 * connection open, so calls and messages still arrive after the app is
 * swiped away from recent apps. Off by default; switched on in Settings.
 */
object KeepAlive {
    private const val PREFS = "keep_alive"
    const val CHANNEL = "keep_alive"

    fun enabled(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("on", false)

    fun set(context: Context, on: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean("on", on).apply()
        if (on) start(context) else context.stopService(Intent(context, KeepAliveService::class.java))
    }

    /** Starts the service when switched on. Only call while the app is visible (or at boot). */
    fun start(context: Context) {
        if (!enabled(context)) return
        runCatching { ContextCompat.startForegroundService(context, Intent(context, KeepAliveService::class.java)) }
    }
}

@AndroidEntryPoint
class KeepAliveService : Service() {
    @Inject lateinit var socket: TalkSocket

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!KeepAlive.enabled(this)) { stopSelf(); return START_NOT_STICKY }
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(KeepAlive.CHANNEL, getString(R.string.keep_alive_channel), NotificationManager.IMPORTANCE_MIN)
                .apply { setShowBadge(false) },
        )
        val open = PendingIntent.getActivity(
            this, 31, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val n = NotificationCompat.Builder(this, KeepAlive.CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_talklive)
            .setContentTitle(getString(R.string.keep_alive_title))
            .setContentText(getString(R.string.keep_alive_body))
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setOngoing(true)
            .setContentIntent(open)
            .build()
        val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING else 0
        val ok = runCatching { ServiceCompat.startForeground(this, 41, n, type) }.isSuccess
        if (!ok) { stopSelf(); return START_NOT_STICKY }
        runCatching { socket.reconnectNow() }
        return START_STICKY
    }

    /** Swiped from recent apps: stay, and make sure the connection is up. */
    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        runCatching { socket.reconnectNow() }
    }
}

/** Brings the background service back after the phone restarts. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        KeepAlive.start(context)
        ComebackReminder.schedule(context)
    }
}
