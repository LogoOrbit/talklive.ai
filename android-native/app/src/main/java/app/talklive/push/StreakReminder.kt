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
import app.talklive.engage.Engage
import java.util.Calendar

/**
 * One evening reminder (8 pm, phone time) on a day the streak is still open:
 * "Your 12-day streak ends tonight". Nothing once today's call is done, and
 * nothing for streaks shorter than 2 days.
 */
object StreakReminder {
    private const val PREFS = "streak_reminder"
    private const val HOUR = 20

    fun update(context: Context, engage: Engage) {
        val s = engage.streak
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.edit().putInt("count", s.count).putBoolean("done", s.doneToday).putLong("at", System.currentTimeMillis()).apply()
        val am = context.getSystemService(AlarmManager::class.java) ?: return
        val pi = PendingIntent.getBroadcast(context, 7, Intent(context, StreakReceiver::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        am.cancel(pi)
        if (s.count < 2 || s.doneToday) return
        val at = Calendar.getInstance().apply { set(Calendar.HOUR_OF_DAY, HOUR); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0) }
        if (at.timeInMillis <= System.currentTimeMillis()) return // already evening: no late-night ping
        runCatching { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at.timeInMillis, pi) }
    }

    internal fun fire(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val count = prefs.getInt("count", 0)
        // Only what was true today: an old state could be a streak already kept or lost.
        val sameDay = android.text.format.DateUtils.isToday(prefs.getLong("at", 0))
        if (count < 2 || prefs.getBoolean("done", false) || !sameDay) return
        val open = PendingIntent.getActivity(
            context, 8, Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val n = NotificationCompat.Builder(context, TalkLiveApplication.CHANNEL_SOCIAL)
            .setSmallIcon(R.drawable.ic_stat_talklive)
            .setColor(0xFF6C5CE7.toInt())
            .setContentTitle(context.getString(R.string.streak_reminder_title, count))
            .setContentText(context.getString(R.string.streak_reminder_body))
            .setAutoCancel(true)
            .setContentIntent(open)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify("streak", 0, n) }
    }
}

class StreakReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) = StreakReminder.fire(context)
}
