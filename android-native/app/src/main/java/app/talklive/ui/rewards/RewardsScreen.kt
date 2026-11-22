package app.talklive.ui.rewards

import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.CardGiftcard
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.talklive.R
import app.talklive.progress.Progress
import app.talklive.progress.ProgressRepository
import app.talklive.progress.ProgressResult
import app.talklive.ui.animals.SPECIAL_TIER
import app.talklive.ui.animals.SpecialFaceArt
import app.talklive.ui.animals.SpecialFaces
import app.talklive.ui.animals.specialUnlocked
import app.talklive.ui.components.BrandGradient
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.theme.LocalReduceMotion
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

@HiltViewModel
class RewardsViewModel @Inject constructor(private val repo: ProgressRepository) : ViewModel() {
    val progress = repo.progress
    val unlocks = repo.unlocks

    var busy by mutableStateOf(false); private set
    /** A short line after claiming (string resource), shown under the button. */
    var claimNote by mutableStateOf<Int?>(null); private set
    var redeemBusy by mutableStateOf(false); private set
    var redeemError by mutableStateOf<Int?>(null); private set
    var redeemDone by mutableStateOf(false); private set

    init { repo.refresh() }

    fun refresh() = repo.refresh()

    fun claim() {
        if (busy) return
        busy = true; claimNote = null
        viewModelScope.launch {
            claimNote = when (repo.claim()) {
                ProgressResult.Ok -> R.string.reward_claimed
                is ProgressResult.Wait -> R.string.reward_wait_note
                is ProgressResult.Failed -> R.string.reward_claim_error
            }
            busy = false
        }
    }

    fun clearRedeem() { redeemError = null }

    fun redeem(code: String) {
        if (redeemBusy || code.isBlank()) return
        redeemBusy = true; redeemError = null; redeemDone = false
        viewModelScope.launch {
            when (val r = repo.redeem(code)) {
                ProgressResult.Ok -> redeemDone = true
                is ProgressResult.Failed -> redeemError = when (r.reason) {
                    "not-verified" -> R.string.redeem_not_verified
                    "too-old" -> R.string.redeem_too_old
                    "own" -> R.string.redeem_own
                    "used" -> R.string.redeem_used
                    "invalid" -> R.string.redeem_invalid
                    "same-device" -> R.string.redeem_same_device
                    null -> R.string.redeem_no_connection
                    else -> R.string.redeem_invalid
                }
                is ProgressResult.Wait -> redeemError = R.string.redeem_no_connection
            }
            redeemBusy = false
        }
    }
}

/** The Rewards screen as a full-screen window, opened from My Profile and from Home's level chip. */
@Composable
fun RewardsDialog(onDismiss: () -> Unit) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) { RewardsScreen(onBack = onDismiss) }
}

@Composable
fun RewardsScreen(onBack: () -> Unit, vm: RewardsViewModel = hiltViewModel()) {
    BackHandler(onBack = onBack)
    val progress by vm.progress.collectAsStateWithLifecycle()
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Surface(color = MaterialTheme.colorScheme.surface) {
            Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 4.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, stringResource(R.string.back)) }
                Text(stringResource(R.string.rewards_title), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
            }
        }
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().navigationBarsPadding().padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            val p = progress
            if (p == null) {
                Text(stringResource(R.string.rewards_loading), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                LevelCard(p)
                SpecialRow(p)
                DailyCard(p, vm)
                InviteCard(p)
                RedeemCard(p, vm)
            }
        }
    }
}

// ---- Level and progress -----------------------------------------------------------------------

@Composable
internal fun tierName(tier: String?): String = stringResource(
    when (tier) { "silver" -> R.string.tier_silver; "gold" -> R.string.tier_gold; "diamond" -> R.string.tier_diamond; else -> R.string.tier_starter },
)

internal fun tierColor(tier: String?): Color = when (tier) {
    "silver" -> Color(0xFFCBD5E1)
    "gold" -> Color(0xFFFBBF24)
    "diamond" -> Color(0xFF67E8F9)
    else -> Color(0xFFA5B4FC)
}

