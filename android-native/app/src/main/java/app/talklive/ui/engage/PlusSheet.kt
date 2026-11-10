package app.talklive.ui.engage

import androidx.compose.foundation.clickable

import androidx.compose.ui.graphics.SolidColor
import androidx.compose.foundation.border
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.draw.drawBehind
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.LocalFireDepartment
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
import androidx.compose.ui.res.pluralStringResource
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
import app.talklive.ui.components.tapOnce
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.theme.LocalAccents
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

/** What the person was doing when Plus opened, so the page can speak to it. */
enum class PlusReason { GenderFilter, Countries, Interests, LikedYou, StreakRestore, Avatar, Theme, History, Priority, Generic }

/** A [reason], and the number its headline uses when it has one (people who liked you, days of a lost streak). */
data class PlusWhy(val reason: PlusReason = PlusReason.Generic, val count: Int = 0)

@HiltViewModel
class PlusViewModel @Inject constructor(
    val billing: PlayBilling,
    identity: app.talklive.data.IdentityStore,
    auth: app.talklive.auth.AuthRepository,
) : ViewModel() {
    /** For the "you with Plus" preview. */
    val animal = identity.animalFlow
    val account = auth.account
}

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
    passFirst: Boolean = false,
    why: PlusWhy = PlusWhy(),
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
        val myAnimal by vm.animal.collectAsStateWithLifecycle()
        val myAccount by vm.account.collectAsStateWithLifecycle()
        PlusContent(
            premium, signedIn, state, busy,
            myAnimal = myAnimal, myName = myAccount?.nickname,
            onSignIn = onSignIn,
            onBuy = { plan -> context.findActivity()?.let { vm.billing.buy(it, plan) } },
            onBuyPass = { pass -> context.findActivity()?.let { vm.billing.buyPass(it, pass) } },
            onRestore = { vm.billing.restore() },
            onManage = { openManage(context) },
            onClose = onDismiss,
            onInvite = onInvite,
            onFreeOption = onFreeOption,
            passFirst = passFirst,
            why = why,
        )
    }
}

private data class Perk(val icon: ImageVector, val title: Int, val body: Int)

private val PERKS = listOf(
    Perk(Icons.Rounded.FilterAlt, R.string.plus_perk_gender, R.string.plus_perk_gender_body),
    Perk(Icons.Rounded.Favorite, R.string.plus_perk_likes, R.string.plus_perk_likes_body),
    Perk(Icons.Rounded.Undo, R.string.plus_perk_undo, R.string.plus_perk_undo_body),
    Perk(Icons.Rounded.Bolt, R.string.plus_perk_queue, R.string.plus_perk_queue_body),
    Perk(Icons.Rounded.LocalFireDepartment, R.string.plus_perk_streak, R.string.plus_perk_streak_body),
    Perk(Icons.Rounded.Palette, R.string.plus_perk_themes, R.string.plus_perk_themes_body),
    Perk(Icons.Rounded.Verified, R.string.plus_perk_badge, R.string.plus_perk_badge_body),
)

private val Gold1 = Color(0xFFFFE29A)
private val Gold2 = Color(0xFFF2C14E)
private val Gold3 = Color(0xFFC8912E)
private val GoldBrush = Brush.linearGradient(listOf(Gold1, Gold2, Gold3))
private val PlusBg = Color(0xFF07090F)

