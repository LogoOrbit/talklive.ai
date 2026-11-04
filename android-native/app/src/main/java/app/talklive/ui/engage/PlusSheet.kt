package app.talklive.ui.engage

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FilterAlt
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Undo
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.talklive.R
import app.talklive.billing.BillingState
import app.talklive.billing.PlayBilling
import app.talklive.billing.PlayMessage
import app.talklive.billing.PlusPlan
import app.talklive.engage.Premium
import app.talklive.ui.components.BrandGradient
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.theme.LocalAccents
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class PlusViewModel @Inject constructor(val billing: PlayBilling) : ViewModel()

/**
 * TalkLive Plus, full screen: what it adds, Play's prices for this person,
 * subscribe, restore and manage. Guests sign in first so Plus follows the
 * account to a new phone. [onFreeOption] adds a quiet "continue free" link,
 * used when this opens from a free feature (filters).
 */
@Composable
fun PlusSheet(
    premium: Premium,
    signedIn: Boolean,
    onSignIn: () -> Unit,
    onDismiss: () -> Unit,
    onInvite: (() -> Unit)? = null,
    onFreeOption: Pair<String, () -> Unit>? = null,
    vm: PlusViewModel = hiltViewModel(),
) {
    val context = LocalContext.current
    val state by vm.billing.state.collectAsStateWithLifecycle()
    val busy by vm.billing.busy.collectAsStateWithLifecycle()
    val message by vm.billing.message.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { vm.billing.refresh() }
    LaunchedEffect(message) {
        val m = message ?: return@LaunchedEffect
        val text = when (m) {
            PlayMessage.Welcome -> context.getString(R.string.plus_welcome)
            PlayMessage.Pending -> context.getString(R.string.plus_pending)
            PlayMessage.Later -> context.getString(R.string.plus_later)
            PlayMessage.Failed -> context.getString(R.string.plus_failed)
            PlayMessage.NothingToRestore -> context.getString(R.string.plus_nothing_to_restore)
            is PlayMessage.Error -> m.text.ifBlank { context.getString(R.string.plus_failed) }
        }
        Toast.makeText(context, text, Toast.LENGTH_LONG).show()
        vm.billing.clearMessage()
    }
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        PlusContent(
            premium, signedIn, state, busy,
            onSignIn = onSignIn,
            onBuy = { plan -> context.findActivity()?.let { vm.billing.buy(it, plan) } },
            onRestore = { vm.billing.restore() },
            onManage = { openManage(context) },
            onClose = onDismiss,
            onInvite = onInvite,
            onFreeOption = onFreeOption,
        )
    }
}

private data class Perk(val icon: ImageVector, val title: Int, val body: Int)

private val PERKS = listOf(
    Perk(Icons.Rounded.FilterAlt, R.string.plus_perk_gender, R.string.plus_perk_gender_body),
    Perk(Icons.Rounded.Favorite, R.string.plus_perk_likes, R.string.plus_perk_likes_body),
    Perk(Icons.Rounded.Undo, R.string.plus_perk_undo, R.string.plus_perk_undo_body),
    Perk(Icons.Rounded.Bolt, R.string.plus_perk_queue, R.string.plus_perk_queue_body),
    Perk(Icons.Rounded.Verified, R.string.plus_perk_badge, R.string.plus_perk_badge_body),
)

