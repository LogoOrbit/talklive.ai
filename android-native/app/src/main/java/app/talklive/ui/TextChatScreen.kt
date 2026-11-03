package app.talklive.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
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
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.HourglassTop
import androidx.compose.material.icons.rounded.HowToReg
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material.icons.rounded.SportsEsports
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilledTonalIconButton
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.call.CallPhase
import app.talklive.call.CallState
import app.talklive.data.Icebreaker
import app.talklive.net.Partner
import app.talklive.social.ChatMessage
import app.talklive.ui.animals.AnimalAvatar
import app.talklive.ui.components.BrandGradient
import app.talklive.ui.social.MessageBubble
import app.talklive.ui.social.TypingBubble
import app.talklive.ui.theme.BrandViolet
import app.talklive.ui.theme.Danger
import kotlinx.coroutines.launch

/** The six reactions a stranger message can get (server/index.js REACTIONS). */
private val MESSAGE_REACTIONS = listOf("👍", "❤️", "😂", "😮", "😢", "🔥")

@Composable
fun TextChatScreen(
    state: CallState,
    messages: List<ChatMessage>,
    myAnimal: String?,
    friendStatus: FriendStatus,
    icebreakers: (Int) -> List<Icebreaker>,
    onSend: (String, String?) -> Unit,
    onTyping: () -> Unit,
    onReact: (String, String) -> Unit,
    onAddFriend: () -> Unit,
    onReport: (String) -> Unit,
    onNext: () -> Unit,
    onEnd: () -> Unit,
    onGames: (() -> Unit)? = null,
    onSwitchToVoice: (() -> Unit)? = null,
) {
    val partner = (state.phase as? CallPhase.Connected)?.partner
    var draft by remember { mutableStateOf("") }
    var replyTo by remember { mutableStateOf<ChatMessage?>(null) }
    var reactingTo by remember { mutableStateOf<ChatMessage?>(null) }
    var reporting by remember { mutableStateOf(false) }
    // A fresh set of icebreakers for every new person.
    var ideas by remember(partner?.clientId) { mutableStateOf(icebreakers(3)) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    BackHandler(onBack = onEnd)
    LaunchedEffect(messages.size, state.partnerTyping) { if (messages.isNotEmpty()) listState.animateScrollToItem(0) }
    LaunchedEffect(partner?.clientId) { draft = ""; replyTo = null }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).imePadding()) {
        // Header: who, and the two ways out.
        Surface(color = MaterialTheme.colorScheme.surface) {
            Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 4.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onEnd) { Icon(Icons.Rounded.Close, stringResource(R.string.end)) }
                AnimatedContent(targetState = partner, label = "who", modifier = Modifier.weight(1f)) { p ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AnimalAvatar(p?.animal ?: myAnimal, p?.username, 40.dp)
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(
                                p?.username ?: stringResource(R.string.searching_chat),
                                style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface,
                                maxLines = 1, overflow = TextOverflow.Ellipsis,
                            )
                            if (p != null) {
                                Text(
                                    when {
                                        state.partnerTyping -> stringResource(R.string.typing)
                                        state.partnerAway -> stringResource(R.string.partner_away)
                                        else -> partnerLine(p)
                                    },
                                    style = MaterialTheme.typography.labelMedium,
                                    color = if (state.partnerTyping) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                )
                            }
                        }
                    }
                }
                if (partner != null) {
                    IconButton(onClick = onAddFriend, enabled = friendStatus == FriendStatus.None) {
                        Icon(
                            when (friendStatus) {
                                FriendStatus.Friends -> Icons.Rounded.HowToReg
                                FriendStatus.Requested -> Icons.Rounded.HourglassTop
                                FriendStatus.None -> Icons.Rounded.PersonAdd
                            },
                            stringResource(R.string.add_friend),
                        )
                    }
                    if (onSwitchToVoice != null) IconButton(onClick = onSwitchToVoice, enabled = !state.voiceInviteSent) {
                        Icon(Icons.Rounded.Call, stringResource(R.string.switch_to_voice))
                    }
                    if (onGames != null) IconButton(onClick = onGames) { Icon(Icons.Rounded.SportsEsports, stringResource(R.string.games_title)) }
                    IconButton(onClick = { reporting = true }) { Icon(Icons.Rounded.Flag, stringResource(R.string.report)) }
                }
                FilledTonalIconButton(onClick = onNext) { Icon(Icons.Rounded.SkipNext, stringResource(R.string.next)) }
                Spacer(Modifier.width(4.dp))
            }
        }

        if (partner == null) {
            Searching(Modifier.weight(1f), myAnimal, (state.phase as? CallPhase.Searching)?.etaSeconds)
        } else {
            val byId = remember(messages) { messages.associateBy { it.id } }
            val newestFirst = messages.asReversed()
            LazyColumn(
                state = listState,
                reverseLayout = true,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = PaddingValues(12.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                if (state.partnerTyping) item(key = "typing") { TypingBubble() }
                itemsIndexed(newestFirst, key = { _, m -> m.id }) { i, m ->
                    val older = newestFirst.getOrNull(i + 1)
                    val newer = newestFirst.getOrNull(i - 1)
                    Box(Modifier.animateItem()) {
                        MessageBubble(
                            m,
                            quoted = m.replyTo?.let { byId[it] },
                            firstInGroup = older == null || older.mine != m.mine,
                            lastInGroup = newer == null || newer.mine != m.mine,
                            showStatus = m.status == app.talklive.social.MsgStatus.Failed,
                            onReply = { replyTo = m },
                            onRetry = {},
                            onLongPress = { reactingTo = m },
                        )
                    }
                }
                item(key = "hello") { NewMatchCard(partner) }
            }

            // Icebreakers until the first message.
            AnimatedVisibility(messages.isEmpty(), enter = expandVertically() + fadeIn(), exit = shrinkVertically() + fadeOut()) {
                Column {
                    Text(
                        stringResource(R.string.icebreaker_hint),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(start = 16.dp, bottom = 6.dp),
                    )
                    LazyRow(contentPadding = PaddingValues(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(ideas, key = { it.text }) { q ->
                            Surface(
                                onClick = { onSend(q.text, null) },
                                shape = RoundedCornerShape(18.dp),
                                color = MaterialTheme.colorScheme.primaryContainer,
                            ) {
                                Text(
                                    "${q.emoji}  ${q.text}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                )
                            }
                        }
                        item {
                            TextButton(onClick = { ideas = icebreakers(3) }) { Text(stringResource(R.string.more_ideas)) }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }

            // Reply preview + composer.
            AnimatedVisibility(replyTo != null, enter = expandVertically() + fadeIn(), exit = shrinkVertically() + fadeOut()) {
                replyTo?.let { r ->
                    Row(
                        Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface).padding(start = 16.dp, end = 4.dp, top = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(Modifier.width(3.dp).height(32.dp).clip(CircleShape).background(BrandGradient))
                        Spacer(Modifier.width(10.dp))
                        Text(r.text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                        IconButton(onClick = { replyTo = null }) { Icon(Icons.Rounded.Close, null) }
                    }
                }
            }
            Row(
                Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface).navigationBarsPadding().padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                Box(
                    Modifier.weight(1f).heightIn(min = 48.dp).clip(RoundedCornerShape(24.dp))
                        .background(MaterialTheme.colorScheme.background).padding(horizontal = 18.dp, vertical = 13.dp),
                    contentAlignment = Alignment.CenterStart,
                ) {
                    if (draft.isEmpty()) Text(stringResource(R.string.message_hint), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyLarge)
                    BasicTextField(
                        value = draft,
                        onValueChange = { draft = it.take(1000); if (it.isNotBlank()) onTyping() },
                        textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                        maxLines = 5,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                Spacer(Modifier.width(8.dp))
                AnimatedVisibility(draft.isNotBlank(), enter = scaleIn(spring(dampingRatio = 0.5f)) + fadeIn(), exit = scaleOut() + fadeOut()) {
                    Box(
                        Modifier.size(48.dp).clip(CircleShape).background(BrandGradient).clickable {
                            onSend(draft, replyTo?.id)
                            draft = ""
                            replyTo = null
                            scope.launch { listState.animateScrollToItem(0) }
                        },
                        contentAlignment = Alignment.Center,
                    ) { Icon(Icons.AutoMirrored.Rounded.Send, stringResource(R.string.send), tint = Color.White) }
                }
            }
        }
    }

    reactingTo?.let { m ->
        AlertDialog(
            onDismissRequest = { reactingTo = null },
            text = {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    MESSAGE_REACTIONS.forEach { e ->
                        Box(
                            Modifier.size(44.dp).clip(CircleShape)
                                .background(if (m.myReaction == e) MaterialTheme.colorScheme.primaryContainer else Color.Transparent)
                                .clickable { onReact(m.id, e); reactingTo = null },
                            contentAlignment = Alignment.Center,
                        ) { Text(e, style = MaterialTheme.typography.headlineSmall) }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { replyTo = m; reactingTo = null }) { Text(stringResource(R.string.reply)) } },
        )
    }

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
                    reasons.forEach { (key, label) -> TextButton(onClick = { reporting = false; onReport(key) }) { Text(stringResource(label), color = Danger) } }
                }
            },
            confirmButton = {},
            dismissButton = { TextButton(onClick = { reporting = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

@Composable
private fun Searching(modifier: Modifier, myAnimal: String?, eta: Int?) {
    val t = rememberInfiniteTransition(label = "radar")
    val rings = (0 until 3).map { i ->
        t.animateFloat(0f, 1f, infiniteRepeatable(tween(2400, easing = LinearEasing), RepeatMode.Restart, StartOffset(i * 800)), label = "r$i")
    }
    Column(modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Box(
            Modifier.size(220.dp).drawBehind {
                val base = 52.dp.toPx()
                rings.forEach { r ->
                    drawCircle(BrandViolet.copy(alpha = (1f - r.value) * 0.35f), radius = base + (size.minDimension / 2 - base) * r.value, style = Stroke(2.dp.toPx()))
                }
            },
            contentAlignment = Alignment.Center,
        ) { AnimalAvatar(myAnimal, null, 104.dp) }
        Spacer(Modifier.height(20.dp))
        Text(stringResource(R.string.searching_chat), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
        eta?.takeIf { it > 0 }?.let {
            Text(stringResource(R.string.searching_eta, it), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** First thing in a new chat: who you are talking to. */
@Composable
private fun NewMatchCard(p: Partner) {
    Column(Modifier.fillMaxWidth().padding(vertical = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        AnimalAvatar(p.animal, p.username, 80.dp)
        Spacer(Modifier.height(10.dp))
        Text(stringResource(R.string.now_chatting_with, p.username), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
        Text(partnerLine(p), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (p.interests.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            InterestChips(p.interests)
        }
    }
}

