package app.talklive.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.talklive.net.Partner
import app.talklive.ui.social.flag
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/** "3:42 PM" where they are, or null when their zone is unknown or the same as ours. */
fun partnerLocalTime(p: Partner): String? {
    val zone = runCatching { ZoneId.of(p.timezone ?: return null) }.getOrNull() ?: return null
    val now = ZonedDateTime.now(zone)
    if (now.offset == ZonedDateTime.now().offset) return null
    return now.format(DateTimeFormatter.ofPattern("h:mm a", Locale.getDefault()))
}

fun speaksMyLanguage(p: Partner): Boolean = p.lang != null && p.lang.equals(Locale.getDefault().language, ignoreCase = true)

/** "🇪🇸 Spain · 3:42 PM there · Speaks your language". */
fun partnerLine(p: Partner): String = listOfNotNull(
    listOfNotNull(flag(p.countryCode), p.country).joinToString(" ").ifBlank { null },
    partnerLocalTime(p)?.let { "$it there" },
    if (speaksMyLanguage(p)) "Speaks your language" else null,
).joinToString("  ·  ")

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun InterestChips(interests: List<String>, modifier: Modifier = Modifier) {
    FlowRow(modifier, horizontalArrangement = Arrangement.spacedBy(6.dp, androidx.compose.ui.Alignment.CenterHorizontally), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        interests.take(6).forEach {
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
                Text(it, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp))
            }
        }
    }
}