/** The page itself, without Play, so it can be rendered in tests. */
@Composable
fun PlusContent(
    premium: Premium, signedIn: Boolean, state: BillingState, busy: Boolean,
    myAnimal: String? = null, myName: String? = null,
    onSignIn: () -> Unit, onBuy: (PlusPlan) -> Unit, onRestore: () -> Unit, onManage: () -> Unit,
    onClose: () -> Unit = {}, onInvite: (() -> Unit)? = null, onFreeOption: Pair<String, () -> Unit>? = null,
    onBuyPass: (app.talklive.billing.PlusPass) -> Unit = {},
    // Opened from a limit someone just hit: the 1-day pass comes first and is
    // picked, since a small try is the easiest yes.
    passFirst: Boolean = false,
    why: PlusWhy = PlusWhy(),
) {
    val accents = LocalAccents.current
    val still = app.talklive.ui.theme.LocalReduceMotion.current
    // One choice at a time: a subscription plan, or a one-time pass.
    var picked by remember(state) { mutableStateOf((state as? BillingState.Ready)?.plans?.lastOrNull()) }
    var pickedPass by remember(state) {
        val ready = state as? BillingState.Ready
        mutableStateOf<app.talklive.billing.PlusPass?>(when {
            passFirst -> ready?.passes?.firstOrNull()
            ready?.plans.isNullOrEmpty() -> ready?.passes?.getOrNull(1)
            else -> null
        })
    }
    Box(Modifier.fillMaxSize().background(PlusBg)) {
        // Aurora: gold and violet light drifting behind everything.
        val drift = if (still) 0.4f else rememberInfiniteTransition(label = "aurora").animateFloat(0f, 1f, infiniteRepeatable(tween(7000, easing = LinearEasing), RepeatMode.Reverse), label = "d").value
        Box(
            Modifier.fillMaxWidth().height(520.dp).drawBehind {
                val w = size.width; val h = size.height
                val c1 = Offset(w * (0.2f + 0.5f * drift), h * 0.15f)
                val c2 = Offset(w * (0.9f - 0.4f * drift), h * 0.35f)
                drawCircle(Brush.radialGradient(listOf(Gold2.copy(alpha = 0.26f), Color.Transparent), center = c1, radius = w * 0.8f), radius = w * 0.8f, center = c1)
                drawCircle(Brush.radialGradient(listOf(accents.a.copy(alpha = 0.34f), Color.Transparent), center = c2, radius = w * 0.75f), radius = w * 0.75f, center = c2)
            },
        )
        Column(
            Modifier.fillMaxSize().statusBarsPadding().verticalScroll(rememberScrollState()).padding(bottom = 190.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), horizontalArrangement = Arrangement.End) {
                IconButton(onClick = onClose) { Icon(Icons.Rounded.Close, stringResource(R.string.cancel), tint = Color.White.copy(alpha = 0.8f)) }
            }
            // One headline and one line for what the person was just doing; nothing for the general page.
            if (!premium.active) WhyHeader(why)
            Gem()
            Spacer(Modifier.height(18.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("TalkLive", style = MaterialTheme.typography.displaySmall, color = Color.White)
                Spacer(Modifier.width(10.dp))
                Text("PLUS", style = MaterialTheme.typography.displaySmall.copy(brush = GoldBrush), fontWeight = FontWeight.Black)
            }
            Spacer(Modifier.height(8.dp))
            Text(
                stringResource(if (premium.active) R.string.plus_hero_active else R.string.plus_hero),
                style = MaterialTheme.typography.bodyLarge, color = Color.White.copy(alpha = 0.72f), textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 28.dp),
            )
            Spacer(Modifier.height(24.dp))
            // Your own profile, before and after.
            if (!premium.active) {
                YouWithPlus(myAnimal, myName)
                Spacer(Modifier.height(20.dp))
            }
            FeatureCarousel()
            Spacer(Modifier.height(24.dp))
            CompareTable(Modifier.padding(horizontal = 20.dp))
            Spacer(Modifier.height(24.dp))
            Column(Modifier.padding(horizontal = 20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                when {
                    premium.active -> Text(
                        if (premium.expiresAt != null) stringResource(R.string.plus_until, java.text.DateFormat.getDateInstance().format(java.util.Date(premium.expiresAt)))
                        else stringResource(R.string.plus_active),
                        style = MaterialTheme.typography.titleMedium.copy(brush = GoldBrush),
                    )
                    !signedIn -> Text(stringResource(R.string.plus_sign_in), style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.7f), textAlign = TextAlign.Center)
                    state is BillingState.Loading -> CircularProgressIndicator(Modifier.size(28.dp), color = Gold2)
                    // Google Play has nothing to sell on this phone yet (not installed from
                    // Play, or the products are not live): show the prices anyway, so
                    // people know what Plus and the passes cost.
                    state is BillingState.Unavailable -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        // Same choices as when Play can sell (-2 = yearly, -1 = monthly, 0..2 = passes),
                        // so everything here can be picked; buying waits for Google Play.
                        var shownPick by remember { mutableStateOf(if (passFirst) 0 else -2) }
                        val ctx = androidx.compose.ui.platform.LocalContext.current
                        val (yearAmount, yearCur) = app.talklive.billing.LocalPrice.yearly(ctx)
                        val save = app.talklive.billing.LocalPrice.yearlySavePercent(ctx)
                        listOf(-2, -1).forEach { which ->
                            val yearlyCard = which == -2
                            val on = shownPick == which
                            val planBorder by animateColorAsState(if (on) Gold2 else Color.White.copy(alpha = 0.16f), label = "month")
                            Box {
                                Surface(
                                    onClick = { app.talklive.sound.Tap.pop(); shownPick = which },
                                    shape = RoundedCornerShape(20.dp),
                                    color = if (on) Gold2.copy(alpha = 0.10f) else Color.White.copy(alpha = 0.05f),
                                    border = BorderStroke(if (on) 2.dp else 1.dp, planBorder),
                                    modifier = Modifier.fillMaxWidth().padding(top = if (yearlyCard) 10.dp else 0.dp),
                                ) {
                                    Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            Modifier.size(22.dp).clip(CircleShape)
                                                .background(if (on) GoldBrush else SolidColor(Color.Transparent))
                                                .border(2.dp, if (on) Color.Transparent else Color.White.copy(alpha = 0.45f), CircleShape),
                                            contentAlignment = Alignment.Center,
                                        ) { if (on) Box(Modifier.size(8.dp).clip(CircleShape).background(Color.White)) }
                                        Spacer(Modifier.width(14.dp))
                                        Column(Modifier.weight(1f)) {
                                            Text("TalkLive Plus", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color.White)
                                            Text(stringResource(if (yearlyCard) R.string.plus_yearly else R.string.plus_monthly), style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.72f))
                                            if (yearlyCard) Text(stringResource(R.string.plus_year_per_month, app.talklive.billing.LocalPrice.perMonth(yearAmount, yearCur)), style = MaterialTheme.typography.labelMedium, color = Gold1)
                                        }
                                        Text(
                                            stringResource(if (yearlyCard) R.string.plus_price_year else R.string.plus_price_month, if (yearlyCard) app.talklive.billing.LocalPrice.yearlyLabel(ctx) else app.talklive.billing.LocalPrice.of(ctx, 10.0)),
                                            style = MaterialTheme.typography.titleMedium.copy(brush = GoldBrush), fontWeight = FontWeight.Black,
                                        )
                                    }
                                }
                                if (yearlyCard) SaveChip(save, Modifier.align(Alignment.TopEnd).padding(end = 16.dp))
                            }
                        }
                        Text(stringResource(R.string.pass_heading), style = MaterialTheme.typography.titleSmall, color = Color.White.copy(alpha = 0.8f), modifier = Modifier.fillMaxWidth().padding(top = 10.dp), textAlign = TextAlign.Center)
                        Text(stringResource(R.string.pass_sub), style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.72f), modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                            listOf(
                                app.talklive.billing.LocalPrice.pass(ctx, "pass_1d", 1, 2.0),
                                app.talklive.billing.LocalPrice.pass(ctx, "pass_7d", 7, 5.0),
                                app.talklive.billing.LocalPrice.pass(ctx, "pass_15d", 15, 7.0),
                            ).forEachIndexed { i, pass ->
                                PassCard(pass, badge = when (i) { 1 -> stringResource(R.string.pass_popular); 2 -> stringResource(R.string.pass_best); else -> null }, selected = shownPick == i) { shownPick = i }
                            }
                        }
                        // The same figure as when Play can sell, from the local price table.
                        val (monthAmount, monthCur) = app.talklive.billing.LocalPrice.amount(ctx, 10.0)
                        when (shownPick) {
                            -2 -> PerDayLine((yearAmount * 1_000_000).toLong(), yearCur, app.talklive.billing.LocalPrice.planDays(360))
                            -1 -> PerDayLine((monthAmount * 1_000_000).toLong(), monthCur, app.talklive.billing.LocalPrice.planDays(30))
                            else -> listOf(1 to 2.0, 7 to 5.0, 15 to 7.0).getOrNull(shownPick)?.let { (days, usd) ->
                                app.talklive.billing.LocalPrice.amount(ctx, usd).let { (a, c) -> PerDayLine((a * 1_000_000).toLong(), c, days) }
                            }
                        }
                        Surface(shape = RoundedCornerShape(18.dp), color = Color.White.copy(alpha = 0.06f)) {
                            Text(stringResource(R.string.plus_unavailable), style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.75f), textAlign = TextAlign.Center, modifier = Modifier.padding(16.dp))
                        }
                    }
                    state is BillingState.Ready -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (!passFirst) state.plans.asReversed().forEach { plan -> PlanCard(plan, state.plans, plan == picked && pickedPass == null) { picked = plan; pickedPass = null } }
                        if (state.passes.isNotEmpty()) {
                            Text(
                                stringResource(R.string.pass_heading), style = MaterialTheme.typography.titleSmall, color = Color.White.copy(alpha = 0.8f),
                                modifier = Modifier.fillMaxWidth().padding(top = 10.dp), textAlign = TextAlign.Center,
                            )
                            Text(
                                stringResource(R.string.pass_sub), style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.72f),
                                modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center,
                            )
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                                state.passes.forEachIndexed { i, pass ->
                                    PassCard(pass, badge = when (i) { 1 -> stringResource(R.string.pass_popular); 2 -> stringResource(R.string.pass_best); else -> null },
                                        selected = pass == pickedPass) { pickedPass = pass }
                                }
                            }
                        }
                        if (passFirst) state.plans.asReversed().forEach { plan -> PlanCard(plan, state.plans, plan == picked && pickedPass == null) { picked = plan; pickedPass = null } }
                    }
                }
                if (onInvite != null && !premium.active) {
                    Spacer(Modifier.height(16.dp))
                    Surface(onClick = onInvite, shape = RoundedCornerShape(18.dp), color = Color.White.copy(alpha = 0.06f), modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            app.talklive.ui.components.GiftIcon(28.dp)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(stringResource(R.string.plus_earn_title), style = MaterialTheme.typography.titleMedium, color = Color.White)
                                Text(stringResource(R.string.plus_earn_body), style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.7f))
                            }
                        }
                    }
                }
                if (signedIn && !premium.active) TextButton(onClick = onRestore, modifier = Modifier.padding(top = 8.dp)) { Text(stringResource(R.string.plus_restore), color = Gold1) }
            }
        }

        // The action, pinned. Hidden when nothing can be bought on this phone.
        val canBuy = signedIn && !premium.active && state is BillingState.Ready
        if (premium.active || !signedIn || canBuy || onFreeOption != null) Column(
            Modifier.align(Alignment.BottomCenter).fillMaxWidth()
                .background(Brush.verticalGradient(listOf(Color.Transparent, PlusBg, PlusBg)))
                .navigationBarsPadding().padding(horizontal = 20.dp).padding(top = 30.dp, bottom = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            when {
                premium.active -> GoldButton(stringResource(if (premium.play) R.string.plus_manage else R.string.ok), busy = false, onClick = if (premium.play) onManage else onClose)
                !signedIn -> GoldButton(stringResource(R.string.sign_in_or_create), busy = false, onClick = onSignIn)
                canBuy && pickedPass != null -> {
                    val pass = pickedPass!!
                    GoldButton(stringResource(R.string.pass_buy, pass.days, pass.price), busy = busy, onClick = { onBuyPass(pass) })
                    Text(stringResource(R.string.pass_once), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = Color.White, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 10.dp))
                    PerDayLine(pass.priceMicros, pass.currency, pass.days)
                }
                canBuy -> {
                    val plan = picked
                    GoldButton(
                        when { plan == null -> stringResource(R.string.plus_subscribe); plan.trial != null -> stringResource(R.string.plus_start_trial); else -> stringResource(R.string.plus_subscribe_price, plan.price) },
                        busy = busy, onClick = { plan?.let(onBuy) },
                    )
                    // What it costs and when, right by the button (Google Play requires
                    // it for trials, and people decide faster when it is plain).
                    plan?.let { pl ->
                        val yearly = PlayBilling.periodDays(pl.period) >= 360
                        val line = when {
                            pl.trial != null -> stringResource(if (yearly) R.string.plus_trial_then_year else R.string.plus_trial_then_month, PlayBilling.periodDays(pl.trial), pl.price)
                            else -> stringResource(if (yearly) R.string.plus_price_year else R.string.plus_price_month, pl.price)
                        }
                        Text(line, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = Color.White, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 10.dp))
                        PerDayLine(pl.priceMicros, pl.currency, app.talklive.billing.LocalPrice.planDays(PlayBilling.periodDays(pl.period)))
                    }
                    Text(stringResource(R.string.plus_terms), style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.72f), textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp))
                }
            }
            onFreeOption?.let { (label, go) -> TextButton(onClick = go) { Text(label, color = Color.White.copy(alpha = 0.7f)) } }
        }
    }
}

