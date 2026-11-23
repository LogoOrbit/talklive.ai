package app.talklive.ui.social

import androidx.compose.animation.core.animateFloat
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.KeyboardArrowUp
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.talklive.R
import app.talklive.social.Story
import app.talklive.social.StoryGif
import app.talklive.social.StoryPerson
import app.talklive.ui.animals.AnimalAvatar
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

/** The same colours as the website (public/stories.js). */
private val StoryBgs: Map<String, List<Color>> = linkedMapOf(
    "blue" to listOf(Color(0xFF2A6FE8), Color(0xFF1D3F9E)),
    "purple" to listOf(Color(0xFF8B5CF6), Color(0xFF4C1D95)),
    "pink" to listOf(Color(0xFFEC4899), Color(0xFF9D174D)),
    "orange" to listOf(Color(0xFFF97316), Color(0xFFB45309)),
    "green" to listOf(Color(0xFF22C55E), Color(0xFF166534)),
    "teal" to listOf(Color(0xFF14B8A6), Color(0xFF0F766E)),
    "dark" to listOf(Color(0xFF1F2937), Color(0xFF030712)),
    "sunset" to listOf(Color(0xFFFB7185), Color(0xFFF59E0B)),
    "ocean" to listOf(Color(0xFF06B6D4), Color(0xFF4F46E5)),
    "berry" to listOf(Color(0xFFDB2777), Color(0xFF7C3AED)),
)
private fun bgBrush(key: String) = Brush.linearGradient(StoryBgs[key] ?: StoryBgs.getValue("blue"))

/** A story's background colour, for the inbox's story previews and the editor. */
fun storyBrush(key: String) = bgBrush(key)

/** The story colours, in picker order. */
val StoryBgKeys: List<String> get() = StoryBgs.keys.toList()
private val StoryRing = Brush.linearGradient(listOf(Color(0xFFF59E0B), Color(0xFFEC4899), Color(0xFF8B5CF6)))
private const val MAX_GIFS = 6
private const val MAX_TEXT = 700
private const val STORY_MS = 6000L
private val StoryEmojis = ("😀 😂 🤣 😊 😍 😘 😎 🤩 🥳 😇 🤗 🤔 😴 😭 😡 🤯 😱 🥺 😏 🙄 👋 👍 👏 🙌 🙏 💪 🤝 ✌️ 🤞 👀 " +
    "❤️ 🧡 💛 💚 💙 💜 🖤 💔 💕 💯 ✨ ⭐ 🔥 🎉 🎊 🎁 🎂 🍕 🍔 ☕ ⚽ 🏀 🎮 🎵 🎧 🎤 ✈️ 🚀 🌍 🌙 ☀️ 🌈 🌸 🌹 🐶 🐱 🦊 🐼 🦁 🐸 🦋 👻 🤖 👽").split(" ")

/**
 * "Your story" at the start of the row: a + to add one, or a ring when you have one.
 * While a story is being posted a ring fills around the face, one real step at a
 * time (waiting, sent, saved, published); red with a retry if it failed.
 */
