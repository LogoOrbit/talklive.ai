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
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.rounded.KeyboardArrowUp
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
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material.icons.rounded.Movie
import androidx.compose.material.icons.rounded.People
import androidx.compose.material.icons.rounded.Public
import androidx.compose.material.icons.rounded.Sell
import androidx.compose.material.icons.rounded.WorkspacePremium
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextDecoration

/** What the person was doing when Plus opened, so the page can speak to it. */
enum class PlusReason { GenderFilter, Countries, Interests, LikedYou, StreakRestore, Avatar, Theme, History, Priority, Cover, Generic }

/** A [reason], and the number its headline uses when it has one (people who liked you, days of a lost streak). */
data class PlusWhy(val reason: PlusReason = PlusReason.Generic, val count: Int = 0)

@HiltViewModel
class PlusViewModel @Inject constructor(
    val billing: PlayBilling,
    identity: app.talklive.data.IdentityStore,
    auth: app.talklive.auth.AuthRepository,
    val moments: app.talklive.engage.PlusMomentsStore,
) : ViewModel() {
    /** For the "you with Plus" preview. */
    val animal = identity.animalFlow
    val account = auth.account
}

/** The upgrade-moment policy and its analytics for the root screen (not the sheet). */
@HiltViewModel
class PlusMomentsViewModel @Inject constructor(val store: app.talklive.engage.PlusMomentsStore) : ViewModel()

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
    val pending by vm.billing.pending.collectAsStateWithLifecycle()
    val message by vm.billing.message.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { vm.billing.refresh() }
    // Back from Google Play (a pending payment may have settled, a purchase may have been made elsewhere).
    androidx.lifecycle.compose.LifecycleEventEffect(androidx.lifecycle.Lifecycle.Event.ON_RESUME) { vm.billing.restore(quiet = true) }
    // A locked feature opened this page: count the view, and a dismissal if nothing was bought.
    val restrict = why.reason != PlusReason.Generic
    var tapped by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { if (restrict) vm.moments.onShown(app.talklive.engage.PlusMoment.Restrict) }
    val dismiss = {
        if (restrict && !tapped) vm.moments.onDismissed(app.talklive.engage.PlusMoment.Restrict, why.reason.name)
        onDismiss()
    }
    val tap = { if (restrict && !tapped) { tapped = true; vm.moments.onTapped(app.talklive.engage.PlusMoment.Restrict) } }
    LaunchedEffect(message) {
        val m = message ?: return@LaunchedEffect
        val text = when (m) {
            PlayMessage.Welcome -> context.getString(R.string.plus_welcome)
            PlayMessage.Pending -> context.getString(R.string.plus_pending)
            PlayMessage.Later -> context.getString(R.string.plus_later)
            PlayMessage.Failed -> context.getString(R.string.plus_failed)
            PlayMessage.NothingToRestore -> context.getString(R.string.plus_nothing_to_restore)
            PlayMessage.AlreadyOwned -> context.getString(R.string.plus_already_owned)
            PlayMessage.BillingUnavailable -> context.getString(R.string.plus_billing_unavailable)
            PlayMessage.ItemUnavailable -> context.getString(R.string.plus_item_unavailable)
            is PlayMessage.Error -> m.text.ifBlank { context.getString(R.string.plus_failed) }
        }
        Toast.makeText(context, text, Toast.LENGTH_LONG).show()
        vm.billing.clearMessage()
    }
    Dialog(onDismissRequest = dismiss, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        val myAnimal by vm.animal.collectAsStateWithLifecycle()
        val myAccount by vm.account.collectAsStateWithLifecycle()
        PlusContent(
            premium, signedIn, state, busy,
            myAnimal = myAnimal, myName = myAccount?.nickname,
            onSignIn = onSignIn,
            onBuy = { plan -> tap(); context.findActivity()?.let { vm.billing.buy(it, plan) } },
            onBuyPass = { pass -> tap(); context.findActivity()?.let { vm.billing.buyPass(it, pass) } },
            onRestore = { vm.billing.restore() },
            onManage = { openManage(context) },
            onClose = dismiss,
            onInvite = onInvite,
            onFreeOption = onFreeOption,
            passFirst = passFirst,
            why = why,
            pending = pending,
            onRetry = { vm.billing.refresh() },
            onLink = { url -> runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } },
        )
    }
}