@Composable
private fun LevelCard(p: Progress) {
    Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(BrandGradient).padding(20.dp)) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(52.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Rounded.Star, null, tint = tierColor(p.tier), modifier = Modifier.size(30.dp))
                }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.rewards_level, p.level), style = MaterialTheme.typography.headlineSmall, color = Color.White)
                    Text(
                        stringResource(R.string.rewards_points, p.points) + if (p.tier != "none") " · " + tierName(p.tier) else "",
                        style = MaterialTheme.typography.bodyLarge, color = Color.White.copy(alpha = 0.92f),
                    )
                }
            }
            Spacer(Modifier.height(18.dp))
            TierBar(p.points)
            Spacer(Modifier.height(10.dp))
            val next = p.nextTier
            val at = p.nextAt
            Text(
                if (next != null && at != null) stringResource(R.string.rewards_to_next, (at - p.points).coerceAtLeast(0), tierName(next))
                else stringResource(R.string.rewards_max),
                style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.92f),
            )
        }
    }
}

/** One bar from 0 to Diamond, with a marker where Silver and Gold begin. */
@Composable
private fun TierBar(points: Int) {
    val target = (points.toFloat() / Progress.DIAMOND_AT).coerceIn(0f, 1f)
    val shown by animateFloatAsState(target, tween(900, easing = FastOutSlowInEasing), label = "bar")
    Column {
        Box(Modifier.fillMaxWidth().height(14.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.25f))) {
            Box(Modifier.fillMaxSize(shown).clip(CircleShape).background(Brush.horizontalGradient(listOf(Color(0xFFFDE68A), Color(0xFFFFFFFF)))))
            for ((tier, at) in listOf("silver" to Progress.SILVER_AT, "gold" to Progress.GOLD_AT)) {
                Box(Modifier.fillMaxSize(at.toFloat() / Progress.DIAMOND_AT), contentAlignment = Alignment.CenterEnd) {
                    Box(Modifier.width(2.dp).fillMaxSize().background(Color.White.copy(alpha = 0.7f)))
                }
            }
        }
        Spacer(Modifier.height(6.dp))
        Row(Modifier.fillMaxWidth()) {
            // Labels sit under their markers: Silver 20%, Gold 50%, Diamond at the end.
            Text(stringResource(R.string.tier_silver) + " " + Progress.SILVER_AT, style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.9f), modifier = Modifier.weight(0.2f))
            Text(stringResource(R.string.tier_gold) + " " + Progress.GOLD_AT, style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.9f), modifier = Modifier.weight(0.3f), textAlign = TextAlign.End)
            Text(stringResource(R.string.tier_diamond) + " " + Progress.DIAMOND_AT, style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.9f), modifier = Modifier.weight(0.5f), textAlign = TextAlign.End)
        }
    }
}

