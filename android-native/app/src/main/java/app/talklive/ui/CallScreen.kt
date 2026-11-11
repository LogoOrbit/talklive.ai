package app.talklive.ui

import androidx.compose.ui.unit.sp
import androidx.compose.material.icons.automirrored.rounded.Chat
import androidx.compose.foundation.layout.width
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
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
import androidx.compose.material.icons.automirrored.rounded.VolumeUp
import androidx.compose.material.icons.rounded.CallEnd
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.Hearing
import androidx.compose.material.icons.rounded.HourglassTop
import androidx.compose.material.icons.rounded.HowToReg
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material.icons.rounded.MicOff
import androidx.compose.material.icons.rounded.PauseCircle
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material.icons.rounded.SportsEsports
import androidx.compose.material.icons.rounded.WifiOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.call.CallPhase
import app.talklive.call.CallState
import app.talklive.call.LinkQuality
import app.talklive.net.Partner
import app.talklive.ui.animals.AnimalAvatar
import app.talklive.ui.animals.animalById
import app.talklive.ui.theme.BrandTeal
import app.talklive.ui.theme.BrandViolet
import app.talklive.ui.theme.Danger
import app.talklive.ui.theme.Success
import kotlinx.coroutines.delay

private val Amber = Color(0xFFF59E0B)

enum class FriendStatus { None, Requested, Friends }