/** One line of the benefits table: the same names, order and icons as the website. [reason] is the restriction that leads with it. */
private data class Benefit(val icon: ImageVector, val title: Int, val free: String, val plus: String, val reason: PlusReason? = null)

private const val YES = "✓"
private const val NO = "—"

/**
 * What Plus really changes, in one fixed order (the website lists the same). Numbers are the
 * product's own limits: server FREE_LIMITS (2 countries and 2 interests, Plus 50 and 10), FREE_HISTORY 3,
 * PLUS_FREEZES 2, FILM_FREE 1 / FILM_MAX 3, PLUS_FACES 8. Calls and friends are free for everyone, so
 * they are shown as included on both sides, not as Plus perks.
 */
private val BENEFITS = listOf(
    Benefit(Icons.Rounded.FilterAlt, R.string.plus_b_gender, NO, YES, PlusReason.GenderFilter),
    Benefit(Icons.Rounded.Public, R.string.plus_b_countries, "2", "50", PlusReason.Countries),
    Benefit(Icons.Rounded.Bolt, R.string.plus_b_priority, NO, YES, PlusReason.Priority),
    Benefit(Icons.Rounded.History, R.string.plus_b_history, "3", "∞", PlusReason.History),
    Benefit(Icons.Rounded.Verified, R.string.plus_b_gold, NO, YES, PlusReason.Avatar),
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
    // A purchase Google Play has not confirmed yet.
    pending: Boolean = false,
    onRetry: () -> Unit = {},
    onLink: (String) -> Unit = {},
) {
    val accents = LocalAccents.current
    val still = app.talklive.ui.theme.LocalReduceMotion.current
    val context = LocalContext.current
    // What Play cannot list (not installed from Play, products not live yet) is shown from the same
    // price table the website uses, so people still see what Plus costs; buying then waits for Play.
    val shown: BillingState.Ready? = when (state) {
        is BillingState.Ready -> state
        is BillingState.Unavailable -> remember {
            val (yearAmount, yearCur) = app.talklive.billing.LocalPrice.yearly(context)
            val (monthAmount, monthCur) = app.talklive.billing.LocalPrice.amount(context, 10.0)
            BillingState.Ready(
                listOf(
                    PlusPlan("plus-monthly", app.talklive.billing.LocalPrice.format(monthAmount, monthCur), "P1M", "", null, (monthAmount * 1_000_000).toLong(), monthCur),
                    PlusPlan("plus-yearly", app.talklive.billing.LocalPrice.yearlyLabel(context), "P1Y", "", null, (yearAmount * 1_000_000).toLong(), yearCur),
                ),
                listOf(
                    app.talklive.billing.LocalPrice.pass(context, "pass_1d", 1, 2.0),
                    app.talklive.billing.LocalPrice.pass(context, "pass_7d", 7, 5.0),
                    app.talklive.billing.LocalPrice.pass(context, "pass_15d", 15, 7.0),
                ),
            )
        }
        is BillingState.Loading -> null
    }
    val canBuyHere = state is BillingState.Ready
    // One choice at a time: a subscription plan (the yearly one first, when Play lists it), or a one-time pass.
    var picked by remember(shown) { mutableStateOf(shown?.plans?.lastOrNull()) }
    var pickedPass by remember(shown) {
        mutableStateOf<app.talklive.billing.PlusPass?>(when {
            passFirst -> shown?.passes?.firstOrNull()
            shown?.plans.isNullOrEmpty() -> shown?.passes?.getOrNull(1)
            else -> null
        })
    }
    var showPasses by remember(shown) { mutableStateOf(passFirst || pickedPass != null) }
    Box(Modifier.fillMaxSize().background(PlusBg)) {
        // Aurora: gold and blue light drifting behind everything.
        // The State is read in the draw lambda only, so the drift doesn't recompose the sheet.
        val driftState = if (still) null else rememberInfiniteTransition(label = "aurora").animateFloat(0f, 1f, infiniteRepeatable(tween(7000, easing = LinearEasing), RepeatMode.Reverse), label = "d")
        Box(
            Modifier.fillMaxWidth().height(520.dp).drawBehind {
                val drift = driftState?.value ?: 0.4f
                val w = size.width; val h = size.height
                val c1 = Offset(w * (0.2f + 0.5f * drift), h * 0.15f)
                val c2 = Offset(w * (0.9f - 0.4f * drift), h * 0.35f)
                drawCircle(Brush.radialGradient(listOf(Gold2.copy(alpha = 0.26f), Color.Transparent), center = c1, radius = w * 0.8f), radius = w * 0.8f, center = c1)
                drawCircle(Brush.radialGradient(listOf(accents.a.copy(alpha = 0.34f), Color.Transparent), center = c2, radius = w * 0.75f), radius = w * 0.75f, center = c2)
            },
        )
        Column(
            Modifier.fillMaxSize().statusBarsPadding().verticalScroll(rememberScrollState()).padding(bottom = 230.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), horizontalArrangement = Arrangement.End) {
                IconButton(onClick = onClose, modifier = Modifier.size(48.dp)) { Icon(Icons.Rounded.Close, stringResource(R.string.cancel), tint = Color.White.copy(alpha = 0.8f)) }
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
            Spacer(Modifier.height(20.dp))
            BenefitTable(why, Modifier.padding(horizontal = 20.dp))
            Spacer(Modifier.height(24.dp))
            Column(Modifier.padding(horizontal = 20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                if (pending && !premium.active) {
                    Surface(shape = RoundedCornerShape(16.dp), color = Gold2.copy(alpha = 0.12f), border = BorderStroke(1.dp, Gold2.copy(alpha = 0.5f)), modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
                        Text(stringResource(R.string.plus_pending_banner), style = MaterialTheme.typography.bodyMedium, color = Color.White, modifier = Modifier.padding(14.dp))
                    }
                }
                when {
                    premium.active -> ActiveStatus(premium)
                    !signedIn -> Text(stringResource(R.string.plus_sign_in), style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.7f), textAlign = TextAlign.Center)
                    shown == null -> PriceSkeleton()
                    else -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (state is BillingState.Unavailable) {
                            Surface(shape = RoundedCornerShape(18.dp), color = Color.White.copy(alpha = 0.06f)) {
                                Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(stringResource(R.string.plus_unavailable), style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.8f), textAlign = TextAlign.Center)
                                    TextButton(onClick = onRetry) { Text(stringResource(R.string.plus_retry), color = Gold1) }
                                }
                            }
                        }
                        if (!passFirst) shown.plans.asReversed().forEach { plan -> PlanCard(plan, shown.plans, plan == picked && pickedPass == null) { picked = plan; pickedPass = null } }
                        if (shown.passes.isNotEmpty()) {
                            // Quiet by default: one line, opened when someone wants a few days only.
                            TextButton(
                                onClick = { showPasses = !showPasses },
                                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                            ) {
                                Text(stringResource(R.string.pass_heading), color = Gold1, textAlign = TextAlign.Center)
                                Icon(if (showPasses) Icons.Rounded.KeyboardArrowUp else Icons.Rounded.KeyboardArrowDown, null, tint = Gold1)
                            }
                            androidx.compose.animation.AnimatedVisibility(visible = showPasses) {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                                    shown.passes.forEach { pass -> PassCard(pass, shown.passes, selected = pass == pickedPass) { pickedPass = pass } }
                                }
                            }
                        }
                        if (passFirst) shown.plans.asReversed().forEach { plan -> PlanCard(plan, shown.plans, plan == picked && pickedPass == null) { picked = plan; pickedPass = null } }
                    }
                }
                if (onInvite != null && !premium.active) {
                    TextButton(onClick = onInvite, modifier = Modifier.padding(top = 4.dp).heightIn(min = 48.dp)) {
                        app.talklive.ui.components.GiftIcon(20.dp)
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.plus_earn_title), color = Gold1)
                    }
                }
                // Always one tap away for anyone signed in: a new phone, or a purchase made elsewhere.
                if (signedIn) TextButton(onClick = onRestore, modifier = Modifier.padding(top = 8.dp).heightIn(min = 48.dp)) { Text(stringResource(R.string.plus_restore), color = Gold1) }
            }
        }

        // The action, pinned. Hidden when nothing can be bought on this phone.
        val canBuy = signedIn && !premium.active && canBuyHere
        if (premium.active || !signedIn || canBuy || onFreeOption != null) Column(
            Modifier.align(Alignment.BottomCenter).fillMaxWidth()
                .background(Brush.verticalGradient(listOf(Color.Transparent, PlusBg, PlusBg)))
                .navigationBarsPadding().padding(horizontal = 20.dp).padding(top = 30.dp, bottom = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            when {
                premium.active -> {
                    val manage = premium.source == "play"
                    GoldButton(stringResource(if (manage) R.string.plus_manage else R.string.ok), busy = false, onClick = if (manage) onManage else onClose)
                }
                !signedIn -> GoldButton(stringResource(R.string.sign_in_or_create), busy = false, onClick = onSignIn)
                canBuy && pickedPass != null -> {
                    val pass = pickedPass!!
                    GoldButton(if (pass.days == 1) stringResource(R.string.pass_buy_one, pass.price) else stringResource(R.string.pass_buy, pass.days, pass.price), busy = busy, onClick = { onBuyPass(pass) })
                    Text(stringResource(R.string.pass_once), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = Color.White, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 10.dp))
                    PerDayLine(pass.priceMicros, pass.currency, pass.days)
                    LegalLinks(onLink, renews = false)
                }
                canBuy -> {
                    val plan = picked
                    val yearly = plan != null && PlayBilling.periodDays(plan.period) >= 360
                    val intro = plan?.intro
                    GoldButton(
                        when {
                            plan == null -> stringResource(R.string.plus_subscribe)
                            intro?.free == true -> stringResource(R.string.plus_start_trial)
                            intro != null -> stringResource(R.string.plus_start_intro, intro.price)
                            else -> stringResource(if (yearly) R.string.plus_subscribe_year else R.string.plus_subscribe_month, plan.price)
                        },
                        busy = busy, onClick = { plan?.let(onBuy) },
                    )
                    // What it costs and when, right by the button (Google Play requires
                    // it for trials, and people decide faster when it is plain).
                    plan?.let { pl ->
                        val per = if (yearly) R.string.plus_price_year else R.string.plus_price_month
                        val days = intro?.let { PlayBilling.periodDays(it.period) * it.cycles }
                        val line = when {
                            intro?.free == true -> stringResource(if (yearly) R.string.plus_trial_then_year else R.string.plus_trial_then_month, days ?: 0, pl.price)
                            intro != null -> stringResource(if (yearly) R.string.plus_intro_line_year else R.string.plus_intro_line_month, intro.price, days ?: 0, pl.price)
                            else -> stringResource(per, pl.price)
                        }
                        Text(line, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = Color.White, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 10.dp))
                        PerDayLine(pl.priceMicros, pl.currency, app.talklive.billing.LocalPrice.planDays(PlayBilling.periodDays(pl.period)))
                    }
                    LegalLinks(onLink, renews = true)
                }
            }
            onFreeOption?.let { (label, go) -> TextButton(onClick = go, modifier = Modifier.heightIn(min = 48.dp)) { Text(label, color = Color.White.copy(alpha = 0.7f)) } }
        }
    }
}