/** The page itself, without Play, so it can be rendered in tests. */
@Composable
fun PlusContent(
    premium: Premium, signedIn: Boolean, state: BillingState, busy: Boolean,
    onSignIn: () -> Unit, onBuy: (PlusPlan) -> Unit, onRestore: () -> Unit, onManage: () -> Unit,
    onClose: () -> Unit = {}, onInvite: (() -> Unit)? = null, onFreeOption: Pair<String, () -> Unit>? = null,
) {
    val accents = LocalAccents.current
    val still = app.talklive.ui.theme.LocalReduceMotion.current
    var picked by remember(state) { mutableStateOf((state as? BillingState.Ready)?.plans?.lastOrNull()) }
    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        // A slow glow behind the hero, like the website's background.
        val drift = if (still) 0.4f else rememberInfiniteTransition(label = "glow").animateFloat(0f, 1f, infiniteRepeatable(tween(6000, easing = LinearEasing), RepeatMode.Reverse), label = "drift").value
        Box(
            Modifier.fillMaxWidth().height(420.dp).background(
                Brush.radialGradient(
                    listOf(accents.a.copy(alpha = 0.45f), accents.b.copy(alpha = 0.18f), Color.Transparent),
                    center = androidx.compose.ui.geometry.Offset(300f + 500f * drift, 120f),
                    radius = 900f,
                ),
            ),
        )
        Column(
            Modifier.fillMaxSize().statusBarsPadding().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 180.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                IconButton(onClick = onClose) { Icon(Icons.Rounded.Close, stringResource(R.string.cancel), tint = MaterialTheme.colorScheme.onBackground) }
            }
            Gem()
            Spacer(Modifier.height(14.dp))
            Text(stringResource(R.string.plus), style = MaterialTheme.typography.displaySmall, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.height(6.dp))
            Text(
                stringResource(if (premium.active) R.string.plus_hero_active else R.string.plus_hero),
                style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(24.dp))
            Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(vertical = 8.dp)) {
                    PERKS.forEach { p ->
                        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(42.dp).clip(RoundedCornerShape(14.dp)).background(BrandGradient), contentAlignment = Alignment.Center) {
                                Icon(p.icon, null, tint = Color.White, modifier = Modifier.size(22.dp))
                            }
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Text(stringResource(p.title), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                                Text(stringResource(p.body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(20.dp))
            when {
                premium.active -> Text(
                    if (premium.expiresAt != null) stringResource(R.string.plus_until, java.text.DateFormat.getDateInstance().format(java.util.Date(premium.expiresAt)))
                    else stringResource(R.string.plus_active),
                    style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary,
                )
                !signedIn -> Text(stringResource(R.string.plus_sign_in), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                state is BillingState.Loading -> CircularProgressIndicator(Modifier.size(28.dp))
                state is BillingState.Unavailable -> Text(stringResource(R.string.plus_unavailable), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                state is BillingState.Ready -> Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    state.plans.asReversed().forEach { plan -> PlanCard(plan, state.plans, plan == picked) { picked = plan } }
                }
            }
            if (onInvite != null && !premium.active) {
                Spacer(Modifier.height(16.dp))
                Surface(onClick = onInvite, shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("🎁", fontSize = 26.sp)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(stringResource(R.string.plus_earn_title), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                            Text(stringResource(R.string.plus_earn_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
            if (signedIn) TextButton(onClick = onRestore, modifier = Modifier.padding(top = 8.dp)) { Text(stringResource(R.string.plus_restore)) }
        }

        // The action stays in reach at the bottom.
        Column(
            Modifier.align(Alignment.BottomCenter).fillMaxWidth()
                .background(Brush.verticalGradient(listOf(Color.Transparent, MaterialTheme.colorScheme.background, MaterialTheme.colorScheme.background)))
                .navigationBarsPadding().padding(horizontal = 20.dp).padding(top = 28.dp, bottom = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            when {
                premium.active -> if (premium.play) PrimaryButton(stringResource(R.string.plus_manage), onClick = onManage) else PrimaryButton(stringResource(R.string.ok), onClick = onClose)
                !signedIn -> PrimaryButton(stringResource(R.string.sign_in_or_create), onClick = onSignIn)
                else -> {
                    val plan = picked
                    val pulse = if (still) 1f else rememberInfiniteTransition(label = "cta").animateFloat(1f, 1.03f, infiniteRepeatable(tween(900, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "pulse").value
                    PrimaryButton(
                        when { plan == null -> stringResource(R.string.plus_subscribe); plan.trial != null -> stringResource(R.string.plus_start_trial); else -> stringResource(R.string.plus_subscribe_price, plan.price) },
                        onClick = { plan?.let(onBuy) },
                        enabled = plan != null,
                        loading = busy,
                        modifier = Modifier.scale(if (plan != null) pulse else 1f),
                    )
                    Text(stringResource(R.string.plus_terms), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp))
                }
            }
            onFreeOption?.let { (label, go) -> TextButton(onClick = go) { Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant) } }
        }
    }
}

/** A gently floating, turning gem in the brand gradient. */
@Composable
private fun Gem() {
    var float = 0f
    var tilt = 0f
    if (!app.talklive.ui.theme.LocalReduceMotion.current) {
        val t = rememberInfiniteTransition(label = "gem")
        float = t.animateFloat(-6f, 6f, infiniteRepeatable(tween(1800, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "float").value
        tilt = t.animateFloat(-6f, 6f, infiniteRepeatable(tween(2600, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "tilt").value
    }
    Box(
        Modifier.padding(top = (12 + float).dp).size(96.dp).rotate(tilt).clip(RoundedCornerShape(30.dp)).background(BrandGradient),
        contentAlignment = Alignment.Center,
    ) { Text("💎", fontSize = 46.sp) }
}

@Composable
private fun PlanCard(plan: PlusPlan, all: List<PlusPlan>, selected: Boolean, onClick: () -> Unit) {
    val border by animateColorAsState(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant, label = "plan")
    val days = PlayBilling.periodDays(plan.period)
    // "Save 40%" on the longer plan against the shortest one, when Play's prices allow it.
    val saving = all.firstOrNull()?.takeIf { it != plan }?.let { short ->
        val shortMicros = priceMicros(short.price) ?: return@let null
        val mine = priceMicros(plan.price) ?: return@let null
        val shortDays = PlayBilling.periodDays(short.period).takeIf { it > 0 } ?: return@let null
        val pct = (100 - mine * 100.0 / (shortMicros * days / shortDays)).toInt()
        pct.takeIf { it in 5..90 }
    }
    Box {
        Surface(
            onClick = onClick,
            shape = RoundedCornerShape(20.dp),
            border = BorderStroke(if (selected) 2.dp else 1.dp, border),
            color = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.10f) else MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth().padding(top = if (saving != null) 10.dp else 0.dp),
        ) {
            Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(22.dp).clip(CircleShape).background(if (selected) BrandGradient else Brush.linearGradient(listOf(MaterialTheme.colorScheme.outlineVariant, MaterialTheme.colorScheme.outlineVariant))),
                    contentAlignment = Alignment.Center,
                ) { if (selected) Box(Modifier.size(8.dp).clip(CircleShape).background(Color.White)) }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        stringResource(if (days >= 360) R.string.plus_yearly else R.string.plus_monthly),
                        style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface,
                    )
                    plan.trial?.let { Text(stringResource(R.string.plus_trial, PlayBilling.periodDays(it)), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary) }
                }
                Text(plan.price, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
            }
        }
        saving?.let {
            Text(
                stringResource(R.string.plus_save, it), color = Color.White, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold,
                modifier = Modifier.align(Alignment.TopEnd).padding(end = 16.dp).clip(CircleShape).background(BrandGradient).padding(horizontal = 10.dp, vertical = 4.dp),
            )
        }
    }
}

/** Digits of a formatted price ("$4.99", "₹ 399,00") as a comparable number. */
private fun priceMicros(formatted: String): Long? = formatted.filter { it.isDigit() }.toLongOrNull()

private fun openManage(context: Context) {
    runCatching {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(PlayBilling.MANAGE_URL + context.packageName)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}