@Composable
fun CallScreen(
    state: CallState,
    connected: Boolean,
    myAnimal: String?,
    remoteLevel: () -> Float,
    friendStatus: FriendStatus = FriendStatus.None,
    onAddFriend: () -> Unit = {},
    reactions: kotlinx.coroutines.flow.Flow<app.talklive.call.FloatingReaction> = kotlinx.coroutines.flow.emptyFlow(),
    onReact: (String) -> Unit = {},
    chat: List<app.talklive.social.ChatMessage> = emptyList(),
    onSendChat: (String) -> Unit = {},
    onSendGif: (app.talklive.social.Gif) -> Unit = {},
    onTyping: () -> Unit = {},
    icebreaker: () -> app.talklive.data.Icebreaker? = { null },
    onGames: (() -> Unit)? = null,
    onNext: () -> Unit,
    onEnd: () -> Unit,
    onMute: () -> Unit,
    onSpeaker: () -> Unit,
    onReport: (String) -> Unit,
    autoConnect: Boolean = true,
    onAutoConnect: (Boolean) -> Unit = {},
    bands: () -> FloatArray = { FloatArray(0) },
    premium: Boolean = false,
    noiseSuppression: Boolean = true,
    onNoiseSuppression: (Boolean) -> Unit = {},
    onProblem: (String) -> Unit = {},
) {
    var reporting by remember { mutableStateOf(false) }
    var showSettings by remember { mutableStateOf(false) }
    var showProblem by remember { mutableStateOf(false) }
    var showPartner by remember { mutableStateOf(false) }
    var showChat by remember { mutableStateOf(false) }
    // Messages from them since the chat was last open: a red dot on the chat button.
    var seenTheirs by remember { mutableStateOf(0) }
    val theirs = chat.count { !it.mine }
    if (theirs < seenTheirs) seenTheirs = 0 // new person, fresh chat
    if (showChat) seenTheirs = theirs
    val unread = theirs - seenTheirs
    val phase = state.phase
    // Nobody is shown until the call is actually live.
    val partner = (phase as? CallPhase.Connected)?.partner

    // Tilt is read only in layout/draw lambdas, so sensor updates do not rebuild
    // the screen; it pauses while the chat sheet covers the call.
    val tiltState = app.talklive.ui.call.rememberTilt(paused = showChat)
    if (showSettings && partner != null) app.talklive.ui.call.CallSettingsSheet(
        partner = partner, myAnimal = myAnimal, speakerOn = state.speakerOn, noiseSuppression = noiseSuppression,
        canAddFriend = friendStatus == FriendStatus.None,
        onSpeaker = { if (it != state.speakerOn) onSpeaker() }, onNoiseSuppression = onNoiseSuppression,
        onAddFriend = { onAddFriend(); showSettings = false },
        onReport = { showSettings = false; reporting = true },
        onProblem = { showSettings = false; showProblem = true },
        onDismiss = { showSettings = false },
    )
    if (showProblem) app.talklive.ui.engage.FeedbackSheet(problem = true, onSend = { onProblem(it) }) { showProblem = false }
    val live = phase is CallPhase.Connected
    app.talklive.ui.call.CallBackdrop(connected = live, tiltOf = { tiltState.value }) {
    Column(
        Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 20.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Top: leave, the one thing that is wrong (or the link quality), auto-connect and games.
        val banner = when {
            !connected -> Banner(Icons.Rounded.WifiOff, R.string.reconnecting, Amber)
            state.onHold -> Banner(Icons.Rounded.PauseCircle, R.string.on_hold, Amber)
            state.unstable -> Banner(Icons.Rounded.WifiOff, R.string.unstable, Amber)
            else -> null
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            app.talklive.ui.call.LeaveButton(onEnd)
            Spacer(Modifier.width(8.dp))
            Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                AnimatedContent(
                    targetState = banner,
                    transitionSpec = { (fadeIn() + scaleIn(initialScale = 0.9f)) togetherWith fadeOut() },
                    label = "banner",
                ) { b -> if (b != null) StatusPill(b) }
            }
            if (live && banner == null) {
                val (level, tint) = when (state.quality) {
                    LinkQuality.Good -> 3 to Success
                    LinkQuality.Fair -> 2 to Amber
                    LinkQuality.Poor -> 1 to Danger
                    else -> 0 to Success
                }
                if (level > 0) {
                    app.talklive.ui.call.SignalBars(level, tint, Modifier.padding(end = 4.dp), rttMs = state.rttMs, lossPct = state.lossPct)
                }
            }
            if (live) {
                app.talklive.ui.call.CallSettingsButton { showSettings = true }
                Spacer(Modifier.width(8.dp))
            }
            if (onGames != null && live) {
                Surface(onClick = onGames, shape = CircleShape, color = MaterialTheme.colorScheme.surface.copy(alpha = 0.85f), modifier = Modifier.size(40.dp)) {
                    Box(contentAlignment = Alignment.Center) { Icon(Icons.Rounded.SportsEsports, stringResource(R.string.games_title), tint = MaterialTheme.colorScheme.primary) }
                }
                Spacer(Modifier.width(8.dp))
            }
        }

        Spacer(Modifier.weight(1f))
        // The person, on a slightly faster layer than the background: a gentle parallax.
        AnimatedContent(
            targetState = partner?.clientId,
            transitionSpec = {
                (scaleIn(spring(dampingRatio = 0.55f, stiffness = 260f), initialScale = 0.5f) + fadeIn(tween(300))) togetherWith
                    (scaleOut(targetScale = 1.2f) + fadeOut(tween(180)))
            },
            label = "who",
            modifier = Modifier.graphicsLayer { val tilt = tiltState.value; translationX = tilt.x * 22f; translationY = tilt.y * 14f },
        ) { id ->
            if (id == null || partner == null) {
                if (premium) PlusRadar { app.talklive.ui.components.PlusRing(true, 112.dp) { AnimalAvatar(myAnimal, null, 112.dp) } }
                else Radar { AnimalAvatar(myAnimal, null, 112.dp) }
            } else {
                Box(Modifier.clip(CircleShape).clickable { showPartner = true }) {
                    app.talklive.ui.call.SpectrumRing(bands = if (showChat) NoBands else bands, active = live, size = 260.dp, inner = 150.dp) {
                        app.talklive.ui.components.PlusRing(partner.premium || partner.ring, 150.dp, alive = partner.premium) {
                            SpeakingAvatar(partner, active = live, level = remoteLevel)
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(20.dp))

        AnimatedContent(
            targetState = phase,
            contentKey = { it::class },
            transitionSpec = { fadeIn(tween(250)) togetherWith fadeOut(tween(150)) },
            label = "text",
            modifier = Modifier.graphicsLayer { translationX = tiltState.value.x * 10f },
        ) { p ->
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                when (p) {
                    is CallPhase.Searching -> {
                        SearchingTitle()
                        p.etaSeconds?.takeIf { it > 0 }?.let { Spacer(Modifier.height(8.dp)); Subtitle(stringResource(R.string.searching_eta, it)) }
                        if (premium) { Spacer(Modifier.height(10.dp)); PlusPriority() }
                    }
                    is CallPhase.Connecting -> {
                        Title(stringResource(R.string.almost_there))
                        Spacer(Modifier.height(8.dp))
                        val where = listOfNotNull(flag(p.partner.countryCode), p.partner.country).joinToString(" ")
                        Subtitle(if (where.isBlank()) stringResource(R.string.connecting_someone) else stringResource(R.string.connecting_someone_in, where))
                        if (premium) { Spacer(Modifier.height(10.dp)); PlusPriority() }
                    }
                    is CallPhase.Connected -> {
                        PartnerInfo(p.partner)
                        Spacer(Modifier.height(4.dp))
                        Elapsed(p.sinceMs)
                        if (p.partner.interests.isNotEmpty()) {
                            Spacer(Modifier.height(10.dp))
                            InterestChips(p.partner.interests)
                        }
                    }
                    CallPhase.Idle -> Unit
                }
            }
        }
        AnimatedVisibility(state.partnerMuted && partner != null, enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically()) {
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surface, modifier = Modifier.padding(top = 10.dp)) {
                Row(Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.MicOff, null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.size(6.dp))
                    Text(stringResource(R.string.partner_muted), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        Spacer(Modifier.weight(0.8f))

        AnimatedVisibility(live, enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically()) {
            ReactionBar(heartSent = state.heartSent, onReact = onReact)
        }
        Spacer(Modifier.height(14.dp))
        // A glass bar of the small controls; only when someone is there to use them on.
        AnimatedVisibility(partner != null, enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically()) {
            Row(
                Modifier.clip(CircleShape).background(MaterialTheme.colorScheme.surface.copy(alpha = 0.75f)).padding(horizontal = 10.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                app.talklive.ui.call.BarButton(if (state.muted) Icons.Rounded.MicOff else Icons.Rounded.Mic, stringResource(if (state.muted) R.string.unmute else R.string.mute), active = state.muted, onClick = onMute)
                app.talklive.ui.call.BarButton(if (state.speakerOn) Icons.AutoMirrored.Rounded.VolumeUp else Icons.Rounded.Hearing, stringResource(R.string.speaker), active = state.speakerOn, onClick = onSpeaker)
                app.talklive.ui.call.BarButton(
                    when (friendStatus) { FriendStatus.Friends -> Icons.Rounded.HowToReg; FriendStatus.Requested -> Icons.Rounded.HourglassTop; FriendStatus.None -> Icons.Rounded.PersonAdd },
                    stringResource(R.string.add_friend), active = friendStatus != FriendStatus.None,
                    enabled = live && friendStatus == FriendStatus.None, onClick = onAddFriend,
                )
                Box {
                    app.talklive.ui.call.BarButton(Icons.AutoMirrored.Rounded.Chat, stringResource(R.string.message_hint), active = unread > 0, onClick = { showChat = true })
                    if (unread > 0) Box(
                        Modifier.align(Alignment.TopEnd).size(18.dp).clip(CircleShape).background(Danger),
                        contentAlignment = Alignment.Center,
                    ) { Text(if (unread > 9) "9+" else unread.toString(), color = Color.White, fontSize = 10.sp, lineHeight = 12.sp) }
                }
                app.talklive.ui.call.BarButton(Icons.Rounded.Flag, stringResource(R.string.report), tint = Danger, enabled = partner != null, onClick = { reporting = true })
            }
        }
        Spacer(Modifier.height(18.dp))
        app.talklive.ui.call.MainCallButton(
            phaseLive = live,
            // Until audio is live it is still a search the person can stop.
            connecting = false,
            autoConnect = autoConnect,
            onNext = onNext,
            onEnd = onEnd,
        )
        // Lifted off the bottom edge, where a thumb rests comfortably.
        Spacer(Modifier.height(40.dp))
    }

    FloatingReactions(reactions)
    }

    if (showChat && partner != null) app.talklive.ui.call.InCallChat(
        name = partner.username.ifBlank { stringResource(R.string.stranger) },
        messages = chat, partnerTyping = state.partnerTyping,
        onSend = onSendChat, onSendGif = onSendGif, onTyping = onTyping,
    ) { showChat = false }
    LaunchedEffect(partner?.clientId) { if (partner == null) showChat = false }
    if (showPartner && partner != null) PartnerSheet(partner, friendStatus, onAddFriend, onReport = { reporting = true }) { showPartner = false }

    if (reporting) {
        val reasons = listOf(
            "inappropriate" to R.string.report_inappropriate,
            "harassment" to R.string.report_harassment,
            "spam" to R.string.report_spam,
            "underage" to R.string.report_underage,
        )
        AlertDialog(
            onDismissRequest = { reporting = false },
            title = { Text(stringResource(R.string.report_title)) },
            text = {
                Column {
                    Text(stringResource(R.string.report_body), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(8.dp))
                    reasons.forEach { (key, label) ->
                        TextButton(onClick = { reporting = false; onReport(key) }) { Text(stringResource(label)) }
                    }
                }
            },
            confirmButton = {},
            dismissButton = { TextButton(onClick = { reporting = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

private data class Banner(val icon: ImageVector?, val text: Int, val color: Color)

private fun QualityBanner(q: LinkQuality) = when (q) {
    LinkQuality.Good -> Banner(null, R.string.quality_good, Success)
    LinkQuality.Fair -> Banner(null, R.string.quality_fair, Amber)
    LinkQuality.Poor -> Banner(null, R.string.quality_poor, Danger)
}

@Composable
private fun StatusPill(b: Banner) {
    Surface(shape = CircleShape, color = b.color.copy(alpha = 0.14f)) {
        Row(Modifier.padding(horizontal = 14.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
            if (b.icon != null) Icon(b.icon, null, Modifier.size(16.dp), tint = b.color)
            else Box(Modifier.size(8.dp).clip(CircleShape).background(b.color))
            Spacer(Modifier.size(8.dp))
            Text(stringResource(b.text), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onBackground)
        }
    }
}

/** Rings ripple out from your own animal while the app looks for someone. */
@Composable
private fun Radar(content: @Composable () -> Unit) {
    val still = app.talklive.ui.theme.LocalReduceMotion.current
    val phases: List<androidx.compose.runtime.State<Float>> = if (still) {
        remember { listOf(0.2f, 0.55f, 0.9f).map { androidx.compose.runtime.mutableStateOf(it) } }
    } else {
        val t = rememberInfiniteTransition(label = "radar")
        (0 until 3).map { i ->
            t.animateFloat(
                0f, 1f,
                infiniteRepeatable(tween(2400, delayMillis = 0, easing = LinearEasing), RepeatMode.Restart, initialStartOffset = androidx.compose.animation.core.StartOffset(i * 800)),
                label = "ring$i",
            )
        }
    }
    Box(
        Modifier.size(240.dp).drawBehind {
            val base = 56.dp.toPx()
            phases.forEach { p ->
                val f = p.value
                drawCircle(
                    color = BrandViolet.copy(alpha = (1f - f) * 0.35f),
                    radius = base + (size.minDimension / 2 - base) * f,
                    style = Stroke(width = 2.dp.toPx()),
                )
            }
        },
        contentAlignment = Alignment.Center,
    ) { content() }
}

/**
 * Plus members wait in style: fast gold rings on a quick beat, a turning gold
 * sweep and light streaking in towards them, as if the match is racing in.
 * All motion is read in draw lambdas, so it never recomposes the screen.
 */
@Composable
private fun PlusRadar(content: @Composable () -> Unit) {
    val still = app.talklive.ui.theme.LocalReduceMotion.current
    val t = rememberInfiniteTransition(label = "plusRadar")
    val rings = (0 until 4).map { i ->
        t.animateFloat(0f, 1f, infiniteRepeatable(tween(1100, easing = LinearEasing), RepeatMode.Restart, initialStartOffset = androidx.compose.animation.core.StartOffset(i * 275)), label = "pr$i")
    }
    val sweep = t.animateFloat(0f, 360f, infiniteRepeatable(tween(1400, easing = LinearEasing)), label = "sweep")
    val beat = t.animateFloat(0f, 1f, infiniteRepeatable(tween(550, easing = LinearEasing)), label = "beat")
    val gold = Color(0xFFF5C451)
    val streaks = remember { List(18) { Triple(Math.random().toFloat() * 360f, 0.4f + Math.random().toFloat() * 0.6f, Math.random().toFloat()) } }
    Box(
        Modifier.size(260.dp).drawBehind {
            if (still) return@drawBehind
            val c = center
            val base = 64.dp.toPx()
            val maxR = size.minDimension / 2
            // Light streaking in from the edge.
            streaks.forEach { (deg, speed, off) ->
                val f = ((beat.value * speed * 2f) + off) % 1f
                val a = Math.toRadians(deg.toDouble())
                val r1 = maxR * (1f - f)
                val r2 = (r1 - 18.dp.toPx() * speed).coerceAtLeast(base)
                val dir = androidx.compose.ui.geometry.Offset(kotlin.math.cos(a).toFloat(), kotlin.math.sin(a).toFloat())
                drawLine(gold.copy(alpha = 0.55f * f), c + dir * r1, c + dir * r2, strokeWidth = 2.dp.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round)
            }
            // Fast gold rings.
            rings.forEach { p ->
                val f = p.value
                drawCircle(gold.copy(alpha = (1f - f) * 0.5f), radius = base + (maxR - base) * f, style = Stroke(width = (2.5f - f * 1.5f).dp.toPx()))
            }
            // A turning sweep of light.
            rotate(sweep.value) {
                drawArc(
                    brush = Brush.sweepGradient(listOf(Color.Transparent, gold.copy(alpha = 0.0f), gold.copy(alpha = 0.45f)), center = c),
                    startAngle = 0f, sweepAngle = 90f, useCenter = false,
                    topLeft = c - androidx.compose.ui.geometry.Offset(base + 22.dp.toPx(), base + 22.dp.toPx()),
                    size = androidx.compose.ui.geometry.Size((base + 22.dp.toPx()) * 2, (base + 22.dp.toPx()) * 2),
                    style = Stroke(width = 3.dp.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round),
                )
            }
        },
        contentAlignment = Alignment.Center,
    ) { content() }
}

/** Plus: two quiet words in gold, under the line that says what is happening. */
@Composable
private fun PlusPriority() {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(stringResource(R.string.plus_priority), style = MaterialTheme.typography.labelMedium.copy(fontSize = 13.sp), color = app.talklive.ui.theme.GoldText)
    }
}

/** The stranger's face, with a glow that swells as they talk. */
@Composable
private fun SpeakingAvatar(partner: Partner, active: Boolean, level: () -> Float) {
    val smooth = remember { Animatable(0f) }
    LaunchedEffect(active) {
        if (!active) { smooth.snapTo(0f); return@LaunchedEffect }
        snapshotFlow(level).collect { smooth.animateTo((it * 3f).coerceIn(0f, 1f), tween(200)) }
    }
    val ring by animateColorAsState(if (active) BrandTeal else BrandViolet, label = "ring")
    Box(
        Modifier.size(240.dp).drawBehind {
            val v = smooth.value
            val base = 76.dp.toPx()
            drawCircle(ring.copy(alpha = 0.10f + 0.18f * v), radius = base + 34.dp.toPx() * v + 8.dp.toPx())
            drawCircle(ring.copy(alpha = 0.55f * v + 0.15f), radius = base + 6.dp.toPx() + 10.dp.toPx() * v, style = Stroke(3.dp.toPx()))
        },
        contentAlignment = Alignment.Center,
    ) { AnimalAvatar(partner.animal, partner.username, 152.dp) }
}

@Composable
private fun PartnerInfo(p: Partner) {
    app.talklive.ui.components.PlusName(
        p.username.ifBlank { stringResource(R.string.stranger) }, p.premium,
        MaterialTheme.typography.headlineSmall, textAlign = androidx.compose.ui.text.style.TextAlign.Center,
    )
    if (p.premium) { Spacer(Modifier.height(6.dp)); app.talklive.ui.components.PlusTag() }
    Spacer(Modifier.height(8.dp))
    Subtitle(partnerLine(p).ifBlank { animalById(p.animal)?.name.orEmpty() })
}

private val REACTION_EMOJI = linkedMapOf("like" to "👍", "laugh" to "😂", "clap" to "👏", "heart" to "❤️")

@Composable
private fun ReactionBar(heartSent: Boolean, onReact: (String) -> Unit) {
    val haptics = LocalHapticFeedback.current
    // Fixed-size cells and a fixed emoji size, so phones with large emoji fonts never overlap.
    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surface.copy(alpha = 0.75f)) {
        Row(Modifier.padding(horizontal = 6.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            REACTION_EMOJI.forEach { (type, emoji) ->
                val source = remember { MutableInteractionSource() }
                val pressed by source.collectIsPressedAsState()
                val scale by androidx.compose.animation.core.animateFloatAsState(if (pressed) 1.25f else 1f, spring(dampingRatio = 0.4f), label = "r")
                val hearted = type == "heart" && heartSent
                Box(
                    Modifier.size(44.dp).scale(scale).clip(CircleShape)
                        .then(if (hearted) Modifier.background(app.talklive.ui.components.BrandGradient) else Modifier)
                        .clickable(source, indication = null) {
                            haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            onReact(type)
                        },
                    contentAlignment = Alignment.Center,
                ) { Text(emoji, fontSize = 20.sp, lineHeight = 24.sp, maxLines = 1) }
            }
        }
    }
}

/** Emojis that float up the screen when either side reacts. */
@Composable
private fun FloatingReactions(reactions: kotlinx.coroutines.flow.Flow<app.talklive.call.FloatingReaction>) {
    val live = remember { androidx.compose.runtime.mutableStateListOf<app.talklive.call.FloatingReaction>() }
    LaunchedEffect(reactions) { reactions.collect { live += it; if (live.size > 12) live.removeAt(0) } }
    Box(Modifier.fillMaxSize()) {
        live.forEach { r ->
            androidx.compose.runtime.key(r.id) {
                val progress = remember { Animatable(0f) }
                LaunchedEffect(Unit) {
                    progress.animateTo(1f, tween(2200, easing = LinearEasing))
                    live.remove(r)
                }
                val drift = remember { (-60..60).random() }
                val p = progress.value
                Text(
                    REACTION_EMOJI[r.type] ?: "✨",
                    fontSize = androidx.compose.ui.unit.TextUnit(if (r.mine) 34f else 44f, androidx.compose.ui.unit.TextUnitType.Sp),
                    modifier = Modifier.align(if (r.mine) Alignment.BottomEnd else Alignment.BottomStart)
                        .padding(horizontal = 48.dp, vertical = 180.dp)
                        .graphicsLayer {
                            translationY = -p * 900f
                            translationX = drift * p * 2f
                            alpha = 1f - p
                            val sc = 0.6f + minOf(p * 4f, 1f) * 0.6f
                            scaleX = sc; scaleY = sc
                        },
                )
            }
        }
    }
}

/** "Need an icebreaker?" that opens into a question card for the call. */
@Composable
private fun IcebreakerCard(key: String, draw: () -> app.talklive.data.Icebreaker?) {
    var q by remember(key) { mutableStateOf<app.talklive.data.Icebreaker?>(null) }
    AnimatedContent(targetState = q, transitionSpec = { (fadeIn() + scaleIn(initialScale = 0.9f)) togetherWith fadeOut() }, label = "ice") { cur ->
        if (cur == null) {
            Surface(onClick = { q = draw() }, shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
                Row(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                app.talklive.ui.components.SymbolIcon("💡", 18.dp, tint = MaterialTheme.colorScheme.onPrimaryContainer)
                Spacer(Modifier.width(8.dp))
                Text(
                    stringResource(R.string.need_icebreaker),
                    style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
                }
            }
        } else {
            Surface(onClick = { q = draw() }, shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface) {
                Column(Modifier.padding(horizontal = 20.dp, vertical = 14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${cur.emoji}  ${cur.text}", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    Spacer(Modifier.height(4.dp))
                    Text(stringResource(R.string.tap_another), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

/** Searching text that changes now and then, so a long wait never looks frozen. */
@Composable
private fun SearchingTitle() {
    val lines = listOf(R.string.searching, R.string.searching_2, R.string.searching_3)
    var i by remember { mutableStateOf(0) }
    LaunchedEffect(Unit) { while (true) { delay(3500); i = (i + 1) % lines.size } }
    AnimatedContent(i, transitionSpec = { fadeIn(tween(300)) togetherWith fadeOut(tween(200)) }, label = "searching") {
        Title(stringResource(lines[it]))
    }
}

@Composable
private fun Title(text: String) =
    Text(text, style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground, textAlign = androidx.compose.ui.text.style.TextAlign.Center)

@Composable
private fun Subtitle(text: String) =
    Text(text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)

@Composable
private fun Elapsed(sinceMs: Long) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(sinceMs) {
        while (true) { now = System.currentTimeMillis(); delay(1000) }
    }
    val secs = ((now - sinceMs) / 1000).coerceAtLeast(0)
    Subtitle("%d:%02d".format(secs / 60, secs % 60))
}

@Composable
private fun Control(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    active: Boolean = false,
    enabled: Boolean = true,
    container: Color? = null,
    size: Int = 60,
) {
    val haptics = LocalHapticFeedback.current
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val scale by androidx.compose.animation.core.animateFloatAsState(
        if (pressed) 0.88f else 1f, spring(dampingRatio = 0.5f, stiffness = 700f), label = "press",
    )
    val bg by animateColorAsState(
        container ?: if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
        label = "bg",
    )
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        FilledIconButton(
            onClick = {
                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                onClick()
            },
            enabled = enabled,
            interactionSource = source,
            modifier = Modifier.size(size.dp).scale(scale),
            colors = IconButtonDefaults.filledIconButtonColors(
                containerColor = bg,
                contentColor = if (container != null || active) Color.White else MaterialTheme.colorScheme.onSurface,
            ),
        ) { Icon(icon, contentDescription = label, modifier = Modifier.size((size * 0.42).dp)) }
        Spacer(Modifier.height(6.dp))
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/** ISO country code to its flag emoji. */
private fun flag(code: String?): String? {
    if (code == null || code.length != 2 || !code.all { it.isLetter() }) return null
    val base = 0x1F1E6 - 'A'.code
    return code.uppercase().map { String(Character.toChars(base + it.code)) }.joinToString("")
}

/** The voice bars stand still while the chat sheet covers the call (nothing to see, less work). */
private val NoBands: () -> FloatArray = { FloatArray(0) }