/** Gold, with a slow shine passing across it. */
@Composable
internal fun GoldButton(text: String, busy: Boolean, onClick: () -> Unit) {
    val still = app.talklive.ui.theme.LocalReduceMotion.current
    val shine = if (still) -9f else rememberInfiniteTransition(label = "shine").animateFloat(-0.4f, 1.4f, infiniteRepeatable(tween(2600, easing = LinearEasing)), label = "x").value
    Box(
        Modifier.fillMaxWidth().height(58.dp).tapOnce(enabled = !busy) { app.talklive.sound.Tap.pop(); onClick() }.clip(CircleShape).background(GoldBrush)
            .drawBehind {
                if (shine > -1f) drawRect(Brush.linearGradient(listOf(Color.Transparent, Color.White.copy(alpha = 0.45f), Color.Transparent), start = Offset(size.width * shine - 80f, 0f), end = Offset(size.width * shine + 80f, size.height)))
            },
        contentAlignment = Alignment.Center,
    ) {
        if (busy) CircularProgressIndicator(Modifier.size(24.dp), color = Color(0xFF3A2A06), strokeWidth = 2.5.dp)
        else Text(text, color = Color(0xFF2B1D00), style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.ExtraBold)
    }
}

/** Big swipeable cards, each with a small live preview of what Plus does. */
/**
 * How your own profile looks with Plus: your avatar today next to the same
 * avatar with the turning gold ring and the Plus badge, live.
 */