/** What Google Play and the law ask to be visible by the button: renewal, cancelling, and the Terms and Privacy Policy. */
@Composable
private fun LegalLinks(onLink: (String) -> Unit, renews: Boolean) {
    if (renews) Text(stringResource(R.string.plus_terms), style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.72f), textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp))
    Row(horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
        TextButton(onClick = { onLink("https://talklive.app/terms") }, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.terms), style = MaterialTheme.typography.labelMedium, color = Gold1) }
        Text("·", color = Color.White.copy(alpha = 0.5f))
        TextButton(onClick = { onLink("https://talklive.app/privacy") }, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.privacy_policy), style = MaterialTheme.typography.labelMedium, color = Gold1) }
    }
}

/** Plan, renewal or expiry, and where it came from: the true state, as the server reports it. */
@Composable
private fun ActiveStatus(premium: Premium) {
    val date = premium.expiresAt?.let { java.text.DateFormat.getDateInstance(java.text.DateFormat.LONG).format(java.util.Date(it)) }
    Text(
        if (date != null) stringResource(R.string.plus_until, date) else stringResource(R.string.plus_active),
        style = MaterialTheme.typography.titleMedium.copy(brush = GoldBrush),
    )
    val line = when (premium.source) {
        "play" -> when {
            premium.state == "grace" -> stringResource(R.string.plus_active_play_grace)
            premium.renews && date != null -> stringResource(R.string.plus_active_play_renews, date)
            date != null -> stringResource(R.string.plus_active_play_ending, date)
            else -> null
        }
        "pass" -> date?.let { stringResource(R.string.plus_active_pass, it) }
        "earlier" -> date?.let { stringResource(R.string.plus_active_earlier, it) }
        else -> if (date != null) stringResource(R.string.plus_active_granted, date) else stringResource(R.string.plus_active_granted_forever)
    }
    if (line != null) Text(line, style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.8f), textAlign = TextAlign.Center, modifier = Modifier.padding(top = 6.dp))
}

