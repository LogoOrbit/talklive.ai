package app.talklive.ui.call

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.GraphicEq
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material.icons.rounded.PhoneInTalk
import androidx.compose.material.icons.rounded.ReportProblem
import androidx.compose.material.icons.rounded.VolumeUp
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.net.Partner
import app.talklive.ui.animals.AnimalAvatar

/**
 * Everything about the call in one sheet: that it is encrypted, who is on it,
 * where the sound goes, noise suppression, and a way to report a problem.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CallSettingsSheet(
    partner: Partner,
    myAnimal: String?,
    speakerOn: Boolean,
    noiseSuppression: Boolean,
    canAddFriend: Boolean,
    onSpeaker: (Boolean) -> Unit,
    onNoiseSuppression: (Boolean) -> Unit,
    onAddFriend: () -> Unit,
    onReport: () -> Unit,
    onProblem: () -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).navigationBarsPadding().padding(bottom = 12.dp)) {
            // Voice goes straight between the two phones, encrypted (WebRTC DTLS-SRTP).
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceContainerHigh, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                Row(Modifier.padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Lock, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(stringResource(R.string.call_encrypted), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
                }
            }
            Label(R.string.call_people)
            Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                AnimalAvatar(myAnimal, "", 40.dp)
                Spacer(Modifier.width(14.dp))
                Text(stringResource(R.string.you), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            }
            Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Box {
                    AnimalAvatar(partner.animal, partner.username, 40.dp)
                    Box(Modifier.align(Alignment.BottomEnd).size(12.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surface).padding(2.dp).clip(CircleShape).background(app.talklive.ui.theme.Success))
                }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(partner.username.ifBlank { stringResource(R.string.stranger) }, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                    partner.country?.let { Text(listOfNotNull(app.talklive.ui.social.flag(partner.countryCode), it).joinToString(" "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
                if (canAddFriend) RoundIcon(Icons.Rounded.PersonAdd, onAddFriend)
                Spacer(Modifier.width(6.dp))
                RoundIcon(Icons.Rounded.Flag, onReport, danger = true)
            }
            Label(R.string.call_settings)
            Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.VolumeUp, null, tint = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.width(16.dp))
                Text(stringResource(R.string.call_audio_output), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                // Phone earpiece or loudspeaker.
                Row(Modifier.clip(CircleShape).background(MaterialTheme.colorScheme.surfaceContainerHigh).padding(3.dp)) {
                    listOf(false to R.string.call_out_phone, true to R.string.call_out_speaker).forEach { (speaker, label) ->
                        val on = speakerOn == speaker
                        Box(
                            Modifier.clip(CircleShape).background(if (on) MaterialTheme.colorScheme.primary else androidx.compose.ui.graphics.Color.Transparent)
                                .clickable { if (!on) onSpeaker(speaker) }.padding(horizontal = 12.dp, vertical = 6.dp),
                        ) { Text(stringResource(label), style = MaterialTheme.typography.labelLarge, color = if (on) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                }
            }
            Row(Modifier.fillMaxWidth().clickable { onNoiseSuppression(!noiseSuppression) }.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.GraphicEq, null, tint = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.call_noise), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                    Text(stringResource(R.string.call_noise_desc), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Switch(checked = noiseSuppression, onCheckedChange = onNoiseSuppression, colors = SwitchDefaults.colors(checkedTrackColor = MaterialTheme.colorScheme.primary))
            }
            Label(R.string.call_support)
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable(onClick = onProblem).padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.ReportProblem, null, tint = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.width(16.dp))
                Text(stringResource(R.string.call_tech_problem), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}

@Composable
private fun Label(text: Int) {
    Text(stringResource(text), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 20.dp, bottom = 4.dp))
}

@Composable
private fun RoundIcon(icon: ImageVector, onClick: () -> Unit, danger: Boolean = false) {
    Box(
        Modifier.size(38.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceContainerHigh).clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Icon(icon, null, tint = if (danger) app.talklive.ui.theme.Danger else MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp)) }
}

/** The button on the call screen that opens [CallSettingsSheet]. */
@Composable
fun CallSettingsButton(onClick: () -> Unit) {
    Surface(onClick = onClick, shape = CircleShape, color = MaterialTheme.colorScheme.surface.copy(alpha = 0.85f), modifier = Modifier.size(40.dp)) {
        Box(contentAlignment = Alignment.Center) { Icon(Icons.Rounded.PhoneInTalk, stringResource(R.string.call_settings), tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(20.dp)) }
    }
}
