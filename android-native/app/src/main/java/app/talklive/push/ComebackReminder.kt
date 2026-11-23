package app.talklive.push

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import app.talklive.MainActivity
import app.talklive.R
import app.talklive.TalkLiveApplication
import java.util.Calendar

/**
 * One friendly nudge a day to someone who has not opened the app for a day:
 * at most one notification in any 24 hours, and none while the app is in use.
 */
object ComebackReminder {
    private const val PREFS = "comeback"
    private const val DAY = 24L * 60 * 60 * 1000

    /** The app was just used: push the next nudge a day out. */
    fun appUsed(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong("used", System.currentTimeMillis()).apply()
        schedule(context)
    }

    fun schedule(context: Context, from: Long = System.currentTimeMillis()) {
        val am = context.getSystemService(AlarmManager::class.java) ?: return
        val pi = pending(context)
        am.cancel(pi)
        // A day later, moved into daytime (10:00-21:00) so nobody is woken up.
        val at = Calendar.getInstance().apply {
            timeInMillis = from + DAY
            val h = get(Calendar.HOUR_OF_DAY)
            if (h < 10) { set(Calendar.HOUR_OF_DAY, 10); set(Calendar.MINUTE, 0) }
            else if (h >= 21) { add(Calendar.DAY_OF_YEAR, 1); set(Calendar.HOUR_OF_DAY, 10); set(Calendar.MINUTE, 0) }
        }
        runCatching { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at.timeInMillis, pi) }
    }

    private fun pending(context: Context) = PendingIntent.getBroadcast(
        context, 21, Intent(context, ComebackReceiver::class.java),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    internal fun fire(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        val used = prefs.getLong("used", 0)
        val sent = prefs.getLong("sent", 0)
        // Opened recently or already nudged today: just look again tomorrow.
        if (now - used < 20L * 60 * 60 * 1000 || now - sent < 23L * 60 * 60 * 1000) { schedule(context, now); return }
        val lines = listOf(
            R.string.comeback_1_title to R.string.comeback_1_body,
            R.string.comeback_2_title to R.string.comeback_2_body,
            R.string.comeback_3_title to R.string.comeback_3_body,
            R.string.comeback_4_title to R.string.comeback_4_body,
        )
        val i = prefs.getInt("i", 0)
        val (title, body) = lines[i % lines.size]
        val open = PendingIntent.getActivity(
            context, 22, Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val n = NotificationCompat.Builder(context, TalkLiveApplication.CHANNEL_SOCIAL)
            .setSmallIcon(R.drawable.ic_stat_talklive)
            .setColor(0xFF2A6FE8.toInt())
            .setContentTitle(context.getString(title))
            .setContentText(context.getString(body))
            .setAutoCancel(true)
            .setContentIntent(open)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify("comeback", 0, n) }
        prefs.edit().putLong("sent", now).putInt("i", i + 1).apply()
        schedule(context, now)
    }
}

class ComebackReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = ComebackReminder.fire(context)
}
