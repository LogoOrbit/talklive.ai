package app.talklive.ui.call

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
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

/** A live call, minimised: who, how long, mute and hang up; tap to open it again. */
@Composable
fun MiniCallBar(partner: Partner, sinceMs: Long, muted: Boolean, onOpen: () -> Unit, onMute: () -> Unit, onEnd: () -> Unit) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { kotlinx.coroutines.delay(1000); now = System.currentTimeMillis() } }
    val secs = ((now - sinceMs) / 1000).coerceAtLeast(0)
    Surface(
        shape = RoundedCornerShape(22.dp),
        color = Color(0xFF0F5132),
        shadowElevation = 8.dp,
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).clickable(onClick = onOpen),
    ) {
        Row(Modifier.padding(start = 8.dp, end = 6.dp, top = 6.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            AnimalAvatar(partner.animal, partner.username, 36.dp)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    "${partner.username.ifBlank { stringResource(R.string.stranger) }} · ${"%d:%02d".format(secs / 60, secs % 60)}",
                    style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, color = Color.White, maxLines = 1,
                )
                Text(stringResource(R.string.call_tap_return), style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.75f), maxLines = 1)
            }
            Box(
                Modifier.size(38.dp).clip(CircleShape).background(Color.White.copy(alpha = if (muted) 0.9f else 0.15f)).clickable(onClick = onMute),
                contentAlignment = Alignment.Center,
            ) { Icon(if (muted) Icons.Rounded.MicOff else Icons.Rounded.Mic, null, tint = if (muted) Color(0xFF0F5132) else Color.White, modifier = Modifier.size(20.dp)) }
            Spacer(Modifier.width(8.dp))
            Box(
                Modifier.size(38.dp).clip(CircleShape).background(Color(0xFFE5484D)).clickable(onClick = onEnd),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Rounded.CallEnd, null, tint = Color.White, modifier = Modifier.size(20.dp)) }
        }
    }
}
