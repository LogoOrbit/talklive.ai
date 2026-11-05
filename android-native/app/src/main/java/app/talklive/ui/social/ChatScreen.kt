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
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.Reply
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Done
import androidx.compose.material.icons.rounded.DoneAll
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
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
    var actionsFor by remember { mutableStateOf<ChatMessage?>(null) }
    var editing by remember { mutableStateOf<ChatMessage?>(null) }
    var menuOpen by remember { mutableStateOf(false) }
    var confirm by remember { mutableStateOf<String?>(null) }
    val mutedSet by vm.muted.collectAsStateWithLifecycle()
    val playback by vm.playback.collectAsStateWithLifecycle()
    val voiceStates by vm.voice.collectAsStateWithLifecycle()
    val voiceState = voiceStates[clientId] ?: "off"
    val context = androidx.compose.ui.platform.LocalContext.current
    val recorder = remember { app.talklive.voice.VoiceRecorder(context) }
    var recording by remember { mutableStateOf(false) }
    var recordMs by remember { mutableStateOf(0L) }
    var askVoice by remember { mutableStateOf(false) }
    LaunchedEffect(recording) {
        while (recording) {
            recordMs = recorder.elapsedMs
            if (recordMs >= app.talklive.voice.VoiceRecorder.MAX_MS) {
                recording = false
                recorder.stop()?.let { (bytes, ms) -> vm.sendVoice(clientId, bytes, ms) }
            }
            kotlinx.coroutines.delay(100)
        }
    }
    androidx.compose.runtime.DisposableEffect(Unit) { onDispose { recorder.cancel() } }
    val micPermission = androidx.activity.compose.rememberLauncherForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.RequestPermission(),
    ) { ok -> if (ok) recording = recorder.start() }
    fun startRecording() {
        val granted = androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.RECORD_AUDIO) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED
        if (granted) recording = recorder.start() else micPermission.launch(android.Manifest.permission.RECORD_AUDIO)
    }
    val clipboard = androidx.compose.ui.platform.LocalClipboardManager.current
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(clientId) { vm.openChat(clientId) }
    androidx.compose.runtime.DisposableEffect(clientId) { onDispose { vm.openChat(null) } }
    BackHandler(onBack = onBack)
    var showProfile by remember { mutableStateOf(false) }
    if (showProfile) PersonSheet(person, isFriend, onCall = { vm.call(person) }, onMessage = null, requested = clientId in sent, onAddFriend = { vm.sendRequest(clientId) }) { showProfile = false }
    // New message or typing: glide to the bottom.
    LaunchedEffect(messages.size, typing) { if (messages.isNotEmpty()) listState.animateScrollToItem(0) }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).imePadding()) {
        // Header.
        Surface(color = MaterialTheme.colorScheme.surface) {
            Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 4.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, null) }
                // Tap the face or name for their profile.
                Row(Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).clickable { showProfile = true }, verticalAlignment = Alignment.CenterVertically) {
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
                }
                if (isFriend) {
                    FilledTonalIconButton(onClick = { vm.call(person) }, enabled = person.online) { Icon(Icons.Rounded.Call, stringResource(R.string.call)) }
                }
                Box {
                    IconButton(onClick = { menuOpen = true }) { Icon(Icons.Rounded.MoreVert, null) }
                    androidx.compose.material3.DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                        val isMuted = clientId in mutedSet
                        val archivedSet by vm.archived.collectAsStateWithLifecycle()
                        val isArchived = clientId in archivedSet
                        androidx.compose.material3.DropdownMenuItem(text = { Text(stringResource(R.string.view_profile)) }, onClick = { menuOpen = false; showProfile = true })
                        androidx.compose.material3.DropdownMenuItem(
                            text = { Text(stringResource(if (isArchived) R.string.unarchive else R.string.archive)) },
                            onClick = { menuOpen = false; vm.setArchived(clientId, !isArchived) },
                        )
                        androidx.compose.material3.DropdownMenuItem(
                            text = { Text(stringResource(if (isMuted) R.string.unmute_chat else R.string.mute_chat)) },
                            onClick = { menuOpen = false; vm.setMuted(clientId, !isMuted) },
                        )
                        androidx.compose.material3.DropdownMenuItem(text = { Text(stringResource(R.string.clear_chat)) }, onClick = { menuOpen = false; confirm = "clear" })
                        androidx.compose.material3.DropdownMenuItem(text = { Text(stringResource(R.string.report), color = Danger) }, onClick = { menuOpen = false; confirm = "report" })
                        androidx.compose.material3.DropdownMenuItem(text = { Text(stringResource(R.string.block), color = Danger) }, onClick = { menuOpen = false; confirm = "block" })
                    }
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
                        onLongPress = { actionsFor = m },
                        playback = playback,
                        onPlay = { m.voiceId?.let { vm.play(clientId, it) } },
                    )
                }
            }
            if (messages.isEmpty() && !typing) item { EmptyChat(person) }
        }

        // Composer.
        val gates by vm.gates.collectAsStateWithLifecycle()
        val gate = if (isFriend) "open" else gates[clientId] ?: person.dm
        if (gate == "open" || gate == "one") {
            if (gate == "one") Text(
                stringResource(R.string.dm_one_message, person.displayName),
                style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
            )
            AnimatedVisibility(isFriend && voiceState == "received", enter = expandVertically() + fadeIn(), exit = shrinkVertically() + fadeOut()) {
                Row(
                    Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.primaryContainer).padding(start = 16.dp, end = 8.dp, top = 8.dp, bottom = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Rounded.Mic, null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.width(10.dp))
                    Text(stringResource(R.string.voice_asked, person.displayName), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.weight(1f))
                    androidx.compose.material3.TextButton(onClick = { vm.respondVoice(clientId, false) }) { Text(stringResource(R.string.not_now)) }
                    androidx.compose.material3.TextButton(onClick = { vm.respondVoice(clientId, true) }) { Text(stringResource(R.string.allow)) }
                }
            }
            AnimatedVisibility(editing != null, enter = expandVertically() + fadeIn(), exit = shrinkVertically() + fadeOut()) {
                Row(
                    Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface).padding(start = 16.dp, end = 4.dp, top = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Rounded.Edit, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(10.dp))
                    Text(stringResource(R.string.editing_message), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, modifier = Modifier.weight(1f))
                    IconButton(onClick = { editing = null; draft = "" }) { Icon(Icons.Rounded.Close, null) }
                }
            }
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
            val micTap = {
                when (voiceState) {
                    "on" -> startRecording()
                    "sent" -> askVoice = true
                    "received" -> vm.respondVoice(clientId, true)
                    else -> askVoice = true
                }
            }
            if (recording) {
                Row(Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface).navigationBarsPadding().padding(horizontal = 12.dp, vertical = 8.dp)) {
                    RecordingBar(
                        ms = recordMs,
                        modifier = Modifier.weight(1f),
                        onCancel = { recording = false; recorder.cancel() },
                        onSend = {
                            recording = false
                            recorder.stop()?.let { (bytes, ms) -> vm.sendVoice(clientId, bytes, ms) }
                        },
                    )
                }
            } else {
                val actions = buildList {
                    if (isFriend) add(app.talklive.ui.chat.ChatAction(Icons.Rounded.Call, stringResource(R.string.call), enabled = person.online, onClick = { vm.call(person) }))
                    if (isFriend) add(app.talklive.ui.chat.ChatAction(Icons.Rounded.Mic, stringResource(R.string.voice_message_short), onClick = micTap))
                }
                app.talklive.ui.chat.Composer(
                    draft = draft,
                    onDraft = { draft = it; if (it.isNotBlank()) vm.typing(clientId) },
                    onSend = {
                        val e = editing
                        if (e != null) vm.edit(clientId, e.id, draft) else vm.send(clientId, draft, replyTo?.id)
                        draft = ""
                        replyTo = null
                        editing = null
                        scope.launch { listState.animateScrollToItem(0) }
                    },
                    onGif = if (editing == null) ({ g -> vm.sendGif(clientId, g); scope.launch { listState.animateScrollToItem(0) } }) else null,
                    actions = actions,
                    idleTrailing = if (isFriend && editing == null) ({
                        Box(
                            Modifier.size(48.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer).clickable { micTap() },
                            contentAlignment = Alignment.Center,
                        ) { Icon(Icons.Rounded.Mic, stringResource(R.string.voice_record), tint = MaterialTheme.colorScheme.primary) }
                    }) else null,
                )
            }
        } else {
            Surface(color = MaterialTheme.colorScheme.surface) {
                Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        stringResource(
                            when {
                                gate == "accept" -> R.string.dm_accept_to_reply
                                gate == "waiting" || clientId in sent -> R.string.waiting_accept
                                else -> R.string.add_to_message
                            },
                            person.displayName,
                        ),
                        style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f),
                    )
                    if (gate == "accept" || (gate != "waiting" && clientId !in sent)) {
                        Spacer(Modifier.width(12.dp))
                        Box(
                            Modifier.clip(CircleShape).background(BrandGradient)
                                .clickable { if (gate == "accept") vm.respond(clientId, true) else vm.sendRequest(clientId) }
                                .padding(horizontal = 18.dp, vertical = 10.dp),
                        ) { Text(stringResource(if (gate == "accept") R.string.accept else R.string.add_friend), color = Color.White, style = MaterialTheme.typography.labelLarge) }
                    }
                }
            }
        }
    }

    if (askVoice) {
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { askVoice = false },
            icon = { Icon(Icons.Rounded.Mic, null) },
            title = { Text(stringResource(R.string.voice_title)) },
            text = { Text(stringResource(if (voiceState == "sent") R.string.voice_waiting else R.string.voice_ask_body, person.displayName)) },
            confirmButton = {
                androidx.compose.material3.TextButton(onClick = { if (voiceState != "sent") vm.requestVoice(clientId); askVoice = false }) {
                    Text(stringResource(if (voiceState == "sent") R.string.ok else R.string.voice_ask))
                }
            },
            dismissButton = { if (voiceState != "sent") androidx.compose.material3.TextButton(onClick = { askVoice = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }

    actionsFor?.let { m ->
        MessageActions(
            m,
            onDismiss = { actionsFor = null },
            onReact = { e -> vm.react(clientId, m.id, e) },
            onReply = { replyTo = m },
            onCopy = { clipboard.setText(androidx.compose.ui.text.AnnotatedString(m.text)) },
            onEdit = if (m.mine && m.text.isNotBlank() && m.gifUrl == null && m.voiceMs == null) ({ editing = m; replyTo = null; draft = m.text }) else null,
            onDelete = if (m.mine) ({ vm.delete(clientId, m.id) }) else null,
        )
    }
    confirm?.let { what ->
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { confirm = null },
            title = {
                Text(
                    when (what) {
                        "clear" -> stringResource(R.string.clear_chat_title)
                        "report" -> stringResource(R.string.report_title)
                        else -> stringResource(R.string.block_title, person.displayName)
                    },
                )
            },
            text = {
                Text(
                    when (what) {
                        "clear" -> stringResource(R.string.clear_chat_body)
                        "report" -> stringResource(R.string.report_body)
                        else -> stringResource(R.string.block_body)
                    },
                )
            },
            confirmButton = {
                androidx.compose.material3.TextButton(onClick = {
                    when (what) {
                        "clear" -> vm.clearChat(clientId)
                        "report" -> { vm.report(clientId, "profile"); onBack() }
                        else -> { vm.block(clientId); onBack() }
                    }
                    confirm = null
                }) {
                    Text(
                        when (what) { "clear" -> stringResource(R.string.clear_chat); "report" -> stringResource(R.string.report); else -> stringResource(R.string.block) },
                        color = Danger,
                    )
                }
            },
            dismissButton = { androidx.compose.material3.TextButton(onClick = { confirm = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

/** Red dot, timer, cancel and send while a voice message records. */
@Composable
private fun RecordingBar(ms: Long, modifier: Modifier, onCancel: () -> Unit, onSend: () -> Unit) {
    val t = rememberInfiniteTransition(label = "rec")
    val a by t.animateFloat(0.3f, 1f, infiniteRepeatable(tween(600), RepeatMode.Reverse), label = "dot")
    Row(
        modifier.heightIn(min = 48.dp).clip(RoundedCornerShape(24.dp)).background(MaterialTheme.colorScheme.background).padding(start = 8.dp, end = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onCancel) { Icon(Icons.Rounded.Close, stringResource(R.string.cancel), tint = Danger) }
        Box(Modifier.size(10.dp).clip(CircleShape).background(Danger.copy(alpha = a)))
        Spacer(Modifier.width(10.dp))
        Text("%d:%02d".format(ms / 60000, (ms / 1000) % 60), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
        Box(Modifier.size(40.dp).clip(CircleShape).background(BrandGradient).clickable(onClick = onSend), contentAlignment = Alignment.Center) {
            Icon(Icons.AutoMirrored.Rounded.Send, stringResource(R.string.send), tint = Color.White, modifier = Modifier.size(20.dp))
        }
    }
}

private val DM_REACTIONS = listOf("👍", "❤️", "😂", "😮", "😢", "🔥")

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
private fun MessageActions(
    m: ChatMessage,
    onDismiss: () -> Unit,
    onReact: (String) -> Unit,
    onReply: () -> Unit,
    onCopy: () -> Unit,
    onEdit: (() -> Unit)?,
    onDelete: (() -> Unit)?,
) {
    androidx.compose.material3.ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(bottom = 12.dp)) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                DM_REACTIONS.forEach { e ->
                    Box(
                        Modifier.size(48.dp).clip(CircleShape)
                            .background(if (m.myReaction == e) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface)
                            .clickable { onReact(e); onDismiss() },
                        contentAlignment = Alignment.Center,
                    ) { Text(e, style = MaterialTheme.typography.headlineSmall) }
                }
            }
            Spacer(Modifier.height(8.dp))
            SheetAction(Icons.AutoMirrored.Rounded.Reply, stringResource(R.string.reply)) { onReply(); onDismiss() }
            if (m.text.isNotBlank()) SheetAction(Icons.Rounded.ContentCopy, stringResource(R.string.copy)) { onCopy(); onDismiss() }
            onEdit?.let { SheetAction(Icons.Rounded.Edit, stringResource(R.string.edit)) { it(); onDismiss() } }
            onDelete?.let { SheetAction(Icons.Rounded.Delete, stringResource(R.string.delete), Danger) { it(); onDismiss() } }
        }
    }
}

@Composable
private fun SheetAction(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, tint: Color = MaterialTheme.colorScheme.onBackground, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 24.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = tint)
        Spacer(Modifier.width(18.dp))
        Text(label, style = MaterialTheme.typography.titleMedium, color = tint)
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
    playback: app.talklive.voice.Playback? = null,
    onPlay: (() -> Unit)? = null,
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
                        m.voiceMs != null -> Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.width(200.dp)) {
                            val mine = playback?.takeIf { it.id == m.voiceId }
                            Box(
                                Modifier.size(36.dp).clip(CircleShape).background(fg.copy(alpha = 0.18f))
                                    .then(if (onPlay != null && m.voiceId != null) Modifier.clickable(onClick = onPlay) else Modifier),
                                contentAlignment = Alignment.Center,
                            ) {
                                when {
                                    mine?.loading == true -> androidx.compose.material3.CircularProgressIndicator(Modifier.size(18.dp), color = fg, strokeWidth = 2.dp)
                                    mine?.playing == true -> Icon(Icons.Rounded.Pause, null, tint = fg)
                                    else -> Icon(Icons.Rounded.PlayArrow, null, tint = fg)
                                }
                            }
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                androidx.compose.material3.LinearProgressIndicator(
                                    progress = { mine?.progress ?: 0f },
                                    modifier = Modifier.fillMaxWidth().height(4.dp).clip(CircleShape),
                                    color = fg, trackColor = fg.copy(alpha = 0.25f), drawStopIndicator = {},
                                )
                                Spacer(Modifier.height(4.dp))
                                Text("%d:%02d".format(m.voiceMs / 60000, (m.voiceMs / 1000) % 60), color = fg.copy(alpha = 0.8f), style = MaterialTheme.typography.labelMedium)
                            }
                        }
                        else -> Text(m.text, color = fg, style = MaterialTheme.typography.bodyLarge)
                    }
                    if (m.edited) Text(stringResource(R.string.edited), color = fg.copy(alpha = 0.7f), style = MaterialTheme.typography.labelMedium)
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
                        Text((m.failReason?.get() ?: stringResource(R.string.not_sent)) + " · " + stringResource(R.string.tap_retry), style = MaterialTheme.typography.labelMedium, color = Danger)
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
    android.text.format.DateUtils.isToday(ts) || android.text.format.DateUtils.isToday(ts + android.text.format.DateUtils.DAY_IN_MILLIS) ->
        android.text.format.DateUtils.getRelativeTimeSpanString(ts, System.currentTimeMillis(), android.text.format.DateUtils.DAY_IN_MILLIS).toString()
    else -> SimpleDateFormat("EEE, d MMM", Locale.getDefault()).format(Date(ts))
}