/** Holds the room the plan cards will take, so nothing jumps when prices arrive. */
@Composable
private fun PriceSkeleton() {
    val loading = stringResource(R.string.plus_loading_prices)
    Column(Modifier.fillMaxWidth().semantics { contentDescription = loading }, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        repeat(3) { Box(Modifier.fillMaxWidth().height(if (it == 2) 72.dp else 84.dp).clip(RoundedCornerShape(20.dp)).background(Color.White.copy(alpha = 0.06f))) }
    }
}

/** Gold, with a slow shine passing across it. */
@Composable
internal fun GoldButton(text: String, busy: Boolean, onClick: () -> Unit) {
    val still = app.talklive.ui.theme.LocalReduceMotion.current
    val shineState = if (still) null else rememberInfiniteTransition(label = "shine").animateFloat(-0.4f, 1.4f, infiniteRepeatable(tween(2600, easing = LinearEasing)), label = "x")
    Box(
        Modifier.fillMaxWidth().height(58.dp).tapOnce(enabled = !busy) { app.talklive.sound.Tap.pop(); onClick() }.clip(CircleShape).background(GoldBrush)
            .drawBehind {
                val shine = shineState?.value ?: -9f
                if (shine > -1f) drawRect(Brush.linearGradient(listOf(Color.Transparent, Color.White.copy(alpha = 0.45f), Color.Transparent), start = Offset(size.width * shine - 80f, 0f), end = Offset(size.width * shine + 80f, size.height)))
            },
        contentAlignment = Alignment.Center,
    ) {
        if (busy) CircularProgressIndicator(Modifier.size(24.dp), color = Color(0xFF3A2A06), strokeWidth = 2.5.dp)
        else Text(text, color = Color(0xFF2B1D00), style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.ExtraBold)
    }
}

