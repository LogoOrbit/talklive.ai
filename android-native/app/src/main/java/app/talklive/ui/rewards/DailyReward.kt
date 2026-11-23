package app.talklive.ui.rewards

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CardGiftcard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.talklive.R
import app.talklive.ui.components.PrimaryButton

/** The daily reward sheet is offered once per app process, on the first open where a claim is ready. */
object DailyOffer {
    @Volatile var shown = false
}

/**
 * "Daily reward": a gift that wiggles, "+1 point" and a Claim button. Dismissing it leaves the
 * level chip pulsing until the reward is claimed (Home).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DailyRewardSheet(vm: RewardsViewModel, onDismiss: () -> Unit) {
    val claimed = vm.claimNote == R.string.reward_claimed
    // A short moment on the "claimed" state, then the sheet goes.
    LaunchedEffect(claimed) {
        if (claimed) { kotlinx.coroutines.delay(1500); onDismiss() }
    }
    val still = app.talklive.ui.theme.LocalReduceMotion.current
    val t = rememberInfiniteTransition(label = "gift")
    val wiggle by t.animateFloat(-8f, 8f, infiniteRepeatable(tween(520, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "wiggle")
    val pop by t.animateFloat(0.94f, 1.08f, infiniteRepeatable(tween(900, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "pop")
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.background,
    ) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 24.dp).padding(bottom = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Box(
                Modifier.size(132.dp).graphicsLayer {
                    rotationZ = if (still || claimed) 0f else wiggle
                    val s = if (still || claimed) 1f else pop
                    scaleX = s; scaleY = s
                }.clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFFF59E0B), Color(0xFFEC4899)))),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Rounded.CardGiftcard, null, tint = Color.White, modifier = Modifier.size(72.dp)) }
            Spacer(Modifier.height(18.dp))
            Text(stringResource(R.string.daily_title), style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.height(4.dp))
            Text(stringResource(R.string.daily_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
            Spacer(Modifier.height(10.dp))
            Text(
                stringResource(R.string.daily_plus_one),
                fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, color = app.talklive.ui.theme.AccentText,
            )
            Spacer(Modifier.height(18.dp))
            if (claimed) {
                Text(stringResource(R.string.daily_claimed), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
            } else {
                // The server decides: once it says "wait" (or the reward is not ready yet), the button
                // becomes a live countdown instead of a Claim that can only be refused again.
                val p by vm.progress.collectAsStateWithLifecycle()
                var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
                val waitUntil = p?.takeIf { !it.canClaim }?.nextClaimAt ?: 0L
                LaunchedEffect(waitUntil) {
                    while (waitUntil > System.currentTimeMillis()) { now = System.currentTimeMillis(); kotlinx.coroutines.delay(1000) }
                    now = System.currentTimeMillis()
                }
                val waiting = p?.canClaim == false && (waitUntil == 0L || waitUntil > now)
                if (waiting) {
                    PrimaryButton(
                        if (waitUntil > now) stringResource(R.string.rewards_claim_wait, countdown(waitUntil - now)) else stringResource(R.string.reward_wait_note),
                        onClick = {}, enabled = false,
                    )
                    TextButton(onClick = onDismiss) { Text(stringResource(R.string.close)) }
                } else {
                    PrimaryButton(stringResource(R.string.daily_claim), onClick = vm::claim, loading = vm.busy)
                    vm.claimNote?.takeIf { it != R.string.reward_wait_note }?.let {
                        Spacer(Modifier.height(8.dp))
                        Text(stringResource(it), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                    }
                    TextButton(onClick = onDismiss) { Text(stringResource(R.string.daily_later)) }
                }
            }
        }
    }
}