@Composable
private fun YouWithPlus(animal: String?, name: String?) {
    val shown = name?.takeIf { it.isNotBlank() } ?: stringResource(R.string.you)
    Surface(
        shape = RoundedCornerShape(28.dp),
        color = Color.White.copy(alpha = 0.06f),
        border = BorderStroke(1.dp, Brush.linearGradient(listOf(Gold1.copy(alpha = 0.7f), Color.White.copy(alpha = 0.05f)))),
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
    ) {
        Column(Modifier.padding(vertical = 18.dp, horizontal = 16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(stringResource(R.string.plus_you_title), style = MaterialTheme.typography.titleMedium, color = Color.White)
            Spacer(Modifier.height(14.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceEvenly, modifier = Modifier.fillMaxWidth()) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(Modifier.size(84.dp), contentAlignment = Alignment.Center) { app.talklive.ui.animals.AnimalAvatar(animal, name, 64.dp) }
                    Spacer(Modifier.height(6.dp))
                    Text(shown, style = MaterialTheme.typography.labelLarge, color = Color.White.copy(alpha = 0.75f), maxLines = 1)
                    Text(stringResource(R.string.cmp_free), style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.72f))
                }
                Icon(Icons.AutoMirrored.Rounded.ArrowForward, null, tint = Gold1, modifier = Modifier.size(26.dp))
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    app.talklive.ui.components.PlusRing(true, 64.dp) { app.talklive.ui.animals.AnimalAvatar(animal, name, 64.dp) }
                    Spacer(Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(shown, style = MaterialTheme.typography.labelLarge, color = Gold1, maxLines = 1, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.width(4.dp)); app.talklive.ui.components.PlusGem(14.dp)
                    }
                    Text("PLUS", style = MaterialTheme.typography.labelMedium, color = Gold1, fontWeight = FontWeight.ExtraBold)
                }
            }
            Spacer(Modifier.height(10.dp))
            Text(
                stringResource(R.string.plus_you_body), style = MaterialTheme.typography.bodySmall,
                color = Color.White.copy(alpha = 0.7f), textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun FeatureCarousel() {
    val pager = androidx.compose.foundation.pager.rememberPagerState { PERKS.size }
    val still = app.talklive.ui.theme.LocalReduceMotion.current
    LaunchedEffect(pager, still) {
        if (still) return@LaunchedEffect
        while (true) { kotlinx.coroutines.delay(3800); pager.animateScrollToPage((pager.currentPage + 1) % PERKS.size) }
    }
    androidx.compose.foundation.pager.HorizontalPager(state = pager, contentPadding = PaddingValues(horizontal = 20.dp), pageSpacing = 24.dp) { page ->
        val p = PERKS[page]
        Surface(
            shape = RoundedCornerShape(28.dp),
            color = Color.White.copy(alpha = 0.06f),
            border = BorderStroke(1.dp, Brush.linearGradient(listOf(Gold1.copy(alpha = 0.6f), Color.White.copy(alpha = 0.05f)))),
            modifier = Modifier.fillMaxWidth().height(250.dp),
        ) {
            Column(Modifier.padding(20.dp)) {
                Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) { PerkPreview(page) }
                Spacer(Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(30.dp).clip(RoundedCornerShape(10.dp)).background(GoldBrush), contentAlignment = Alignment.Center) {
                        Icon(p.icon, null, tint = Color(0xFF2B1D00), modifier = Modifier.size(18.dp))
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(stringResource(p.title), style = MaterialTheme.typography.titleMedium, color = Color.White)
                }
                Text(stringResource(p.body), style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.7f), modifier = Modifier.padding(top = 4.dp), maxLines = 2)
            }
        }
    }
    Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        repeat(PERKS.size) { i ->
            val on = pager.currentPage == i
            val w by androidx.compose.animation.core.animateDpAsState(if (on) 20.dp else 6.dp, label = "dot")
            Box(Modifier.width(w).height(6.dp).clip(CircleShape).background(if (on) GoldBrush else SolidColor(Color.White.copy(alpha = 0.25f))))
        }
    }
}