/** "That is $0.33 a day", from the real price in micro-units of [currency] spread over [days]. */
@Composable
private fun PerDayLine(priceMicros: Long, currency: String, days: Int) {
    // A 1-day pass "is X a day" just repeats its price.
    if (priceMicros <= 0 || currency.isBlank() || days <= 1) return
    Text(
        stringResource(R.string.plus_per_day, app.talklive.billing.LocalPrice.perDay(priceMicros / 1_000_000.0, days, currency)),
        style = MaterialTheme.typography.bodyMedium, color = Gold1, textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
    )
}

/** The one-line title for a restriction, for when the sheet is not opened again (see TalkLiveRoot.openPlus). */
fun plusWhyTitle(why: PlusWhy): Int = when (why.reason) {
    PlusReason.GenderFilter -> R.string.plus_why_gender
    PlusReason.Countries -> R.string.plus_why_countries
    PlusReason.Interests -> R.string.plus_why_interests
    PlusReason.LikedYou -> R.string.plus_why_likes_none
    PlusReason.StreakRestore -> R.string.plus_why_streak_none
    PlusReason.Avatar -> R.string.plus_why_avatar
    PlusReason.Theme -> R.string.plus_why_theme
    PlusReason.History -> R.string.plus_why_history
    PlusReason.Priority -> R.string.plus_why_priority
    PlusReason.Cover -> R.string.plus_why_cover
    PlusReason.Generic -> R.string.plus_get
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
        PlusReason.Cover -> stringResource(R.string.plus_why_cover) to stringResource(R.string.plus_why_cover_body)
    }
    Column(Modifier.fillMaxWidth().padding(horizontal = 28.dp, vertical = 4.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color.White, textAlign = TextAlign.Center)
        Spacer(Modifier.height(6.dp))
        Text(body, style = MaterialTheme.typography.bodyLarge, color = Color.White.copy(alpha = 0.8f), textAlign = TextAlign.Center)
        Spacer(Modifier.height(16.dp))
    }
}

