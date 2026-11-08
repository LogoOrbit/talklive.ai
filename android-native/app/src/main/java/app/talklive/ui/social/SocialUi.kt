package app.talklive.ui.social

import android.text.format.DateUtils
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import app.talklive.social.Person
import app.talklive.ui.animals.AnimalAvatar
import app.talklive.ui.theme.Success
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Avatar with a green dot while they are online. */
@Composable
fun PersonAvatar(person: Person, size: Dp, showOnline: Boolean = true) {
    Box {
        AnimalAvatar(person.animal, person.displayName, size)
        if (showOnline && person.online) {
            val dot = size * 0.28f
            Box(
                Modifier.align(Alignment.BottomEnd).size(dot).clip(CircleShape).background(Success)
                    .border(size * 0.05f, MaterialTheme.colorScheme.background, CircleShape),
            )
        }
    }
}

/** "now", "5m", "3h", "Yesterday", "Mon", "12 Oct". */
fun shortTime(ts: Long): String {
    if (ts <= 0) return ""
    val diff = System.currentTimeMillis() - ts
    return when {
        // Like WhatsApp: the clock time for today, short and the same width.
        DateUtils.isToday(ts) || diff < 60_000 -> SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(ts))
        DateUtils.isToday(ts + DateUtils.DAY_IN_MILLIS) -> DateUtils.getRelativeTimeSpanString(ts, System.currentTimeMillis(), DateUtils.DAY_IN_MILLIS).toString()
        diff < 6 * DateUtils.DAY_IN_MILLIS -> SimpleDateFormat("EEE", Locale.getDefault()).format(Date(ts))
        else -> SimpleDateFormat("d MMM", Locale.getDefault()).format(Date(ts))
    }
}

@Composable
fun presence(p: Person): String = when {
    p.online -> androidx.compose.ui.res.stringResource(app.talklive.R.string.online_now)
    p.lastSeen != null -> androidx.compose.ui.res.stringResource(
        app.talklive.R.string.last_seen,
        DateUtils.getRelativeTimeSpanString(p.lastSeen, System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS).toString(),
    )
    else -> androidx.compose.ui.res.stringResource(app.talklive.R.string.offline)
}

/** "Usually online 8 PM–11 PM", in this phone's time, or null when unknown. */
@Composable
fun usualOnline(p: Person): String? {
    val from = p.usualFrom ?: return null
    val to = p.usualTo ?: return null
    val h24 = android.text.format.DateFormat.is24HourFormat(androidx.compose.ui.platform.LocalContext.current)
    fun hour(h: Int): String {
        val c = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC")).apply { set(java.util.Calendar.HOUR_OF_DAY, h); set(java.util.Calendar.MINUTE, 0) }
        return SimpleDateFormat(if (h24) "HH:mm" else "h a", Locale.getDefault()).format(c.time)
    }
    return androidx.compose.ui.res.stringResource(app.talklive.R.string.usually_online, hour(from), hour(to))
}

/** ISO country code to its flag emoji. */
fun flag(code: String?): String? {
    if (code == null || code.length != 2 || !code.all { it.isLetter() } || code.equals("XX", true)) return null
    val base = 0x1F1E6 - 'A'.code
    return code.uppercase().map { String(Character.toChars(base + it.code)) }.joinToString("")
}