/** A tiny mock of each perk, drawn with the app's own pieces. */
@Composable
private fun PerkPreview(page: Int) {
    @Composable fun chip(t: String, on: Boolean) = Text(
        t, color = if (on) Color(0xFF2B1D00) else Color.White, style = MaterialTheme.typography.labelLarge,
        modifier = Modifier.clip(CircleShape).background(if (on) GoldBrush else SolidColor(Color.White.copy(alpha = 0.1f))).padding(horizontal = 12.dp, vertical = 7.dp),
    )
    when (page) {
        0 -> Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { chip(stringResource(R.string.anyone), false); chip(stringResource(R.string.women), true); chip(stringResource(R.string.men), false) }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { chip("🇯🇵", true); chip("🇧🇷", true); chip("🇰🇷", true); chip("+12", false) }
        }
        1 -> Row(verticalAlignment = Alignment.CenterVertically) {
            listOf("fox", "panda", "owl", "cat").forEachIndexed { i, a ->
                Box(Modifier.offset(x = (-14 * i).dp).clip(CircleShape).background(PlusBg).padding(3.dp)) { app.talklive.ui.animals.AnimalAvatar(a, null, 54.dp) }
            }
            Text("❤️", fontSize = 30.sp, modifier = Modifier.offset(x = (-30).dp))
        }
        2 -> Surface(shape = RoundedCornerShape(14.dp), color = Color(0xFF1B2133)) {
            Row(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.skipped_name, "Kenji"), color = Color.White, style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.width(18.dp))
                Text(stringResource(R.string.undo).uppercase(), style = MaterialTheme.typography.labelLarge.copy(brush = GoldBrush), fontWeight = FontWeight.Bold)
            }
        }
        3 -> Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.size(54.dp).clip(CircleShape).background(GoldBrush), contentAlignment = Alignment.Center) { app.talklive.ui.components.SymbolIcon("⚡", 28.dp, tint = Color.White) }
            repeat(4) { Box(Modifier.size((40 - it * 6).dp).clip(CircleShape).background(Color.White.copy(alpha = 0.12f - it * 0.02f))) }
        }
        4 -> Row(verticalAlignment = Alignment.CenterVertically) {
            app.talklive.ui.components.StreakFlame(36.dp, lit = false, broken = true)
            Text("  →  ", style = MaterialTheme.typography.titleLarge, color = Color.White.copy(alpha = 0.72f))
            app.talklive.ui.components.StreakFlame(42.dp)
            Text(" 12", style = MaterialTheme.typography.headlineMedium.copy(brush = GoldBrush), fontWeight = FontWeight.Black)
        }
        // Ocean and Sunset: the two Plus themes, as little screens.
        5 -> Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            listOf(
                Triple(Color(0xFF03151F), Color(0xFF06B6D4), Color(0xFF3B82F6)),
                Triple(Color(0xFF1A0B14), Color(0xFFF97316), Color(0xFFEC4899)),
            ).forEach { (bg, a, b) ->
                Box(Modifier.size(width = 64.dp, height = 104.dp).clip(RoundedCornerShape(14.dp)).background(bg), contentAlignment = Alignment.Center) {
                    Box(Modifier.size(30.dp).clip(CircleShape).background(Brush.linearGradient(listOf(a, b))))
                }
            }
        }
        else -> Row(verticalAlignment = Alignment.CenterVertically) {
            app.talklive.ui.animals.AnimalAvatar("lion", null, 56.dp)
            Spacer(Modifier.width(12.dp))
            Text("Sam", style = MaterialTheme.typography.headlineSmall, color = Color.White)
            Spacer(Modifier.width(6.dp))
            app.talklive.ui.components.PlusGem(28.dp)
        }
    }
}

