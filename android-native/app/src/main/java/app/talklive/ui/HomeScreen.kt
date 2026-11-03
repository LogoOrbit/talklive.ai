package app.talklive.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
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
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.ui.components.BrandGradient
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.theme.BrandTeal
import app.talklive.ui.theme.BrandViolet
import app.talklive.ui.theme.Success
import java.text.NumberFormat

@Composable
fun HomeScreen(
    connected: Boolean,
    online: Int?,
    accountName: String?,
    onStart: () -> Unit,
    onSignIn: () -> Unit,
    onSignOut: () -> Unit,
) {
    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 24.dp, vertical = 16.dp)) {
        // Top bar: logo and account.
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Image(painterResource(R.drawable.logo), null, Modifier.size(32.dp))
            Spacer(Modifier.size(10.dp))
            Text("TalkLive", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.weight(1f))
            if (accountName == null) {
                TextButton(onClick = onSignIn) { Text(stringResource(R.string.sign_in)) }
            } else {
                AccountChip(accountName, onSignOut)
            }
        }

        Spacer(Modifier.weight(1f))
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { MicOrb() }
        Spacer(Modifier.height(36.dp))
        Text(
            stringResource(R.string.tagline),
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(16.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surface) {
                Row(Modifier.padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(8.dp).clip(CircleShape).background(if (connected) Success else MaterialTheme.colorScheme.outline))
                    Spacer(Modifier.size(8.dp))
                    Text(
                        when {
                            !connected -> stringResource(R.string.connecting_server)
                            online != null -> stringResource(R.string.online_now, NumberFormat.getIntegerInstance().format(online))
                            else -> stringResource(R.string.connecting_server)
                        },
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        Spacer(Modifier.weight(1f))
        PrimaryButton(
            text = stringResource(R.string.start_talking),
            onClick = onStart,
            enabled = connected,
            icon = Icons.Rounded.Mic,
        )
    }
}

/** The breathing mic: soft halo rings behind a gradient disc. */
@Composable
private fun MicOrb() {
    val t = rememberInfiniteTransition(label = "orb")
    val halo by t.animateFloat(0.9f, 1.15f, infiniteRepeatable(tween(1600), RepeatMode.Reverse), label = "halo")
    Box(contentAlignment = Alignment.Center) {
        Box(
            Modifier.size(220.dp).scale(halo).clip(CircleShape)
                .background(Brush.radialGradient(listOf(BrandViolet.copy(alpha = 0.18f), BrandTeal.copy(alpha = 0.0f)))),
        )
        Box(Modifier.size(160.dp).clip(CircleShape).background(BrandViolet.copy(alpha = 0.10f)))
        Box(
            Modifier.size(112.dp).clip(CircleShape).background(BrandGradient),
            contentAlignment = Alignment.Center,
        ) { Icon(Icons.Rounded.Mic, null, tint = Color.White, modifier = Modifier.size(52.dp)) }
    }
}

@Composable
private fun AccountChip(name: String, onSignOut: () -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        Surface(onClick = { open = true }, shape = CircleShape, color = MaterialTheme.colorScheme.surface) {
            Row(Modifier.padding(start = 4.dp, end = 12.dp, top = 4.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(28.dp).clip(CircleShape).background(BrandGradient),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(name.take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                }
                Spacer(Modifier.size(8.dp))
                Text(name, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface, maxLines = 1)
            }
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            DropdownMenuItem(
                text = { Text(stringResource(R.string.sign_out)) },
                leadingIcon = { Icon(Icons.AutoMirrored.Rounded.Logout, null) },
                onClick = { open = false; onSignOut() },
            )
        }
    }
}
