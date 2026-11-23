package app.talklive.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.CallMade
import androidx.compose.material.icons.automirrored.rounded.CallMissed
import androidx.compose.material.icons.automirrored.rounded.CallMissedOutgoing
import androidx.compose.material.icons.automirrored.rounded.CallReceived
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.talklive.R
import app.talklive.social.CallLogEntry
import app.talklive.social.CallLogStore
import app.talklive.social.CallOutcome
import app.talklive.ui.animals.AnimalAvatar
import app.talklive.ui.theme.Danger
import app.talklive.ui.theme.Success
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class CallLogViewModel @Inject constructor(private val store: CallLogStore) : ViewModel() {
    val entries = store.entries
    val seenAt = store.seenAt
    fun markSeen() = store.markSeen()
    fun remove(id: Long) = store.remove(id)
    fun clear() = store.clear()
}

/** "1h 05m", "4m 12s", "38s". */
fun talkTime(secs: Long): String = when {
    secs >= 3600 -> "%dh %02dm".format(secs / 3600, (secs % 3600) / 60)
    secs >= 60 -> "%dm %02ds".format(secs / 60, secs % 60)
    else -> "${secs}s"
}

/** Friend calls, like a phone's call log: who called, who you called, and for how long. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CallLogSheet(onDismiss: () -> Unit, onCallBack: (String) -> Unit, vm: CallLogViewModel = hiltViewModel()) {
    val entries by vm.entries.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { vm.markSeen() }
    var missedOnly by rememberSaveable { mutableStateOf(false) }
    var confirmClear by remember { mutableStateOf(false) }
    val shown = if (missedOnly) entries.filter { it.outcome == CallOutcome.Missed || it.outcome == CallOutcome.Declined } else entries

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(Modifier.fillMaxWidth().fillMaxHeight(0.9f)) {
            Row(Modifier.fillMaxWidth().padding(start = 20.dp, end = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.call_log), style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                if (entries.isNotEmpty()) TextButton(onClick = { confirmClear = true }) { Text(stringResource(R.string.call_log_clear)) }
            }
            // Totals: talk time, people, calls.
            val answered = entries.filter { it.outcome == CallOutcome.Answered }
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Stat(talkTime(answered.sumOf { it.durationSec }), stringResource(R.string.call_log_talk_time), Modifier.weight(1f))
                Stat(answered.map { it.clientId }.distinct().size.toString(), stringResource(R.string.call_log_people), Modifier.weight(1f))
                Stat(entries.size.toString(), stringResource(R.string.call_log_calls), Modifier.weight(1f))
            }
            Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = !missedOnly, onClick = { missedOnly = false }, label = { Text(stringResource(R.string.call_log_all)) })
                FilterChip(selected = missedOnly, onClick = { missedOnly = true }, label = { Text(stringResource(R.string.call_log_missed)) })
            }
            if (shown.isEmpty()) {
                Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    Text(stringResource(R.string.call_log_empty), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(vertical = 8.dp)) {
                items(shown, key = { it.id }) { e -> CallLogRow(e, onCallBack = { onCallBack(e.clientId) }) }
            }
        }
    }
    if (confirmClear) androidx.compose.material3.AlertDialog(
        onDismissRequest = { confirmClear = false },
        title = { Text(stringResource(R.string.call_log_clear_q)) },
        confirmButton = { TextButton(onClick = { confirmClear = false; vm.clear() }) { Text(stringResource(R.string.call_log_clear), color = Danger) } },
        dismissButton = { TextButton(onClick = { confirmClear = false }) { Text(stringResource(R.string.cancel)) } },
    )
}

@Composable
private fun Stat(value: String, label: String, modifier: Modifier) {
    Column(
        modifier.clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surfaceVariant).padding(vertical = 10.dp, horizontal = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(value, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 1)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
    }
}

@Composable
private fun CallLogRow(e: CallLogEntry, onCallBack: () -> Unit) {
    val bad = e.outcome != CallOutcome.Answered
    val (icon, tint) = when {
        e.outcome == CallOutcome.Answered && e.outgoing -> Icons.AutoMirrored.Rounded.CallMade to Success
        e.outcome == CallOutcome.Answered -> Icons.AutoMirrored.Rounded.CallReceived to Success
        e.outgoing -> Icons.AutoMirrored.Rounded.CallMissedOutgoing to MaterialTheme.colorScheme.onSurfaceVariant
        else -> Icons.AutoMirrored.Rounded.CallMissed to Danger
    }
    val what = stringResource(
        when (e.outcome) {
            CallOutcome.Answered -> if (e.outgoing) R.string.call_log_outgoing else R.string.call_log_incoming
            CallOutcome.Missed -> R.string.call_log_missed_one
            CallOutcome.Declined -> R.string.call_log_declined
            CallOutcome.NoAnswer -> R.string.call_log_no_answer
        },
    )
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        AnimalAvatar(e.animal, e.name, 46.dp)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                e.name, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis,
                color = if (bad && !e.outgoing) Danger else MaterialTheme.colorScheme.onSurface,
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, null, tint = tint, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text(
                    listOf(what, shortTime(e.ts)).joinToString(" · ") + if (e.durationSec > 0) " · " + talkTime(e.durationSec) else "",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
            }
        }
        IconButton(onClick = onCallBack) {
            Box(Modifier.size(40.dp).clip(CircleShape).background(Success.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.Call, stringResource(R.string.call), tint = Success, modifier = Modifier.size(20.dp))
            }
        }
    }
}

/** A small "call log" button with a red count of missed calls not yet looked at. */
@Composable
fun CallLogButton(onClick: () -> Unit, vm: CallLogViewModel = hiltViewModel()) {
    val entries by vm.entries.collectAsStateWithLifecycle()
    val seenAt by vm.seenAt.collectAsStateWithLifecycle()
    val missed = entries.count { it.outcome == CallOutcome.Missed && it.ts > seenAt }
    IconButton(onClick = onClick) {
        androidx.compose.material3.BadgedBox(badge = {
            if (missed > 0) androidx.compose.material3.Badge(containerColor = Danger, contentColor = Color.White) { Text(missed.toString()) }
        }) { Icon(Icons.Rounded.Call, stringResource(R.string.call_log)) }
    }
}