/**
 * The few things Plus is for: an icon and one short line each. What the person just ran
 * into is lit and listed first.
 */
@Composable
private fun BenefitTable(why: PlusWhy, modifier: Modifier = Modifier) {
    val first = BENEFITS.firstOrNull { it.reason != null && it.reason == why.reason }
    val rows = if (first == null) BENEFITS else listOf(first) + BENEFITS.filter { it !== first }
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        rows.forEachIndexed { i, b -> BenefitRow(b.icon, stringResource(b.title), lit = first != null && i == 0) }
    }
}

@Composable
private fun BenefitRow(icon: ImageVector, label: String, lit: Boolean) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp))
            .background(if (lit) Gold2.copy(alpha = 0.14f) else Color.White.copy(alpha = 0.05f))
            .padding(horizontal = 14.dp, vertical = 12.dp).semantics(mergeDescendants = true) {},
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(34.dp).clip(CircleShape).background(Gold2.copy(alpha = 0.16f)), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = if (lit) Gold1 else Gold2, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(14.dp))
        Text(label, color = Color.White, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
    }
}

/** A struck-through "compare at" price that screen readers say as "was ...". */
@Composable
private fun WasPrice(anchor: app.talklive.billing.Anchor, modifier: Modifier = Modifier) {
    val text = app.talklive.billing.PlusPricing.format(anchor.compareMicros, anchor.currency)
    val spoken = stringResource(R.string.plus_was, text)
    Text(
        text, style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.62f), textDecoration = TextDecoration.LineThrough,
        modifier = modifier.clearAndSetSemantics { contentDescription = spoken },
    )
}

@Composable
private fun PlanCard(plan: PlusPlan, all: List<PlusPlan>, selected: Boolean, onClick: () -> Unit) {
    val border by animateColorAsState(if (selected) Gold2 else Color.White.copy(alpha = 0.12f), label = "plan")
    val yearly = PlayBilling.periodDays(plan.period) >= 360
    // "Best value" and the saving appear only when the real prices say so: twelve months at the monthly price.
    val anchor = if (yearly) app.talklive.billing.PlusPricing.yearlyAnchor(all, plan) else null
    val intro = plan.intro
    Box {
        Surface(
            onClick = { app.talklive.sound.Tap.pop(); onClick() },
            shape = RoundedCornerShape(20.dp),
            border = BorderStroke(if (selected) 2.dp else 1.dp, border),
            color = if (selected) Gold2.copy(alpha = 0.10f) else Color.White.copy(alpha = 0.05f),
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp).heightIn(min = 72.dp),
        ) {
            Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(22.dp).clip(CircleShape).background(if (selected) GoldBrush else SolidColor(Color.White.copy(alpha = 0.2f))),
                    contentAlignment = Alignment.Center,
                ) { if (selected) Box(Modifier.size(8.dp).clip(CircleShape).background(Color.White)) }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        stringResource(if (yearly) R.string.plus_yearly else R.string.plus_monthly),
                        style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color.White,
                    )
                    intro?.let { i -> if (i.free) Text(stringResource(R.string.plus_trial, PlayBilling.periodDays(i.period) * i.cycles), style = MaterialTheme.typography.labelMedium, color = Gold1) }
                    // What a yearly plan comes to each month, to set against the monthly price.
                    if (yearly && plan.priceMicros > 0 && plan.currency.isNotBlank()) {
                        Text(
                            stringResource(R.string.plus_year_per_month, app.talklive.billing.LocalPrice.perMonth(plan.priceMicros / 1_000_000.0, plan.currency)),
                            style = MaterialTheme.typography.labelMedium, color = Gold1,
                        )
                    }
                    if (anchor != null) Text(stringResource(R.string.plus_vs_months), style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.7f))
                }
                Column(horizontalAlignment = Alignment.End) {
                    // An introductory price leads while it applies, with the regular price struck through beside it.
                    if (intro != null && !intro.free) {
                        val thenSpoken = stringResource(R.string.plus_then_price, plan.price)
                        Text(intro.price, style = MaterialTheme.typography.titleLarge, color = Color.White)
                        Text(plan.price, style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.62f), textDecoration = TextDecoration.LineThrough,
                            modifier = Modifier.clearAndSetSemantics { contentDescription = thenSpoken })
                    } else {
                        Text(plan.price, style = MaterialTheme.typography.titleLarge, color = Color.White)
                        if (anchor != null) WasPrice(anchor)
                    }
                }
            }
        }
        if (anchor != null) SaveChip(stringResource(R.string.plus_best_save, anchor.savePercent), Modifier.align(Alignment.TopEnd).padding(end = 16.dp))
    }
}