@Composable
fun MyStoryBubble(me: StoryPerson?, upload: app.talklive.social.StoryUpload?, onAdd: () -> Unit, onOpen: () -> Unit, onRetry: () -> Unit = {}) {
    val has = me != null && me.stories.isNotEmpty()
    val failed = upload?.stage == app.talklive.social.StoryUpload.Stage.Failed
    val busy = upload != null && !failed && upload.stage != app.talklive.social.StoryUpload.Stage.Published
    val reduce = app.talklive.ui.theme.LocalReduceMotion.current
    val target = upload?.progress ?: 0f
    val progress by androidx.compose.animation.core.animateFloatAsState(
        target, if (reduce) androidx.compose.animation.core.snap() else androidx.compose.animation.core.tween(650, easing = androidx.compose.animation.core.FastOutSlowInEasing), label = "upload",
    )
    // A soft rotating highlight only while waiting on the network, so the ring never looks frozen.
    val spin = if (busy && !reduce) androidx.compose.animation.core.rememberInfiniteTransition(label = "spin")
        .animateFloat(0f, 360f, androidx.compose.animation.core.infiniteRepeatable(androidx.compose.animation.core.tween(1400, easing = androidx.compose.animation.core.LinearEasing)), label = "a") else null
    val accent = MaterialTheme.colorScheme.primary
    val track = MaterialTheme.colorScheme.outlineVariant
    val doneAlpha by androidx.compose.animation.core.animateFloatAsState(if (upload?.stage == app.talklive.social.StoryUpload.Stage.Published) 1f else 0f, label = "done")
    Column(
        Modifier.width(64.dp).clip(RoundedCornerShape(12.dp)).clickable { when { failed -> onRetry(); busy -> Unit; has -> onOpen(); else -> onAdd() } },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box {
            Box(Modifier.size(58.dp), contentAlignment = Alignment.Center) {
                androidx.compose.foundation.Canvas(Modifier.matchParentSize()) {
                    val stroke = 2.5.dp.toPx()
                    val inset = stroke / 2
                    val arcSize = androidx.compose.ui.geometry.Size(size.width - stroke, size.height - stroke)
                    val tl = androidx.compose.ui.geometry.Offset(inset, inset)
                    when {
                        upload != null -> {
                            drawArc(track, 0f, 360f, false, tl, arcSize, style = androidx.compose.ui.graphics.drawscope.Stroke(stroke))
                            val col = if (failed) Color(0xFFEF4444) else accent
                            drawArc(col, -90f, 360f * progress, false, tl, arcSize, style = androidx.compose.ui.graphics.drawscope.Stroke(stroke, cap = androidx.compose.ui.graphics.StrokeCap.Round))
                            spin?.let { a ->
                                drawArc(Brush.sweepGradient(listOf(Color.Transparent, Color.White.copy(alpha = 0.7f), Color.Transparent)), a.value, 50f, false, tl, arcSize,
                                    style = androidx.compose.ui.graphics.drawscope.Stroke(stroke, cap = androidx.compose.ui.graphics.StrokeCap.Round))
                            }
                            if (doneAlpha > 0f) drawArc(StoryRing, 0f, 360f, false, tl, arcSize, alpha = doneAlpha, style = androidx.compose.ui.graphics.drawscope.Stroke(stroke))
                        }
                        has -> drawArc(track, 0f, 360f, false, tl, arcSize, style = androidx.compose.ui.graphics.drawscope.Stroke(stroke))
                    }
                }
                AnimalAvatar(me?.animal, me?.name, 50.dp)
            }
            val badge = when { failed -> Color(0xFFEF4444); else -> MaterialTheme.colorScheme.primary }
            if (!busy) Box(
                Modifier.align(Alignment.BottomEnd).size(22.dp).clip(CircleShape).background(badge)
                    .border(2.dp, MaterialTheme.colorScheme.background, CircleShape).clickable(onClick = if (failed) onRetry else onAdd),
                contentAlignment = Alignment.Center,
            ) {
                if (failed) Icon(Icons.Rounded.Refresh, stringResource(R.string.story_retry), tint = Color.White, modifier = Modifier.size(14.dp))
                else Icon(Icons.Rounded.Add, stringResource(R.string.story_add), tint = Color.White, modifier = Modifier.size(15.dp))
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(
            stringResource(
                when (upload?.stage) {
                    null -> R.string.your_story
                    app.talklive.social.StoryUpload.Stage.Failed -> R.string.story_failed_short
                    app.talklive.social.StoryUpload.Stage.Published -> R.string.story_posted
                    else -> R.string.story_posting
                },
            ),
            style = MaterialTheme.typography.labelMedium,
            color = if (failed) Color(0xFFEF4444) else MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis,
        )
    }
}

/** A friend with a story: a coloured ring while there is something new. */
@Composable
fun FriendStoryBubble(p: StoryPerson, onOpen: () -> Unit) {
    Column(Modifier.width(64.dp).clip(RoundedCornerShape(12.dp)).clickable(onClick = onOpen), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            Modifier.size(58.dp).clip(CircleShape)
                .background(if (p.unseen) StoryRing else SolidColor(MaterialTheme.colorScheme.outlineVariant))
                .padding(2.5.dp).clip(CircleShape).background(MaterialTheme.colorScheme.background).padding(1.dp),
            contentAlignment = Alignment.Center,
        ) { AnimalAvatar(p.animal, p.name, 52.dp) }
        Spacer(Modifier.height(4.dp))
        Text(p.name, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/** A story as it looks: the colour, then GIFs, emoji and words where they were put. */
@Composable
private fun StoryCanvas(story: Story, modifier: Modifier = Modifier) {
    StoryLayersCanvas(bgBrush(story.bg), story.gifs, story.layers, story.text, modifier)
}

/** Full-screen story viewer: bars at the top, tap right/left to move, hold to pause. */
@Composable
fun StoryViewer(
    people: List<StoryPerson>,
    startPerson: Int,
    onSeen: (StoryPerson, Story) -> Unit,
    onDelete: (Story) -> Unit,
    onAdd: () -> Unit,
    onDismiss: () -> Unit,
    onLike: (StoryPerson, Story, Boolean) -> Unit = { _, _, _ -> },
    onReact: (StoryPerson, Story, String) -> Unit = { _, _, _ -> },
    onReply: (StoryPerson, Story, String) -> Unit = { _, _, _ -> },
    faceOf: (String) -> String? = { null },
) {
    var reply by remember { mutableStateOf("") }
    var replying by remember { mutableStateOf(false) }
    val replyFocus = remember { androidx.compose.ui.focus.FocusRequester() }
    val focus = androidx.compose.ui.platform.LocalFocusManager.current
    var pi by remember { mutableIntStateOf(startPerson.coerceIn(0, (people.size - 1).coerceAtLeast(0))) }
    var si by remember { mutableIntStateOf(people.getOrNull(pi)?.stories?.indexOfFirst { !it.seen }?.coerceAtLeast(0) ?: 0) }
    var progress by remember { mutableFloatStateOf(0f) }
    var paused by remember { mutableStateOf(false) }
    var showViews by remember { mutableStateOf(false) }
    val person = people.getOrNull(pi)
    val story = person?.stories?.getOrNull(si)
    fun next() {
        val p = people.getOrNull(pi) ?: return onDismiss()
        if (si < p.stories.size - 1) { si++; return }
        if (!p.mine) {
            val n = (pi + 1 until people.size).firstOrNull { !people[it].mine && people[it].stories.isNotEmpty() }
            if (n != null) { pi = n; si = 0; return }
        }
        onDismiss()
    }
    fun prev() { if (si > 0) si-- else progress = 0f }
    if (person == null || story == null) { LaunchedEffect(Unit) { onDismiss() }; return }
    fun sendReply() {
        val t = reply.trim()
        if (t.isEmpty()) return
        onReply(person, story, t)
        reply = ""; replying = false; focus.clearFocus()
    }
    // The heart pops when it is tapped (or a story is double-tapped).
    val heartPop by androidx.compose.animation.core.animateFloatAsState(if (story.liked) 1f else 0.9f, androidx.compose.animation.core.spring(dampingRatio = 0.35f, stiffness = 600f), label = "heart")
    LaunchedEffect(pi, si) {
        if (!person.mine && !story.seen) onSeen(person, story)
        progress = 0f
        var elapsed = 0L
        while (elapsed < STORY_MS) {
            delay(32)
            if (!paused && !showViews && !replying) elapsed += 32
            progress = elapsed / STORY_MS.toFloat()
        }
        next()
    }
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            StoryCanvas(story, Modifier.pointerInput(pi, si) {
                detectTapGestures(
                    onPress = { paused = true; tryAwaitRelease(); paused = false },
                    onTap = { o -> if (replying) { focus.clearFocus(); replying = false } else if (o.x < size.width * 0.33f) prev() else next() },
                    // Double tap likes a friend's story, as on Instagram.
                    onDoubleTap = { if (!person.mine && !story.liked) onLike(person, story, true) },
                )
            }.pointerInput(pi, si) {
                // Swipe up: your own story shows who saw it; a friend's opens the reply box with reactions.
                // Swipe down closes the viewer.
                var dy = 0f
                detectVerticalDragGestures(
                    onDragStart = { dy = 0f },
                    onVerticalDrag = { _, d -> dy += d },
                    onDragEnd = {
                        if (dy < -80f) { if (person.mine) showViews = true else { replying = true; replyFocus.requestFocus() } }
                        else if (dy > 160f) onDismiss()
                    },
                )
            })
            Column(Modifier.fillMaxWidth().background(Brush.verticalGradient(listOf(Color(0x88000000), Color.Transparent))).statusBarsPadding().padding(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    person.stories.forEachIndexed { k, _ ->
                        val f = when { k < si -> 1f; k == si -> progress; else -> 0f }
                        Box(Modifier.weight(1f).height(3.dp).clip(RoundedCornerShape(2.dp)).background(Color.White.copy(alpha = 0.35f))) {
                            Box(Modifier.fillMaxWidth(f.coerceIn(0f, 1f)).height(3.dp).background(Color.White))
                        }
                    }
                }
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AnimalAvatar(person.animal, person.name, 34.dp)
                    Spacer(Modifier.width(10.dp))
                    Text(if (person.mine) stringResource(R.string.your_story) else person.name, color = Color.White, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.width(8.dp))
                    Text(shortTime(story.ts), color = Color.White.copy(alpha = 0.75f), style = MaterialTheme.typography.bodySmall)
                    Spacer(Modifier.weight(1f))
                    IconButton(onClick = onDismiss) { Icon(Icons.Rounded.Close, stringResource(R.string.close), tint = Color.White) }
                }
            }
            if (person.mine) Row(
                Modifier.align(Alignment.BottomCenter).fillMaxWidth().background(Brush.verticalGradient(listOf(Color.Transparent, Color(0x99000000))))
                    .navigationBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Swipe up (or tap) for who saw it, like Instagram.
                Column(Modifier.clip(RoundedCornerShape(14.dp)).clickable { showViews = true }.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Rounded.KeyboardArrowUp, null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Visibility, null, tint = Color.White, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(story.viewers.size.toString(), color = Color.White, fontWeight = FontWeight.Bold)
                        if (story.likeCount > 0) {
                            Spacer(Modifier.width(10.dp))
                            Icon(Icons.Rounded.Favorite, null, tint = Color(0xFFFF3B5C), modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(story.likeCount.toString(), color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                Spacer(Modifier.weight(1f))
                StoryPill(stringResource(R.string.story_add), Icons.Rounded.Add) { onDismiss(); onAdd() }
                Spacer(Modifier.width(10.dp))
                StoryPill(stringResource(R.string.story_delete), Icons.Rounded.Delete) {
                    onDelete(story)
                    if (person.stories.size <= 1) onDismiss() else if (si >= person.stories.size - 1) si--
                }
            } else Column(
                Modifier.align(Alignment.BottomCenter).fillMaxWidth().background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xAA000000))))
                    .navigationBarsPadding().imePadding().padding(horizontal = 12.dp, vertical = 10.dp),
            ) {
                // Quick reactions, shown while replying (swipe up or tap the reply box), as on Instagram.
                androidx.compose.animation.AnimatedVisibility(replying) {
                    Row(Modifier.fillMaxWidth().padding(bottom = 10.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                        STORY_REACTIONS.forEach { e ->
                            Text(e, fontSize = 30.sp, modifier = Modifier.clip(CircleShape).clickable {
                                onReact(person, story, e); replying = false; focus.clearFocus()
                            }.padding(6.dp))
                        }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    androidx.compose.foundation.text.BasicTextField(
                        value = reply,
                        onValueChange = { reply = it.take(1000) },
                        singleLine = true,
                        textStyle = MaterialTheme.typography.bodyLarge.copy(color = Color.White),
                        cursorBrush = androidx.compose.ui.graphics.SolidColor(Color.White),
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(imeAction = androidx.compose.ui.text.input.ImeAction.Send),
                        keyboardActions = androidx.compose.foundation.text.KeyboardActions(onSend = { sendReply() }),
                        modifier = Modifier.weight(1f).focusRequester(replyFocus)
                            .onFocusChanged { replying = it.isFocused || reply.isNotEmpty() }
                            .border(1.dp, Color.White.copy(alpha = 0.7f), CircleShape).padding(horizontal = 16.dp, vertical = 12.dp),
                        decorationBox = { inner ->
                            Box {
                                if (reply.isEmpty()) Text(stringResource(R.string.story_reply_to, person.name), color = Color.White.copy(alpha = 0.75f), maxLines = 1)
                                inner()
                            }
                        },
                    )
                    Spacer(Modifier.width(6.dp))
                    if (reply.isNotBlank()) IconButton(onClick = { sendReply() }) {
                        Icon(Icons.AutoMirrored.Rounded.Send, stringResource(R.string.send), tint = Color.White)
                    } else IconButton(onClick = { onLike(person, story, !story.liked) }) {
                        Icon(
                            if (story.liked) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,
                            stringResource(R.string.story_like),
                            tint = if (story.liked) Color(0xFFFF3B5C) else Color.White,
                            modifier = Modifier.size(28.dp).graphicsLayer { scaleX = heartPop; scaleY = heartPop },
                        )
                    }
                }
            }
            if (showViews) Box(Modifier.fillMaxSize().background(Color(0x66000000)).clickable { showViews = false }) {
                Column(
                    Modifier.align(Alignment.BottomCenter).fillMaxWidth().fillMaxHeight(0.6f).clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                        .background(MaterialTheme.colorScheme.surface).clickable(enabled = false) {}.navigationBarsPadding().padding(20.dp),
                ) {
                    Box(Modifier.align(Alignment.CenterHorizontally).size(40.dp, 4.dp).clip(CircleShape).background(MaterialTheme.colorScheme.outlineVariant))
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Visibility, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(stringResource(R.string.story_seen_by) + " · " + story.viewers.size, style = MaterialTheme.typography.titleMedium)
                        if (story.likeCount > 0) {
                            Spacer(Modifier.width(12.dp))
                            Icon(Icons.Rounded.Favorite, null, tint = Color(0xFFFF3B5C), modifier = Modifier.size(18.dp))
                            Text(" " + story.likeCount, style = MaterialTheme.typography.titleMedium)
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                    if (story.viewers.isEmpty()) Text(stringResource(R.string.story_no_views), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    androidx.compose.foundation.lazy.LazyColumn {
                        items(story.viewers.size) { k ->
                            val v = story.viewers[k]
                            Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                AnimalAvatar(faceOf(v.clientId), v.name, 36.dp)
                                Spacer(Modifier.width(12.dp))
                                Text(v.name, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f), maxLines = 1)
                                v.reaction?.let { Text(it, fontSize = 20.sp); Spacer(Modifier.width(8.dp)) }
                                if (v.liked) Icon(Icons.Rounded.Favorite, null, tint = Color(0xFFFF3B5C), modifier = Modifier.size(20.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

/** The quick reactions under a friend's story (the server accepts exactly these). */
val STORY_REACTIONS = listOf("😂", "😮", "😍", "😢", "👏", "🔥", "🎉", "💯")

@Composable
private fun StoryPill(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Row(
        Modifier.clip(CircleShape).background(Color.White.copy(alpha = 0.2f)).clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = Color.White, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(6.dp))
        Text(label, color = Color.White, fontWeight = FontWeight.Bold)
    }
}

