package app.talklive.ui.social

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
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
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.Reply
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Done
import androidx.compose.material.icons.rounded.DoneAll
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.talklive.R
import app.talklive.social.ChatMessage
import app.talklive.social.MsgStatus
import app.talklive.social.Person
import app.talklive.ui.components.BrandGradient
import app.talklive.ui.theme.Danger
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlin.math.roundToInt

@Composable
fun ChatScreen(vm: SocialViewModel, clientId: String, onBack: () -> Unit) {
    val threads by vm.threads.collectAsStateWithLifecycle()
    val typingSet by vm.typing.collectAsStateWithLifecycle()
    val friends by vm.friends.collectAsStateWithLifecycle()
    val history by vm.history.collectAsStateWithLifecycle()
    val sent by vm.sent.collectAsStateWithLifecycle()
    val person: Person = friends.firstOrNull { it.clientId == clientId }
        ?: history.firstOrNull { it.clientId == clientId }
        ?: Person(clientId, "", null, null, null, null, false, null, null)
    val isFriend = friends.any { it.clientId == clientId }
    val messages = threads[clientId].orEmpty()
    val typing = clientId in typingSet
    var draft by rememberSaveable(clientId) { mutableStateOf("") }
    var replyTo by remember { mutableStateOf<ChatMessage?>(null) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(clientId) { vm.openChat(clientId) }
    androidx.compose.runtime.DisposableEffect(clientId) { onDispose { vm.openChat(null) } }
    BackHandler(onBack = onBack)
    // New message or typing: glide to the bottom.
    LaunchedEffect(messages.size, typing) { if (messages.isNotEmpty()) listState.animateScrollToItem(0) }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).imePadding()) {
        // Header.
        Surface(color = MaterialTheme.colorScheme.surface) {
            Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 4.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, null) }
                PersonAvatar(person, 40.dp)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(person.displayName, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(
                        if (typing) stringResource(R.string.typing) else presence(person),
                        style = MaterialTheme.typography.labelMedium,
                        color = if (typing || person.online) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (isFriend) {
                    FilledTonalIconButton(onClick = { vm.call(person) }, enabled = person.online) { Icon(Icons.Rounded.Call, stringResource(R.string.call)) }
                    Spacer(Modifier.width(8.dp))
                }
            }
        }

        // Messages, newest at the bottom.
        val newestFirst = messages.asReversed()
        val byId = remember(messages) { messages.associateBy { it.id } }
        val lastMineId = messages.lastOrNull { it.mine }?.id
        LazyColumn(
            state = listState,
            reverseLayout = true,
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            if (typing) item(key = "typing") { TypingBubble() }
            itemsIndexed(newestFirst, key = { _, m -> m.id }) { i, m ->
                val older = newestFirst.getOrNull(i + 1)
                val newer = newestFirst.getOrNull(i - 1)
                Column(Modifier.animateItem()) {
                    if (older == null || !sameDay(older.ts, m.ts)) DaySeparator(m.ts)
                    MessageBubble(
                        m,
                        quoted = m.replyTo?.let { byId[it] },
                        firstInGroup = older == null || older.mine != m.mine || !sameDay(older.ts, m.ts),
                        lastInGroup = newer == null || newer.mine != m.mine,
                        showStatus = m.id == lastMineId || m.status == MsgStatus.Failed,
                        onReply = { replyTo = m },
                        onRetry = { vm.retry(clientId, m.id) },
                    )
                }
            }
            if (messages.isEmpty() && !typing) item { EmptyChat(person) }
        }

        // Composer.
        if (person.canMessage || isFriend) {
            AnimatedVisibility(replyTo != null, enter = expandVertically() + fadeIn(), exit = shrinkVertically() + fadeOut()) {
                replyTo?.let { r ->
                    Row(
                        Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface).padding(start = 16.dp, end = 4.dp, top = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(Modifier.width(3.dp).height(36.dp).clip(CircleShape).background(BrandGradient))
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(if (r.mine) stringResource(R.string.you) else person.displayName, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                            Text(preview(r), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
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
                        onValueChange = { draft = it.take(1000); if (it.isNotBlank()) vm.typing(clientId) },
                        textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                        maxLines = 5,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                Spacer(Modifier.width(8.dp))
                val canSend = draft.isNotBlank()
                AnimatedVisibility(canSend, enter = scaleIn(spring(dampingRatio = 0.5f)) + fadeIn(), exit = scaleOut() + fadeOut()) {
                    Box(
                        Modifier.size(48.dp).clip(CircleShape).background(BrandGradient).clickable {
                            vm.send(clientId, draft, replyTo?.id)
                            draft = ""
                            replyTo = null
                            scope.launch { listState.animateScrollToItem(0) }
                        },
                        contentAlignment = Alignment.Center,
                    ) { Icon(Icons.AutoMirrored.Rounded.Send, stringResource(R.string.send), tint = Color.White) }
                }
            }
        } else {
            Surface(color = MaterialTheme.colorScheme.surface) {
                Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        stringResource(if (clientId in sent) R.string.waiting_accept else R.string.add_to_message, person.displayName),
                        style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f),
                    )
                    if (clientId !in sent) {
                        Spacer(Modifier.width(12.dp))
                        Box(
                            Modifier.clip(CircleShape).background(BrandGradient).clickable { vm.sendRequest(clientId) }.padding(horizontal = 18.dp, vertical = 10.dp),
                        ) { Text(stringResource(R.string.add_friend), color = Color.White, style = MaterialTheme.typography.labelLarge) }
                    }
                }
            }
        }
    }
}