/** A friend's (or someone met's) profile: picture, name, ID, country, presence, and quick actions. */
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
internal fun PersonSheet(
    person: Person,
    isFriend: Boolean,
    onCall: () -> Unit,
    onMessage: (() -> Unit)?,
    /** Not friends yet: Add friend (or Request sent once asked). */
    requested: Boolean = false,
    onAddFriend: (() -> Unit)? = null,
    /** Someone you talked to on a call can be called back before being friends. */
    canCall: Boolean = isFriend,
    onDismiss: () -> Unit,
) {
    androidx.compose.material3.ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = androidx.compose.material3.rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.background,
    ) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(androidx.compose.foundation.rememberScrollState()).navigationBarsPadding().padding(horizontal = 24.dp).padding(bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            PersonAvatar(person, 112.dp)
            Spacer(Modifier.height(14.dp))
            Text(person.displayName, style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground)
            app.talklive.ui.components.CopyIdChip(person.friendId, Modifier.padding(top = 8.dp))
            if (person.nickname != null && person.nickname != person.username) {
                Text(person.username, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(presence(person), style = MaterialTheme.typography.labelLarge, color = if (person.online) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
            Spacer(Modifier.height(16.dp))
            Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(vertical = 6.dp)) {
                    person.countryCode?.let { cc ->
                        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(flag(cc) ?: "🌍", style = MaterialTheme.typography.titleMedium)
                            Spacer(Modifier.width(12.dp))
                            Text(java.util.Locale("", cc).displayCountry, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface)
                        }
                    }
                    app.talklive.ui.animals.animalById(person.animal)?.let { a ->
                        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("✨", style = MaterialTheme.typography.titleMedium)
                            Spacer(Modifier.width(12.dp))
                            Text(a.name + if (a.trait.isNotBlank()) " · ${a.trait}" else "", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }
            }
            Spacer(Modifier.height(20.dp))
            if (!isFriend && onAddFriend != null) {
                if (requested) androidx.compose.material3.OutlinedButton(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth().height(56.dp), shape = CircleShape) {
                    Icon(Icons.Rounded.Check, null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.request_sent))
                } else app.talklive.ui.components.PrimaryButton(stringResource(R.string.add_friend), onClick = onAddFriend, icon = Icons.Rounded.PersonAdd)
                Spacer(Modifier.height(12.dp))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                if (canCall) app.talklive.ui.components.PrimaryButton(stringResource(R.string.call), onClick = { onDismiss(); onCall() }, enabled = person.online, icon = Icons.Rounded.Call, modifier = Modifier.weight(1f))
                if (onMessage != null) androidx.compose.material3.OutlinedButton(onClick = { onDismiss(); onMessage() }, modifier = Modifier.weight(1f).height(56.dp), shape = CircleShape) {
                    Text(stringResource(R.string.message))
                }
            }
        }
    }
}