/** The gold tag on a card: "Best value · Save 42%" or "Save 64% vs 1-day passes". */
@Composable
private fun SaveChip(text: String, modifier: Modifier = Modifier) {
    Text(
        text, color = Color(0xFF2B1D00), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, maxLines = 1,
        modifier = modifier.clip(CircleShape).background(GoldBrush).padding(horizontal = 10.dp, vertical = 4.dp),
    )
}

/** A floating gem in a gold frame. */
@Composable
private fun Gem() {
    // States are read in the offset / layer lambdas, not here, so the float doesn't recompose the sheet.
    var float: State<Float>? = null
    var tilt: State<Float>? = null
    if (!app.talklive.ui.theme.LocalReduceMotion.current) {
        val t = rememberInfiniteTransition(label = "gem")
        float = t.animateFloat(-6f, 6f, infiniteRepeatable(tween(1800, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "float")
        tilt = t.animateFloat(-5f, 5f, infiniteRepeatable(tween(2600, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "tilt")
    }
    val floatState = float
    val tiltState = tilt
    Box(
        Modifier.padding(top = 4.dp).offset { IntOffset(0, (floatState?.value ?: 0f).dp.roundToPx()) }.size(104.dp)
            .graphicsLayer { rotationZ = tiltState?.value ?: 0f }.clip(RoundedCornerShape(32.dp)).background(GoldBrush).padding(3.dp)
            .clip(RoundedCornerShape(29.dp)).background(Color(0xFF111522)),
        contentAlignment = Alignment.Center,
    ) { app.talklive.ui.components.PlusGem(56.dp) }
}

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

/** A one-time pass: days in big type, its price, and the real saving against 1-day passes when there is one. */
@Composable
private fun PassCard(pass: app.talklive.billing.PlusPass, all: List<app.talklive.billing.PlusPass>, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    // Laid out like the monthly plan (a radio, a name, a price), so it reads
    // as something to pick and buy, not a picture.
    val border by animateColorAsState(if (selected) Gold2 else Color.White.copy(alpha = 0.16f), label = "pass")
    // 7 and 15 days only, compared with the same days bought as 1-day passes; no anchor on the 1-day pass.
    val anchor = app.talklive.billing.PlusPricing.passAnchor(all, pass)
    Box(modifier.fillMaxWidth()) {
        Surface(
            onClick = { app.talklive.sound.Tap.pop(); onClick() },
            shape = RoundedCornerShape(18.dp),
            color = if (selected) Gold2.copy(alpha = 0.12f) else Color.White.copy(alpha = 0.06f),
            border = BorderStroke(if (selected) 2.dp else 1.dp, border),
            modifier = Modifier.fillMaxWidth().padding(top = if (anchor != null) 8.dp else 0.dp).heightIn(min = 64.dp),
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
                Column(horizontalAlignment = Alignment.End) {
                    Text(pass.price, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = if (selected) Gold1 else Color.White)
                    if (anchor != null) WasPrice(anchor)
                }
            }
        }
        if (anchor != null) SaveChip(stringResource(R.string.plus_save_vs_passes, anchor.savePercent), Modifier.align(Alignment.TopEnd).padding(end = 16.dp))
    }
}