@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
internal fun MessageBubble(
    m: ChatMessage,
    quoted: ChatMessage?,
    firstInGroup: Boolean,
    lastInGroup: Boolean,
    showStatus: Boolean,
    onReply: () -> Unit,
    onRetry: () -> Unit,
    onLongPress: (() -> Unit)? = null,
) {
    val haptics = LocalHapticFeedback.current
    val density = LocalDensity.current
    val trigger = with(density) { 64.dp.toPx() }
    val drag = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val big = 18.dp
    val small = 6.dp
    val shape = if (m.mine) {
        RoundedCornerShape(big, if (firstInGroup) big else small, if (lastInGroup) small else small, big)
    } else {
        RoundedCornerShape(if (firstInGroup) big else small, big, big, if (lastInGroup) small else small)
    }

    Column(
        Modifier.fillMaxWidth().padding(top = if (firstInGroup) 8.dp else 0.dp),
        horizontalAlignment = if (m.mine) Alignment.End else Alignment.Start,
    ) {
        Box(contentAlignment = Alignment.CenterStart) {
            // Reply hint revealed by the swipe.
            Icon(
                Icons.AutoMirrored.Rounded.Reply, null,
                tint = MaterialTheme.colorScheme.primary.copy(alpha = (drag.value / trigger).coerceIn(0f, 1f)),
                modifier = Modifier.padding(start = 4.dp).size(22.dp),
            )
            Box(
                Modifier
                    .offset { IntOffset(drag.value.roundToInt(), 0) }
                    .pointerInput(m.id) {
                        var fired = false
                        detectHorizontalDragGestures(
                            onDragEnd = { scope.launch { drag.animateTo(0f, spring(dampingRatio = 0.6f)) }; fired = false },
                            onDragCancel = { scope.launch { drag.animateTo(0f) }; fired = false },
                        ) { _, delta ->
                            val next = (drag.value + delta * 0.6f).coerceIn(0f, trigger * 1.3f)
                            scope.launch { drag.snapTo(next) }
                            if (!fired && next >= trigger) {
                                fired = true
                                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                                onReply()
                            }
                        }
                    }
                    .widthIn(max = 300.dp)
                    .clip(shape)
                    .then(if (m.mine) Modifier.background(BrandGradient) else Modifier.background(MaterialTheme.colorScheme.surface))
                    .then(
                        when {
                            m.status == MsgStatus.Failed -> Modifier.clickable(onClick = onRetry)
                            onLongPress != null -> Modifier.combinedClickable(onClick = {}, onLongClick = {
                                haptics.performHapticFeedback(HapticFeedbackType.LongPress); onLongPress()
                            })
                            else -> Modifier
                        },
                    ),
            ) {
                Column(Modifier.padding(horizontal = 14.dp, vertical = 9.dp)) {
                    val fg = if (m.mine) Color.White else MaterialTheme.colorScheme.onSurface
                    quoted?.let { q ->
                        Row(Modifier.padding(bottom = 6.dp).clip(RoundedCornerShape(8.dp)).background(fg.copy(alpha = 0.12f)).padding(8.dp)) {
                            Text(preview(q), color = fg.copy(alpha = 0.85f), style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        }
                    }
                    when {
                        m.gifUrl != null -> AsyncImage(
                            model = m.gifUrl, contentDescription = "GIF", contentScale = ContentScale.Crop,
                            modifier = Modifier.width(220.dp).heightIn(min = 120.dp, max = 220.dp).clip(RoundedCornerShape(12.dp)),
                        )
                        m.voiceMs != null -> Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Mic, null, tint = fg)
                            Spacer(Modifier.width(6.dp))
                            Text(stringResource(R.string.voice_message, (m.voiceMs / 1000).toInt()), color = fg, style = MaterialTheme.typography.bodyLarge)
                        }
                        else -> Text(m.text, color = fg, style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }
        }
        val reactions = listOfNotNull(m.theirReaction, m.myReaction)
        if (reactions.isNotEmpty()) {
            Row(
                Modifier.padding(top = 2.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surface)
                    .padding(horizontal = 8.dp, vertical = 2.dp),
            ) { Text(reactions.distinct().joinToString(" "), style = MaterialTheme.typography.labelMedium) }
        }
        if (showStatus && m.mine) {
            Row(Modifier.padding(top = 3.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                when (m.status) {
                    MsgStatus.Failed -> {
                        Icon(Icons.Rounded.ErrorOutline, null, Modifier.size(14.dp), tint = Danger)
                        Spacer(Modifier.width(4.dp))
                        Text((m.failReason ?: stringResource(R.string.not_sent)) + " · " + stringResource(R.string.tap_retry), style = MaterialTheme.typography.labelMedium, color = Danger)
                    }
                    else -> {
                        Text(timeOf(m.ts), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.width(4.dp))
                        Icon(
                            when (m.status) {
                                MsgStatus.Sending -> Icons.Rounded.Schedule
                                MsgStatus.Sent -> Icons.Rounded.Done
                                else -> Icons.Rounded.DoneAll
                            },
                            null, Modifier.size(14.dp),
                            tint = if (m.status == MsgStatus.Seen) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

@Composable
internal fun TypingBubble() {
    val t = rememberInfiniteTransition(label = "typing")
    Row(
        Modifier.padding(top = 8.dp).clip(RoundedCornerShape(18.dp)).background(MaterialTheme.colorScheme.surface).padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        repeat(3) { i ->
            val a by t.animateFloat(0.3f, 1f, infiniteRepeatable(tween(500, delayMillis = i * 150), RepeatMode.Reverse), label = "d$i")
            Box(Modifier.size(8.dp).clip(CircleShape).background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = a)))
        }
    }
}

@Composable
internal fun DaySeparator(ts: Long) {
    Box(Modifier.fillMaxWidth().padding(vertical = 12.dp), contentAlignment = Alignment.Center) {
        Text(
            dayLabel(ts),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.clip(CircleShape).background(MaterialTheme.colorScheme.surface).padding(horizontal = 12.dp, vertical = 4.dp),
        )
    }
}

@Composable
private fun EmptyChat(p: Person) {
    Column(Modifier.fillMaxWidth().padding(vertical = 48.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        PersonAvatar(p, 88.dp, showOnline = false)
        Spacer(Modifier.height(12.dp))
        Text(p.displayName, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
        Text(stringResource(R.string.say_hi), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private fun preview(m: ChatMessage) = when {
    m.gifUrl != null -> "GIF"
    m.voiceMs != null -> "🎤 Voice message"
    else -> m.text
}

private fun timeOf(ts: Long) = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(ts))

private fun sameDay(a: Long, b: Long): Boolean {
    val ca = Calendar.getInstance().apply { timeInMillis = a }
    val cb = Calendar.getInstance().apply { timeInMillis = b }
    return ca.get(Calendar.YEAR) == cb.get(Calendar.YEAR) && ca.get(Calendar.DAY_OF_YEAR) == cb.get(Calendar.DAY_OF_YEAR)
}

private fun dayLabel(ts: Long): String = when {
    android.text.format.DateUtils.isToday(ts) -> "Today"
    android.text.format.DateUtils.isToday(ts + android.text.format.DateUtils.DAY_IN_MILLIS) -> "Yesterday"
    else -> SimpleDateFormat("EEE, d MMM", Locale.getDefault()).format(Date(ts))
}
