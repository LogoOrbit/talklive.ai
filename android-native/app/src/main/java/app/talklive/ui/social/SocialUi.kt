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
        diff < 3_600_000 -> DateUtils.getRelativeTimeSpanString(ts, System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS, DateUtils.FORMAT_ABBREV_RELATIVE).toString()
        DateUtils.isToday(ts) -> SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(ts))
        DateUtils.isToday(ts + DateUtils.DAY_IN_MILLIS) -> DateUtils.getRelativeTimeSpanString(ts, System.currentTimeMillis(), DateUtils.DAY_IN_MILLIS).toString()
        diff < 6 * DateUtils.DAY_IN_MILLIS -> SimpleDateFormat("EEE", Locale.getDefault()).format(Date(ts))
        else -> SimpleDateFormat("d MMM", Locale.getDefault()).format(Date(ts))
    }
}

@Composable
fun presence(p: Person): String = when {
    p.online -> androidx.compose.ui.res.stringResource(app.talklive.R.string.online)
    p.lastSeen != null -> androidx.compose.ui.res.stringResource(
        app.talklive.R.string.last_seen,
        DateUtils.getRelativeTimeSpanString(p.lastSeen, System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS).toString(),
    )
    else -> androidx.compose.ui.res.stringResource(app.talklive.R.string.offline)
}

/** ISO country code to its flag emoji. */
fun flag(code: String?): String? {
    if (code == null || code.length != 2 || !code.all { it.isLetter() } || code.equals("XX", true)) return null
    val base = 0x1F1E6 - 'A'.code
    return code.uppercase().map { String(Character.toChars(base + it.code)) }.joinToString("")
}
