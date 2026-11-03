package app.talklive.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.VolumeUp
import androidx.compose.material.icons.rounded.CallEnd
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.Hearing
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material.icons.rounded.MicOff
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.talklive.R
import app.talklive.call.CallPhase
import app.talklive.call.CallState
import app.talklive.net.Partner
import app.talklive.ui.theme.BrandTeal
import app.talklive.ui.theme.BrandViolet
import app.talklive.ui.theme.Danger
import kotlinx.coroutines.delay

@Composable
fun CallScreen(
    state: CallState,
    onNext: () -> Unit,
    onEnd: () -> Unit,
    onMute: () -> Unit,
    onSpeaker: () -> Unit,
    onReport: (String) -> Unit,
) {
    var reporting by remember { mutableStateOf(false) }
    val phase = state.phase
    val partner = when (phase) {
        is CallPhase.Connecting -> phase.partner
        is CallPhase.Connected -> phase.partner
        else -> null
    }

    Column(
        Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 24.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.weight(1f))
        Avatar(partner, pulsing = phase !is CallPhase.Connected)
        Spacer(Modifier.height(28.dp))
        when (phase) {
            is CallPhase.Searching -> {
                Title(stringResource(R.string.searching))
                phase.etaSeconds?.takeIf { it > 0 }?.let { Subtitle(stringResource(R.string.searching_eta, it)) }
            }
            is CallPhase.Connecting -> {
                Title(phase.partner.username)
                Subtitle(listOfNotNull(flag(phase.partner.countryCode), phase.partner.country).joinToString(" "))
                Spacer(Modifier.height(6.dp))
                Subtitle(stringResource(R.string.connecting_call))
            }
            is CallPhase.Connected -> {
                Title(phase.partner.username)
                Subtitle(listOfNotNull(flag(phase.partner.countryCode), phase.partner.country).joinToString(" "))
                Spacer(Modifier.height(6.dp))
                Elapsed(phase.sinceMs)
                if (state.partnerMuted) {
                    Spacer(Modifier.height(6.dp))
                    Subtitle(stringResource(R.string.partner_muted))
                }
            }
            CallPhase.Idle -> Unit
        }
        Spacer(Modifier.weight(1.4f))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.Top) {
            Control(
                icon = if (state.muted) Icons.Rounded.MicOff else Icons.Rounded.Mic,
                label = stringResource(if (state.muted) R.string.unmute else R.string.mute),
                active = state.muted,
                onClick = onMute,
            )
            Control(
                icon = if (state.speakerOn) Icons.AutoMirrored.Rounded.VolumeUp else Icons.Rounded.Hearing,
                label = stringResource(R.string.speaker),
                active = state.speakerOn,
                onClick = onSpeaker,
            )
            Control(
                icon = Icons.Rounded.Flag,
                label = stringResource(R.string.report),
                enabled = partner != null,
                onClick = { reporting = true },
            )
        }
        Spacer(Modifier.height(28.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            Control(Icons.Rounded.CallEnd, stringResource(R.string.end), container = Danger, size = 72, onClick = onEnd)
            Control(Icons.Rounded.SkipNext, stringResource(R.string.next), container = BrandTeal, size = 72, onClick = onNext)
        }
    }

    if (reporting) {
        val reasons = listOf(
            "inappropriate" to R.string.report_inappropriate,
            "harassment" to R.string.report_harassment,
            "spam" to R.string.report_spam,
            "underage" to R.string.report_underage,
        )
        AlertDialog(
            onDismissRequest = { reporting = false },
            title = { Text(stringResource(R.string.report_title)) },
            text = {
                Column {
                    Text(stringResource(R.string.report_body), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(8.dp))
                    reasons.forEach { (key, label) ->
                        TextButton(onClick = { reporting = false; onReport(key) }) { Text(stringResource(label)) }
                    }
                }
            },
            confirmButton = {},
            dismissButton = { TextButton(onClick = { reporting = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

@Composable
private fun Avatar(partner: Partner?, pulsing: Boolean) {
    val t = rememberInfiniteTransition(label = "pulse")
    val s by t.animateFloat(1f, if (pulsing) 1.12f else 1f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "s")
    Box(
        Modifier.size(150.dp).scale(s).clip(CircleShape)
            .background(Brush.linearGradient(listOf(BrandViolet, BrandTeal))),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            partner?.username?.firstOrNull()?.uppercase() ?: "?",
            fontSize = 60.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
        )
    }
}

@Composable
private fun Title(text: String) =
    Text(text, fontSize = 24.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground)

@Composable
private fun Subtitle(text: String) =
    Text(text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)

@Composable
private fun Elapsed(sinceMs: Long) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(sinceMs) {
        while (true) { now = System.currentTimeMillis(); delay(1000) }
    }
    val secs = ((now - sinceMs) / 1000).coerceAtLeast(0)
    Subtitle("%d:%02d".format(secs / 60, secs % 60))
}

@Composable
private fun Control(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    active: Boolean = false,
    enabled: Boolean = true,
    container: Color? = null,
    size: Int = 60,
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        FilledIconButton(
            onClick = onClick,
            enabled = enabled,
            modifier = Modifier.size(size.dp),
            colors = IconButtonDefaults.filledIconButtonColors(
                containerColor = container ?: if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                contentColor = if (container != null || active) Color.White else MaterialTheme.colorScheme.onSurface,
            ),
        ) { Icon(icon, contentDescription = label, modifier = Modifier.size((size * 0.45).dp)) }
        Spacer(Modifier.height(6.dp))
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/** ISO country code to its flag emoji. */
private fun flag(code: String?): String? {
    if (code == null || code.length != 2 || !code.all { it.isLetter() }) return null
    val base = 0x1F1E6 - 'A'.code
    return code.uppercase().map { String(Character.toChars(base + it.code)) }.joinToString("")
}