@Composable
private fun SpecialRow(p: Progress) {
    Column {
        Text(stringResource(R.string.rewards_faces_title), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
        Text(stringResource(R.string.rewards_faces_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SpecialFaces.forEach { a ->
                val tier = SPECIAL_TIER[a.id] ?: "silver"
                val open = specialUnlocked(a.id, p.tier)
                Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.weight(1f)) {
                    Column(Modifier.padding(vertical = 12.dp, horizontal = 6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Box {
                            SpecialFaceArt(a.id, Modifier.size(64.dp).graphicsLayer { alpha = if (open) 1f else 0.4f }, animate = open)
                            if (!open) Icon(Icons.Rounded.Lock, null, tint = app.talklive.ui.theme.GoldText, modifier = Modifier.align(Alignment.Center).size(24.dp))
                        }
                        Spacer(Modifier.height(6.dp))
                        Text(a.name, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.Center, maxLines = 1)
                        Text(
                            if (open) stringResource(R.string.rewards_unlocked)
                            else stringResource(R.string.rewards_reach_at, tierName(tier), Progress.tierAt(tier)),
                            style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center, maxLines = 2,
                            color = if (open) app.talklive.ui.theme.AccentText else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

// ---- Daily reward ---------------------------------------------------------------------------------

@Composable
private fun DailyCard(p: Progress, vm: RewardsViewModel) {
    // Ticks once a second while the wait is on, so the button turns on by itself.
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(p.nextClaimAt, p.canClaim) {
        while (!p.canClaim && p.nextClaimAt > System.currentTimeMillis()) {
            now = System.currentTimeMillis()
            delay(1000)
        }
        now = System.currentTimeMillis()
    }
    val left = p.nextClaimAt - now
    val ready = p.canClaim || (p.nextClaimAt in 1..now)
    Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Text(stringResource(R.string.rewards_daily_title), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            Text(stringResource(R.string.rewards_daily_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(12.dp))
            PrimaryButton(
                text = if (ready) stringResource(R.string.rewards_claim) else stringResource(R.string.rewards_claim_wait, countdown(left)),
                onClick = vm::claim,
                enabled = ready && !vm.busy,
                loading = vm.busy,
            )
            vm.claimNote?.let {
                Text(stringResource(it), style = MaterialTheme.typography.bodyMedium, color = app.talklive.ui.theme.AccentText, modifier = Modifier.padding(top = 8.dp))
            }
        }
    }
}

private fun countdown(ms: Long): String {
    val s = (ms / 1000).coerceAtLeast(0)
    val h = s / 3600
    val m = (s % 3600) / 60
    val sec = s % 60
    return if (h > 0) "${h}h ${m.toString().padStart(2, '0')}m" else "${m}m ${sec.toString().padStart(2, '0')}s"
}

// ---- Invite code and redeeming ----------------------------------------------------------------------

@Composable
private fun InviteCard(p: Progress) {
    val context = LocalContext.current
    val clip = LocalClipboardManager.current
    var copied by remember { mutableStateOf(false) }
    LaunchedEffect(copied) { if (copied) { delay(1600); copied = false } }
    Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.CardGiftcard, null, tint = Color(0xFF22C55E))
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.rewards_invite_title), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            }
            Text(stringResource(R.string.rewards_invite_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
            Spacer(Modifier.height(12.dp))
            val code = p.code
            if (code == null) {
                Text(stringResource(R.string.rewards_invite_none), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                Box(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.background).padding(vertical = 14.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(code, style = MaterialTheme.typography.headlineSmall.copy(letterSpacing = 3.sp), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                }
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    androidx.compose.material3.OutlinedButton(
                        onClick = { clip.setText(AnnotatedString(code)); copied = true },
                        modifier = Modifier.weight(1f).height(48.dp), shape = CircleShape,
                    ) {
                        Icon(if (copied) Icons.Rounded.Check else Icons.Rounded.ContentCopy, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(stringResource(if (copied) R.string.copied else R.string.copy))
                    }
                    androidx.compose.material3.Button(
                        onClick = {
                            val text = context.getString(R.string.rewards_share_text, code, app.talklive.net.ServerConfig.url)
                            val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
                            runCatching { context.startActivity(Intent.createChooser(send, null).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
                        },
                        modifier = Modifier.weight(1f).height(48.dp), shape = CircleShape,
                    ) {
                        Icon(Icons.Rounded.Share, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(stringResource(R.string.rewards_share))
                    }
                }
            }
            Spacer(Modifier.height(10.dp))
            Text(stringResource(R.string.rewards_invites_counted, p.invitesCounted), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun RedeemCard(p: Progress, vm: RewardsViewModel) {
    var code by rememberSaveable { mutableStateOf("") }
    val used = p.redeemed || vm.redeemDone
    Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Text(stringResource(R.string.rewards_redeem_title), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            Text(stringResource(R.string.rewards_redeem_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
            Spacer(Modifier.height(12.dp))
            if (used) {
                Text(
                    stringResource(if (vm.redeemDone) R.string.rewards_redeem_ok else R.string.rewards_redeem_already),
                    style = MaterialTheme.typography.bodyLarge, color = app.talklive.ui.theme.AccentText,
                )
            } else {
                OutlinedTextField(
                    value = code,
                    onValueChange = { code = it.uppercase().filter { c -> c.isLetterOrDigit() || c == '-' }.take(24); vm.clearRedeem() },
                    label = { Text(stringResource(R.string.rewards_redeem_hint)) },
                    singleLine = true, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth(),
                    isError = vm.redeemError != null,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done, autoCorrectEnabled = false),
                    keyboardActions = KeyboardActions(onDone = { vm.redeem(code) }),
                )
                vm.redeemError?.let {
                    Text(stringResource(it), style = MaterialTheme.typography.bodyMedium, color = app.talklive.ui.theme.DangerText, modifier = Modifier.padding(top = 6.dp))
                }
                Spacer(Modifier.height(12.dp))
                PrimaryButton(stringResource(R.string.rewards_redeem), onClick = { vm.redeem(code) }, enabled = code.isNotBlank() && !vm.redeemBusy, loading = vm.redeemBusy)
            }
        }
    }
}

// ---- Level chip and the unlock celebration ---------------------------------------------------------------

/** Home's small level chip: tier-coloured star and the level; null progress (older server) shows nothing. */
@Composable
fun LevelChip(progress: Progress?, onClick: () -> Unit) {
    val p = progress ?: return
    Surface(onClick = onClick, shape = CircleShape, color = MaterialTheme.colorScheme.surface) {
        Row(Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Star, null, tint = tierColor(p.tier), modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(3.dp))
            Text(stringResource(R.string.level_chip, p.level), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

/**
 * Listens for newly reached tiers anywhere in the app and plays a short celebration:
 * the new avatar springs in over a burst of confetti. Place it once, in the main screen.
 */
@Composable
fun UnlockCelebrationHost(vm: RewardsViewModel = hiltViewModel()) {
    var tier by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { vm.unlocks.collect { tier = it } }
    tier?.let { t -> UnlockCelebration(t) { tier = null } }
}

@Composable
private fun UnlockCelebration(tier: String, onDone: () -> Unit) {
    val reduce = LocalReduceMotion.current
    val burst = remember { Animatable(0f) }
    val pop = remember { Animatable(0f) }
    LaunchedEffect(tier) {
        kotlinx.coroutines.coroutineScope {
            launch { pop.animateTo(1f, spring(dampingRatio = 0.45f, stiffness = 260f)) }
            launch { burst.animateTo(1f, tween(if (reduce) 1 else 2400, easing = LinearEasing)) }
        }
        delay(1600)
        onDone()
    }
    val face = SpecialFaces.firstOrNull { SPECIAL_TIER[it.id] == tier }
    Dialog(onDismissRequest = onDone, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Box(Modifier.fillMaxSize().background(Color(0xCC050816)).clip(RoundedCornerShape(0.dp)), contentAlignment = Alignment.Center) {
            val color = tierColor(tier)
            Canvas(Modifier.fillMaxSize()) {
                val t = burst.value
                if (t <= 0f || t >= 1f || reduce) return@Canvas
                val c = Offset(size.width / 2, size.height * 0.42f)
                for (i in 0 until 48) {
                    val ang = (2 * PI * i / 48 + i * 0.37).toFloat()
                    val speed = 0.35f + 0.65f * ((i * 7) % 10) / 10f
                    val d = size.minDimension * 0.62f * speed * (1f - (1f - t) * (1f - t))
                    val x = c.x + d * cos(ang)
                    val y = c.y + d * sin(ang) + size.minDimension * 0.25f * t * t
                    val col = if (i % 3 == 0) color else if (i % 3 == 1) Color.White else Color(0xFFFDE68A)
                    drawCircle(col.copy(alpha = (1f - t).coerceIn(0f, 1f)), size.minDimension * (0.006f + 0.006f * (i % 4)), Offset(x, y))
                }
                drawCircle(color.copy(alpha = 0.35f * (1f - t)), size.minDimension * 0.5f * t, c, style = androidx.compose.ui.graphics.drawscope.Stroke(size.minDimension * 0.01f))
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                if (face != null) Box(Modifier.size(150.dp).scale(0.3f + 0.7f * pop.value).border(3.dp, color, CircleShape).clip(CircleShape)) {
                    SpecialFaceArt(face.id, Modifier.fillMaxSize())
                }
                Spacer(Modifier.height(22.dp))
                Text(stringResource(R.string.rewards_unlocked_title, tierName(tier)), style = MaterialTheme.typography.headlineMedium, color = Color.White, textAlign = TextAlign.Center)
                if (face != null) Text(stringResource(R.string.rewards_unlocked_body, face.name), style = MaterialTheme.typography.bodyLarge, color = Color.White.copy(alpha = 0.85f), textAlign = TextAlign.Center, modifier = Modifier.padding(top = 6.dp))
                Spacer(Modifier.height(18.dp))
                TextButton(onClick = onDone) { Text(stringResource(R.string.got_it), color = color) }
            }
        }
    }
}
