package app.talklive.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
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
@Composable
fun partnerLine(p: Partner): String {
    val there = partnerLocalTime(p)?.let { androidx.compose.ui.res.stringResource(app.talklive.R.string.time_there, it) }
    val lang = if (speaksMyLanguage(p)) androidx.compose.ui.res.stringResource(app.talklive.R.string.speaks_your_language) else null
    return listOfNotNull(listOfNotNull(flag(p.countryCode), p.country).joinToString(" ").ifBlank { null }, there, lang).joinToString("  ·  ")
}

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

/**
 * The person you are talking to, opened by tapping their face or name in a
 * call or chat: avatar, where they are and what time it is there, what they
 * are into, and the two things you can do (add, report).
 */
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun PartnerSheet(
    p: Partner,
    friendStatus: FriendStatus,
    onAddFriend: () -> Unit,
    onReport: () -> Unit,
    onDismiss: () -> Unit,
) {
    androidx.compose.material3.ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = androidx.compose.material3.rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = androidx.compose.material3.MaterialTheme.colorScheme.background,
    ) {
        androidx.compose.foundation.layout.Column(
            Modifier.fillMaxWidth().verticalScroll(androidx.compose.foundation.rememberScrollState()).navigationBarsPadding().padding(horizontal = 24.dp).padding(bottom = 24.dp),
            horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
        ) {
            app.talklive.ui.components.PlusRing(p.premium, 112.dp) { app.talklive.ui.animals.AnimalAvatar(p.animal, p.username, 112.dp) }
            androidx.compose.foundation.layout.Spacer(Modifier.height(14.dp))
            androidx.compose.foundation.layout.Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                androidx.compose.material3.Text(p.username, style = androidx.compose.material3.MaterialTheme.typography.headlineSmall, color = androidx.compose.material3.MaterialTheme.colorScheme.onBackground)
                if (p.premium) androidx.compose.material3.Text("  💎", style = androidx.compose.material3.MaterialTheme.typography.titleLarge)
            }
            app.talklive.ui.animals.animalById(p.animal)?.let {
                androidx.compose.material3.Text(it.name + if (it.trait.isNotBlank()) " · ${it.trait}" else "", style = androidx.compose.material3.MaterialTheme.typography.bodyMedium, color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant)
            }
            app.talklive.ui.components.CopyIdChip(p.friendId, Modifier.padding(top = 10.dp))
            androidx.compose.foundation.layout.Spacer(Modifier.height(16.dp))
            // Facts, as tidy rows.
            androidx.compose.material3.Surface(shape = androidx.compose.foundation.shape.RoundedCornerShape(20.dp), color = androidx.compose.material3.MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
                androidx.compose.foundation.layout.Column(Modifier.padding(vertical = 6.dp)) {
                    val flag = p.countryCode?.takeIf { it.length == 2 }?.uppercase()?.map { String(Character.toChars(0x1F1E6 - 'A'.code + it.code)) }?.joinToString("")
                    p.country?.let { FactRow(flag ?: "🌍", it) }
                    partnerLocalTime(p)?.let { FactRow("🕒", androidx.compose.ui.res.stringResource(app.talklive.R.string.time_there, it)) }
                    if (speaksMyLanguage(p)) FactRow("💬", androidx.compose.ui.res.stringResource(app.talklive.R.string.speaks_your_language))
                }
            }
            if (p.interests.isNotEmpty()) {
                androidx.compose.foundation.layout.Spacer(Modifier.height(14.dp))
                InterestChips(p.interests)
            }
            if (p.films.isNotEmpty()) {
                androidx.compose.foundation.layout.Spacer(Modifier.height(14.dp))
                app.talklive.ui.engage.FilmPosters(p.films, 56.dp)
            }
            androidx.compose.foundation.layout.Spacer(Modifier.height(20.dp))
            androidx.compose.foundation.layout.Row(horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(12.dp)) {
                app.talklive.ui.components.PrimaryButton(
                    androidx.compose.ui.res.stringResource(
                        when (friendStatus) { FriendStatus.Friends -> app.talklive.R.string.friends_label; FriendStatus.Requested -> app.talklive.R.string.requested; FriendStatus.None -> app.talklive.R.string.add_friend },
                    ),
                    onClick = { onAddFriend(); onDismiss() },
                    enabled = friendStatus == FriendStatus.None,
                    modifier = Modifier.weight(1f),
                )
                androidx.compose.material3.OutlinedButton(onClick = { onDismiss(); onReport() }, modifier = Modifier.height(56.dp)) {
                    androidx.compose.material3.Text(androidx.compose.ui.res.stringResource(app.talklive.R.string.report), color = app.talklive.ui.theme.Danger)
                }
            }
        }
    }
}

@Composable
private fun FactRow(icon: String, text: String) {
    androidx.compose.foundation.layout.Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
        androidx.compose.material3.Text(icon, style = androidx.compose.material3.MaterialTheme.typography.titleMedium)
        androidx.compose.foundation.layout.Spacer(Modifier.width(12.dp))
        androidx.compose.material3.Text(text, style = androidx.compose.material3.MaterialTheme.typography.bodyLarge, color = androidx.compose.material3.MaterialTheme.colorScheme.onSurface)
    }
}
