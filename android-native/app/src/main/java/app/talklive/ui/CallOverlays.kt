package app.talklive.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.talklive.R
import app.talklive.ui.components.BrandGradient
import kotlinx.coroutines.delay

/** Both of you tapped the heart: a short celebration with a way to stay in touch. */
@Composable
fun MutualHeartOverlay(name: String, canAddFriend: Boolean, onAddFriend: () -> Unit, onDismiss: () -> Unit) {
    val pop = remember { Animatable(0.2f) }
    LaunchedEffect(Unit) {
        pop.animateTo(1f, spring(dampingRatio = 0.4f, stiffness = 300f))
        delay(5000)
        onDismiss()
    }
    val beat by rememberInfiniteTransition(label = "beat").animateFloat(1f, 1.08f, infiniteRepeatable(tween(450), RepeatMode.Reverse), label = "b")
    Box(
        Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.55f)).clickable(onClick = onDismiss),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
            Text("❤️", fontSize = 120.sp, modifier = Modifier.scale(pop.value * beat))
            Spacer(Modifier.height(16.dp))
            Text(stringResource(R.string.its_a_match), style = MaterialTheme.typography.headlineMedium, color = Color.White)
            Spacer(Modifier.height(6.dp))
            Text(stringResource(R.string.match_body, name), style = MaterialTheme.typography.bodyLarge, color = Color.White.copy(alpha = 0.85f), textAlign = TextAlign.Center)
            if (canAddFriend) {
                Spacer(Modifier.height(24.dp))
                Box(
                    Modifier.clip(CircleShape).background(BrandGradient).clickable { onAddFriend(); onDismiss() }.padding(horizontal = 28.dp, vertical = 14.dp),
                ) { Text(stringResource(R.string.add_friend), color = Color.White, style = MaterialTheme.typography.labelLarge) }
            }
        }
    }
}

/** "How was it?" after a call, answered with one tap. */
@Composable
fun RateCard(name: String, onRate: (Boolean) -> Unit, onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    LaunchedEffect(name) { delay(12_000); onDismiss() }
    Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface, shadowElevation = 8.dp, modifier = modifier.fillMaxWidth()) {
        Row(Modifier.padding(start = 18.dp, end = 4.dp, top = 10.dp, bottom = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                stringResource(R.string.how_was_it, name),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f),
            )
            listOf(true to "👍", false to "👎").forEach { (up, e) ->
                Box(
                    Modifier.size(44.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer).clickable { onRate(up) },
                    contentAlignment = Alignment.Center,
                ) { Text(e, fontSize = 22.sp) }
                Spacer(Modifier.width(8.dp))
            }
            IconButton(onClick = onDismiss) { Icon(Icons.Rounded.Close, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
}