/** "That is $0.33 a day", from the real price in micro-units of [currency] spread over [days]. */
@Composable
private fun PerDayLine(priceMicros: Long, currency: String, days: Int) {
    if (priceMicros <= 0 || currency.isBlank() || days <= 0) return
    Text(
        stringResource(R.string.plus_per_day, app.talklive.billing.LocalPrice.perDay(priceMicros / 1_000_000.0, days, currency)),
        style = MaterialTheme.typography.bodyMedium, color = Gold1, textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
    )
}

/** The headline and line for why Plus was opened. */
@Composable
private fun WhyHeader(why: PlusWhy) {
    val (title, body) = when (why.reason) {
        PlusReason.Generic -> return
        PlusReason.GenderFilter -> stringResource(R.string.plus_why_gender) to stringResource(R.string.plus_why_gender_body)
        PlusReason.Countries -> stringResource(R.string.plus_why_countries) to stringResource(R.string.plus_why_countries_body)
        PlusReason.Interests -> stringResource(R.string.plus_why_interests) to stringResource(R.string.plus_why_interests_body)
        PlusReason.LikedYou ->
            (if (why.count > 0) pluralStringResource(R.plurals.plus_why_likes, why.count, why.count) else stringResource(R.string.plus_why_likes_none)) to stringResource(R.string.plus_why_likes_body)
        PlusReason.StreakRestore ->
            (if (why.count > 0) stringResource(R.string.plus_why_streak, why.count) else stringResource(R.string.plus_why_streak_none)) to stringResource(R.string.plus_why_streak_body)
        PlusReason.Avatar -> stringResource(R.string.plus_why_avatar) to stringResource(R.string.plus_why_avatar_body)
        PlusReason.Theme -> stringResource(R.string.plus_why_theme) to stringResource(R.string.plus_why_theme_body)
        PlusReason.History -> stringResource(R.string.plus_why_history) to stringResource(R.string.plus_why_history_body)
        PlusReason.Priority -> stringResource(R.string.plus_why_priority) to stringResource(R.string.plus_why_priority_body)
    }
    Column(Modifier.fillMaxWidth().padding(horizontal = 28.dp, vertical = 4.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color.White, textAlign = TextAlign.Center)
        Spacer(Modifier.height(6.dp))
        Text(body, style = MaterialTheme.typography.bodyLarge, color = Color.White.copy(alpha = 0.8f), textAlign = TextAlign.Center)
        Spacer(Modifier.height(16.dp))
    }
}

