package app.talklive.ui.social

import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.CallEnd
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.social.IncomingCall
import app.talklive.social.OutgoingCall
import app.talklive.ui.animals.AnimalAvatar
import app.talklive.ui.theme.BrandTeal
import app.talklive.ui.theme.Danger
import app.talklive.ui.theme.Success

@Composable
fun IncomingCallScreen(call: IncomingCall, animal: String?, onAccept: () -> Unit, onDecline: () -> Unit) {
    Ringer()
    CallCard(
        animal = animal,
        name = call.username,
        status = listOfNotNull(flag(call.countryCode), stringResource(R.string.wants_to_talk)).joinToString(" "),
    ) {
        RoundAction(Icons.Rounded.CallEnd, stringResource(R.string.decline), Danger, onDecline)
        RoundAction(Icons.Rounded.Call, stringResource(R.string.accept), Success, onAccept)
    }
}

@Composable
fun OutgoingCallScreen(call: OutgoingCall, onCancel: () -> Unit) {
    CallCard(
        animal = call.person.animal,
        name = call.person.displayName,
        status = stringResource(R.string.calling),
    ) { RoundAction(Icons.Rounded.CallEnd, stringResource(R.string.cancel), Danger, onCancel) }
}

@Composable
private fun CallCard(animal: String?, name: String, status: String, actions: @Composable () -> Unit) {
    val t = rememberInfiniteTransition(label = "ring")
    val rings = (0 until 3).map { i ->
        t.animateFloat(0f, 1f, infiniteRepeatable(tween(2000, easing = LinearEasing), RepeatMode.Restart, StartOffset(i * 660)), label = "r$i")
    }
    Column(
        Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).clickable(enabled = false) {}
            .statusBarsPadding().navigationBarsPadding().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.weight(1f))
        Box(
            Modifier.size(260.dp).drawBehind {
                val base = 72.dp.toPx()
                rings.forEach { r ->
                    drawCircle(BrandTeal.copy(alpha = (1f - r.value) * 0.4f), radius = base + (size.minDimension / 2 - base) * r.value, style = Stroke(2.dp.toPx()))
                }
            },
            contentAlignment = Alignment.Center,
        ) { AnimalAvatar(animal, name, 144.dp) }
        Spacer(Modifier.height(24.dp))
        Text(name, style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground)
        Spacer(Modifier.height(6.dp))
        Text(status, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.weight(1.4f))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) { actions() }
    }
}

@Composable
private fun RoundAction(icon: ImageVector, label: String, color: Color, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(76.dp).clip(CircleShape).background(color).clickable(onClick = onClick), contentAlignment = Alignment.Center) {
            Icon(icon, label, tint = Color.White, modifier = Modifier.size(34.dp))
        }
        Spacer(Modifier.height(8.dp))
        Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onBackground)
    }
}

/** The phone's ringtone and a vibration pattern while a friend is calling. */
@Composable
private fun Ringer() {
    val context = LocalContext.current
    DisposableEffect(Unit) {
        val ringtone = runCatching {
            RingtoneManager.getRingtone(context, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE))?.apply {
                audioAttributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).build()
                if (Build.VERSION.SDK_INT >= 28) isLooping = true
                play()
            }
        }.getOrNull()
        val vibrator = if (Build.VERSION.SDK_INT >= 31) {
            context.getSystemService(VibratorManager::class.java)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Vibrator::class.java)
        }
        runCatching { vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 600, 800), 0)) }
        onDispose {
            runCatching { ringtone?.stop() }
            runCatching { vibrator?.cancel() }
        }
    }
}
