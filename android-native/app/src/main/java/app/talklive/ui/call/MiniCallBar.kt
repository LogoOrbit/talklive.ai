package app.talklive.ui.call

import app.talklive.ui.components.tapOnce
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.CallEnd
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material.icons.rounded.MicOff
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.net.Partner
import app.talklive.ui.animals.AnimalAvatar

/**
 * A live call, minimised (WhatsApp style): a green strip across the top of the
 * screen, behind the status bar. Mute on the left, who and how long in the
 * middle, hang up on the right; tap anywhere else to go back to the call.
 */
@Composable
fun MiniCallBar(partner: Partner, sinceMs: Long, muted: Boolean, onOpen: () -> Unit, onMute: () -> Unit, onEnd: () -> Unit) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { kotlinx.coroutines.delay(1000); now = System.currentTimeMillis() } }
    val secs = ((now - sinceMs) / 1000).coerceAtLeast(0)
    val green = Color(0xFF1F8F4E)
    Box(Modifier.fillMaxWidth().background(green).clickable(onClick = onOpen).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(52.dp).padding(horizontal = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(36.dp).clip(CircleShape).background(Color.White.copy(alpha = if (muted) 0.95f else 0.16f)).clickable(onClick = onMute),
                contentAlignment = Alignment.Center,
            ) { Icon(if (muted) Icons.Rounded.MicOff else Icons.Rounded.Mic, null, tint = if (muted) green else Color.White, modifier = Modifier.size(19.dp)) }
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Call, null, tint = Color.White, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text(
                    "${partner.username.ifBlank { stringResource(R.string.stranger) }} · ${"%d:%02d".format(secs / 60, secs % 60)}",
                    style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, color = Color.White, maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                )
            }
            Box(
                Modifier.size(36.dp).clip(CircleShape).background(Color(0xFFE5484D)).tapOnce(windowMs = 700, onClick = onEnd),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Rounded.CallEnd, null, tint = Color.White, modifier = Modifier.size(19.dp)) }
        }
    }
}