/** Free vs Plus, row by row. */
@Composable
private fun CompareTable(modifier: Modifier = Modifier) {
    // What each side gets: a tick, a dash, or how many.
    val yes = "✓"; val no = "—"
    val rows = listOf(
        Triple(R.string.cmp_calls, yes, yes),
        // Numbers are the product's own limits: server FREE_LIMITS (2 countries, 2 interests, Plus 50 and 10),
        // FREE_HISTORY 3, PLUS_FREEZES 2, PLUS_FACES 8, AppTheme (Dark and Light free, Ocean and Sunset Plus).
        Triple(R.string.cmp_countries_n, "2", "50"),
        Triple(R.string.cmp_interests_n, "2", "10"),
        Triple(R.string.cmp_gender_n, no, yes),
        Triple(R.string.plus_perk_likes, no, yes),
        Triple(R.string.cmp_history, "3", "∞"),
        Triple(R.string.cmp_freezes_n, "0", "2"),
        Triple(R.string.cmp_faces_n, "0", "8"),
        Triple(R.string.cmp_themes_n, "2", "4"),
        Triple(R.string.plus_perk_undo, no, yes),
        Triple(R.string.plus_perk_queue, no, yes),
        Triple(R.string.cmp_alive, no, yes),
        Triple(R.string.cmp_gold, no, yes),
        Triple(R.string.cmp_streaks, yes, yes),
    )
    Surface(shape = RoundedCornerShape(24.dp), color = Color.White.copy(alpha = 0.05f), modifier = modifier.fillMaxWidth()) {
        Column(Modifier.padding(vertical = 8.dp)) {
            Row(Modifier.padding(horizontal = 18.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Spacer(Modifier.weight(1f))
                Text(stringResource(R.string.cmp_free), color = Color.White.copy(alpha = 0.72f), style = MaterialTheme.typography.labelLarge, modifier = Modifier.width(56.dp), textAlign = TextAlign.Center)
                Text("PLUS", style = MaterialTheme.typography.labelLarge.copy(brush = GoldBrush), fontWeight = FontWeight.Black, modifier = Modifier.width(56.dp), textAlign = TextAlign.Center)
            }
            rows.forEachIndexed { i, (label, free, plus) ->
                if (i > 0) Box(Modifier.padding(horizontal = 18.dp).fillMaxWidth().height(1.dp).background(Color.White.copy(alpha = 0.05f)))
                Row(Modifier.padding(horizontal = 18.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(label), color = Color.White, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                    Text(free, color = Color.White.copy(alpha = if (free == no) 0.3f else 0.8f), style = MaterialTheme.typography.titleSmall, modifier = Modifier.width(56.dp), textAlign = TextAlign.Center)
                    Text(plus, style = MaterialTheme.typography.titleMedium.copy(brush = GoldBrush), fontWeight = FontWeight.Bold, modifier = Modifier.width(56.dp), textAlign = TextAlign.Center)
                }
            }
        }
    }
}

/** A floating gem in a gold frame. */
@Composable
private fun Gem() {
    var float = 0f
    var tilt = 0f
    if (!app.talklive.ui.theme.LocalReduceMotion.current) {
        val t = rememberInfiniteTransition(label = "gem")
        float = t.animateFloat(-6f, 6f, infiniteRepeatable(tween(1800, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "float").value
        tilt = t.animateFloat(-5f, 5f, infiniteRepeatable(tween(2600, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "tilt").value
    }
    Box(
        Modifier.padding(top = 4.dp).offset(y = float.dp).size(104.dp).rotate(tilt).clip(RoundedCornerShape(32.dp)).background(GoldBrush).padding(3.dp)
            .clip(RoundedCornerShape(29.dp)).background(Color(0xFF111522)),
        contentAlignment = Alignment.Center,
    ) { app.talklive.ui.components.PlusGem(56.dp) }
}

@Composable
private fun PlanCard(plan: PlusPlan, all: List<PlusPlan>, selected: Boolean, onClick: () -> Unit) {
    val border by animateColorAsState(if (selected) Gold2 else Color.White.copy(alpha = 0.12f), label = "plan")
    val days = PlayBilling.periodDays(plan.period)
    // "Save 40%" on the longer plan against the shortest one, when Play's prices allow it.
    val saving = all.firstOrNull()?.takeIf { it != plan }?.let { short ->
        val shortMicros = priceMicros(short.price) ?: return@let null
        val mine = priceMicros(plan.price) ?: return@let null
        val shortDays = PlayBilling.periodDays(short.period).takeIf { it > 0 } ?: return@let null
        val pct = Math.round(100 - mine * 100.0 / (shortMicros * days / shortDays)).toInt()
        pct.takeIf { it in 5..90 }
    }
    Box {
        Surface(
            onClick = onClick,
            shape = RoundedCornerShape(20.dp),
            border = BorderStroke(if (selected) 2.dp else 1.dp, border),
            color = if (selected) Gold2.copy(alpha = 0.10f) else Color.White.copy(alpha = 0.05f),
            modifier = Modifier.fillMaxWidth().padding(top = if (saving != null) 10.dp else 0.dp),
        ) {
            Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(22.dp).clip(CircleShape).background(if (selected) GoldBrush else SolidColor(Color.White.copy(alpha = 0.2f))),
                    contentAlignment = Alignment.Center,
                ) { if (selected) Box(Modifier.size(8.dp).clip(CircleShape).background(Color.White)) }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        stringResource(if (days >= 360) R.string.plus_yearly else R.string.plus_monthly),
                        style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color.White,
                    )
                    plan.trial?.let { Text(stringResource(R.string.plus_trial, PlayBilling.periodDays(it)), style = MaterialTheme.typography.labelMedium, color = Gold1) }
                    // What a yearly plan comes to each month, to set against the monthly price.
                    if (days >= 360 && plan.priceMicros > 0 && plan.currency.isNotBlank()) {
                        Text(
                            stringResource(R.string.plus_year_per_month, app.talklive.billing.LocalPrice.perMonth(plan.priceMicros / 1_000_000.0, plan.currency)),
                            style = MaterialTheme.typography.labelMedium, color = Gold1,
                        )
                    }
                }
                Text(plan.price, style = MaterialTheme.typography.titleLarge, color = Color.White)
            }
        }
        saving?.let { SaveChip(it, Modifier.align(Alignment.TopEnd).padding(end = 16.dp)) }
    }
}

/** The gold "Save 42%" tag on the yearly plan. */
@Composable
private fun SaveChip(percent: Int, modifier: Modifier = Modifier) {
    Text(
        stringResource(R.string.plus_save, percent), color = Color(0xFF2B1D00), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold,
        modifier = modifier.clip(CircleShape).background(GoldBrush).padding(horizontal = 10.dp, vertical = 4.dp),
    )
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

/** A one-time pass: days in big type, its price, and a small badge. */
@Composable
private fun PassCard(pass: app.talklive.billing.PlusPass, badge: String?, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    // Laid out like the monthly plan (a radio, a name, a price), so it reads
    // as something to pick and buy, not a picture.
    val border by animateColorAsState(if (selected) Gold2 else Color.White.copy(alpha = 0.16f), label = "pass")
    Box(modifier.fillMaxWidth()) {
        Surface(
            onClick = { app.talklive.sound.Tap.pop(); onClick() },
            shape = RoundedCornerShape(18.dp),
            color = if (selected) Gold2.copy(alpha = 0.12f) else Color.White.copy(alpha = 0.06f),
            border = BorderStroke(if (selected) 2.dp else 1.dp, border),
            modifier = Modifier.fillMaxWidth().padding(top = if (badge != null) 8.dp else 0.dp),
        ) {
            Row(Modifier.padding(horizontal = 16.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(22.dp).clip(CircleShape)
                        .background(if (selected) GoldBrush else SolidColor(Color.Transparent))
                        .border(2.dp, if (selected) Color.Transparent else Color.White.copy(alpha = 0.45f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) { if (selected) Box(Modifier.size(8.dp).clip(CircleShape).background(Color.White)) }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        stringResource(R.string.pass_name, pass.days),
                        style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color.White,
                    )
                    // Per day from the real amount and currency (formatted text can't be parsed
                    // safely: "PKR 1,399" and "1.399 €" mean the same number).
                    val perDay = pass.takeIf { it.days > 1 && it.priceMicros > 0 && it.currency.isNotBlank() }?.let {
                        app.talklive.billing.LocalPrice.format(it.priceMicros / 1_000_000.0 / it.days, it.currency, 2)
                    }
                    Text(
                        if (perDay != null) stringResource(R.string.pass_per_day, perDay) else stringResource(R.string.pass_once),
                        style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.72f),
                    )
                }
                Text(pass.price, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = if (selected) Gold1 else Color.White)
            }
        }
        if (badge != null) Text(
            badge, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = Color(0xFF2B1D00), maxLines = 1,
            modifier = Modifier.align(Alignment.TopEnd).padding(end = 16.dp).clip(CircleShape).background(GoldBrush).padding(horizontal = 10.dp, vertical = 3.dp),
        )
    }
}
