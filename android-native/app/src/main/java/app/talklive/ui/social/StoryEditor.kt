package app.talklive.ui.social

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.calculatePan
import androidx.compose.foundation.gestures.calculateRotation
import androidx.compose.foundation.gestures.calculateZoom
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChanged
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.talklive.R
import app.talklive.social.StoryDraft
import app.talklive.social.StoryGif
import app.talklive.social.StoryLayer
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin

// Sizes are fractions of the story's width, the same on every phone and on the website.
private const val TEXT_FRACTION = 0.075f
private const val EMOJI_FRACTION = 0.17f
private const val GIF_FRACTION = 0.4f

/** The text colours the server accepts (server/stories.js TEXT_COLORS). */
val StoryTextColors = listOf("#ffffff", "#111111", "#facc15", "#ef4444", "#3b82f6", "#22c55e", "#ec4899", "#a855f7", "#f97316")

private fun hexColor(h: String): Color = runCatching { Color(android.graphics.Color.parseColor(h)) }.getOrDefault(Color.White)

/** Something placed on a story, positioned by its centre, then sized and turned about it. */
@Composable
private fun Placed(x: Float, y: Float, s: Float, r: Float, w: Float, h: Float, gestures: Modifier = Modifier, content: @Composable () -> Unit) {
    var size by remember { mutableStateOf(IntSize.Zero) }
    Box(
        Modifier
            .offset { IntOffset((x * w - size.width / 2f).roundToInt(), (y * h - size.height / 2f).roundToInt()) }
            .onSizeChanged { size = it }
            .graphicsLayer { scaleX = s; scaleY = s; rotationZ = r }
            .then(gestures),
    ) { content() }
}

/** Words on a story: big, bold, with a soft shadow, or on a pill of their colour. */
@Composable
fun StoryTextView(l: StoryLayer, storyWidth: Dp) {
    val c = hexColor(l.c)
    val onPill = if (c.luminance() > 0.6f) Color(0xFF111111) else Color.White
    val size = (storyWidth.value * TEXT_FRACTION).sp
    Text(
        l.text,
        color = if (l.b) onPill else c,
        fontSize = size, lineHeight = size * 1.2f, fontWeight = FontWeight.ExtraBold, textAlign = TextAlign.Center,
        style = if (l.b) TextStyle.Default else TextStyle(shadow = Shadow(Color(0x66000000), Offset(0f, 3f), 10f)),
        modifier = Modifier.widthIn(max = storyWidth * 0.82f)
            .then(if (l.b) Modifier.clip(RoundedCornerShape(12.dp)).background(c).padding(horizontal = 12.dp, vertical = 6.dp) else Modifier),
    )
}

@Composable
private fun StoryEmojiView(l: StoryLayer, storyWidth: Dp) {
    Text(l.text, fontSize = (storyWidth.value * EMOJI_FRACTION).sp)
}

@Composable
private fun StoryGifView(g: StoryGif, storyWidth: Dp) {
    val ratio = if (g.w > 0 && g.h > 0) g.h.toFloat() / g.w else 0.75f
    val gw = storyWidth * GIF_FRACTION
    AsyncImage(
        model = g.url, contentDescription = "GIF", contentScale = ContentScale.Crop,
        modifier = Modifier.width(gw).height(gw * ratio).clip(RoundedCornerShape(10.dp)),
    )
}

/** A story as everyone sees it: the colour, then GIFs, emoji and words where they were put. */
@Composable
fun StoryLayersCanvas(bg: Brush, gifs: List<StoryGif>, layers: List<StoryLayer>, legacyText: String?, modifier: Modifier = Modifier) {
    BoxWithConstraints(modifier.fillMaxSize().background(bg)) {
        val w = constraints.maxWidth.toFloat()
        val h = constraints.maxHeight.toFloat()
        gifs.forEach { g -> Placed(g.x, g.y, g.s, g.r, w, h) { StoryGifView(g, maxWidth) } }
        layers.forEach { l -> Placed(l.x, l.y, l.s, l.r, w, h) { if (l.kind == "emoji") StoryEmojiView(l, maxWidth) else StoryTextView(l, maxWidth) } }
        // Stories from before layers: the words in the middle.
        if (layers.isEmpty() && !legacyText.isNullOrBlank()) Text(
            legacyText, color = Color.White, fontSize = (maxWidth.value * TEXT_FRACTION).sp, fontWeight = FontWeight.ExtraBold,
            lineHeight = (maxWidth.value * TEXT_FRACTION * 1.2f).sp, textAlign = TextAlign.Center,
            modifier = Modifier.align(Alignment.Center).padding(horizontal = 28.dp),
        )
    }
}

/**
 * One finger moves it, two fingers size and turn it, a tap edits it. Movement arrives in the
 * thing's own (sized and turned) frame and is turned back into the story's frame here.
 */
private fun Modifier.layerGestures(
    key: Any,
    scale: () -> Float,
    turn: () -> Float,
    onStart: () -> Unit,
    onMove: (dx: Float, dy: Float, zoom: Float, rot: Float) -> Unit,
    onEnd: () -> Unit,
    onTap: () -> Unit,
): Modifier = pointerInput(key) {
    awaitEachGesture {
        val down = awaitFirstDown(requireUnconsumed = false)
        var travel = 0f
        var started = false
        var last = down.uptimeMillis
        do {
            val ev = awaitPointerEvent()
            val zoom = ev.calculateZoom()
            val rot = ev.calculateRotation()
            val pan = ev.calculatePan()
            last = ev.changes.firstOrNull()?.uptimeMillis ?: last
            travel += pan.getDistance() + abs(zoom - 1f) * 60f + abs(rot) * 2f
            if (!started && travel > viewConfiguration.touchSlop) { started = true; onStart() }
            if (started) {
                val sc = scale()
                val a = Math.toRadians(turn().toDouble())
                val dx = ((pan.x * cos(a) - pan.y * sin(a)) * sc).toFloat()
                val dy = ((pan.x * sin(a) + pan.y * cos(a)) * sc).toFloat()
                onMove(dx, dy, zoom, rot)
                ev.changes.forEach { if (it.positionChanged()) it.consume() }
            }
        } while (ev.changes.any { it.pressed })
        if (started) onEnd() else if (last - down.uptimeMillis < 450) onTap()
    }
}

private val StoryEmojiPicks = (
    "😀 😂 🤣 😊 😍 🥰 😘 😎 🤩 🥳 😇 🤗 🤔 😴 😭 😡 🤯 😱 🥺 😏 🙄 👋 👍 👏 🙌 🙏 💪 🤝 ✌️ 🤞 👀 " +
        "❤️ 🧡 💛 💚 💙 💜 🖤 💔 💕 💯 ✨ ⭐ 🔥 🎉 🎊 🎁 🎂 🍕 🍔 ☕ 🍺 ⚽ 🏀 🎮 🎵 🎧 🎤 📷 ✈️ 🚀 🌍 🌙 ☀️ 🌈 🌸 🌹 " +
        "🐶 🐱 🦊 🐼 🦁 🐸 🦋 👻 💀 🤖 👽 💩"
    ).split(" ")

/**
 * Writing a story, like Instagram's: tap anywhere (or Aa) to write, then move words, emoji and
 * GIFs with a finger, pinch to size and turn them, tap words to change them, and drop anything
 * on the bin to remove it. Typing happens on its own layer above the keyboard, so nothing hides.
 */
@Composable
fun StoryComposer(onPost: (StoryDraft) -> Unit, onDismiss: () -> Unit) {
    val saved = remember { app.talklive.social.StoryDrafts.load() }
    var bg by remember { mutableStateOf(saved?.bg?.takeIf { it in StoryBgKeys } ?: StoryBgKeys.random()) }
    val gifs = remember { mutableStateListOf<StoryGif>().apply { saved?.gifs?.let { addAll(it) } } }
    val layers = remember {
        mutableStateListOf<StoryLayer>().apply {
            saved?.layers?.let { addAll(it) }
            // A draft from before layers: its words become one text in the middle.
            saved?.text?.takeIf { it.isNotBlank() }?.let { add(StoryLayer(StoryLayer.nextId(), "text", it, 0.5f, 0.45f)) }
        }
    }
    var panel by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var confirmLeave by remember { mutableStateOf(false) }
    // The text being typed: a new one or one tapped to change.
    var editing by remember { mutableStateOf<StoryLayer?>(null) }
    var editText by remember { mutableStateOf("") }
    var editColor by remember { mutableStateOf("#ffffff") }
    var editPill by remember { mutableStateOf(false) }
    var dragging by remember { mutableStateOf(false) }
    var overBin by remember { mutableStateOf(false) }
    val haptics = LocalHapticFeedback.current

    fun draft() = StoryDraft("", bg, gifs.toList(), layers.toList())
    LaunchedEffect(bg, gifs.toList(), layers.toList()) { app.talklive.social.StoryDrafts.save(draft()) }
    fun startText(l: StoryLayer?) {
        panel = null
        editing = l ?: StoryLayer(StoryLayer.nextId(), "text", "", 0.5f, 0.42f)
        editText = l?.text.orEmpty(); editColor = l?.c ?: "#ffffff"; editPill = l?.b ?: false
    }
    fun finishText() {
        val e = editing ?: return
        val i = layers.indexOfFirst { it.id == e.id }
        val t = editText.trim()
        when {
            t.isEmpty() -> if (i >= 0) layers.removeAt(i)
            i >= 0 -> layers[i] = e.copy(text = t.take(300), c = editColor, b = editPill)
            else -> layers.add(e.copy(text = t.take(300), c = editColor, b = editPill))
        }
        editing = null
    }
    fun requestClose() {
        when {
            editing != null -> finishText()
            panel != null -> panel = null
            draft().isEmpty -> { app.talklive.social.StoryDrafts.clear(); onDismiss() }
            else -> confirmLeave = true
        }
    }
    val context = LocalContext.current
    val gifApi = remember { runCatching { dagger.hilt.android.EntryPointAccessors.fromApplication(context.applicationContext, app.talklive.ui.chat.GifEntryPoint::class.java).gifs() }.getOrNull() }
    val emptyMsg = stringResource(R.string.story_empty)
    val maxGifsMsg = stringResource(R.string.story_max_gifs, 6)
    LaunchedEffect(error) { if (error != null) { delay(2600); error = null } }

    Dialog(onDismissRequest = { requestClose() }, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        BoxWithConstraints(Modifier.fillMaxSize().background(storyBrush(bg))) {
            val w = constraints.maxWidth.toFloat()
            val h = constraints.maxHeight.toFloat()
            val storyW = maxWidth
            // Tap empty space to write.
            Box(Modifier.fillMaxSize().pointerInput(Unit) { detectTapGestures { if (editing == null && panel == null) startText(null) else if (panel != null) panel = null } })
            fun binCheck(x: Float, y: Float) {
                val now = y > 0.84f && abs(x - 0.5f) < 0.16f
                if (now != overBin) { overBin = now; if (now) haptics.performHapticFeedback(HapticFeedbackType.LongPress) }
            }
            gifs.forEachIndexed { i, g ->
                Placed(
                    g.x, g.y, g.s, g.r, w, h,
                    Modifier.layerGestures(
                        g.url + i, { gifs.getOrNull(i)?.s ?: 1f }, { gifs.getOrNull(i)?.r ?: 0f },
                        onStart = { dragging = true },
                        onMove = { dx, dy, z, r ->
                            val cur = gifs.getOrNull(i) ?: return@layerGestures
                            val nx = (cur.x + dx / w).coerceIn(0f, 1f); val ny = (cur.y + dy / h).coerceIn(0f, 1f)
                            gifs[i] = cur.copy(x = nx, y = ny, s = (cur.s * z).coerceIn(0.3f, 5f), r = ((cur.r + r + 540f) % 360f) - 180f)
                            binCheck(nx, ny)
                        },
                        onEnd = { dragging = false; if (overBin) gifs.removeAt(i); overBin = false },
                        onTap = {},
                    ),
                ) { StoryGifView(g, storyW) }
            }
            layers.forEachIndexed { i, l ->
                if (editing?.id == l.id) return@forEachIndexed
                Placed(
                    l.x, l.y, l.s, l.r, w, h,
                    Modifier.layerGestures(
                        l.id, { layers.getOrNull(i)?.s ?: 1f }, { layers.getOrNull(i)?.r ?: 0f },
                        onStart = { dragging = true },
                        onMove = { dx, dy, z, r ->
                            val cur = layers.getOrNull(i) ?: return@layerGestures
                            val nx = (cur.x + dx / w).coerceIn(0f, 1f); val ny = (cur.y + dy / h).coerceIn(0f, 1f)
                            layers[i] = cur.copy(x = nx, y = ny, s = (cur.s * z).coerceIn(0.3f, 5f), r = ((cur.r + r + 540f) % 360f) - 180f)
                            binCheck(nx, ny)
                        },
                        onEnd = { dragging = false; if (overBin) layers.removeAt(i); overBin = false },
                        onTap = { if (l.kind == "text") startText(l) },
                    ),
                ) { if (l.kind == "emoji") StoryEmojiView(l, storyW) else StoryTextView(l, storyW) }
            }
            if (layers.isEmpty() && gifs.isEmpty() && editing == null) Text(
                stringResource(R.string.story_tap_to_write), color = Color.White.copy(alpha = 0.7f), fontSize = 26.sp,
                fontWeight = FontWeight.ExtraBold, textAlign = TextAlign.Center,
                modifier = Modifier.align(Alignment.Center).padding(horizontal = 32.dp),
            )

            // While something is being moved: the bin, which grows when it is over it.
            AnimatedVisibility(dragging, Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 28.dp), enter = scaleIn() + fadeIn(), exit = scaleOut() + fadeOut()) {
                val grow by animateFloatAsState(if (overBin) 1.3f else 1f, label = "bin")
                Box(
                    Modifier.size(64.dp).graphicsLayer { scaleX = grow; scaleY = grow }.clip(CircleShape)
                        .background(if (overBin) Color(0xFFEF4444) else Color(0x66000000)).border(2.dp, Color.White, CircleShape),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Rounded.Delete, stringResource(R.string.story_delete), tint = Color.White) }
            }

            if (!dragging && editing == null) {
                Row(Modifier.fillMaxWidth().statusBarsPadding().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { requestClose() }) { Icon(Icons.Rounded.Close, stringResource(R.string.close), tint = Color.White) }
                    Text(stringResource(R.string.new_story), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.weight(1f))
                    EditorTool("Aa") { startText(null) }
                    Spacer(Modifier.width(8.dp))
                    EditorTool("😊") { panel = if (panel == "emoji") null else "emoji" }
                    Spacer(Modifier.width(8.dp))
                    if (gifApi != null) EditorTool("GIF") { panel = if (panel == "gif") null else "gif" }
                }
                Column(Modifier.align(Alignment.BottomCenter).fillMaxWidth().navigationBarsPadding()) {
                    when (panel) {
                        "emoji" -> LazyVerticalGrid(
                            GridCells.Adaptive(48.dp),
                            Modifier.fillMaxWidth().height(240.dp).clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp)).background(Color(0xF0111827)).padding(8.dp),
                        ) {
                            items(StoryEmojiPicks.size) { k ->
                                val e = StoryEmojiPicks[k]
                                Box(
                                    Modifier.size(48.dp).clip(RoundedCornerShape(10.dp)).clickable {
                                        layers.add(StoryLayer(StoryLayer.nextId(), "emoji", e, 0.35f + Math.random().toFloat() * 0.3f, 0.3f + Math.random().toFloat() * 0.3f))
                                        panel = null
                                    },
                                    contentAlignment = Alignment.Center,
                                ) { Text(e, fontSize = 28.sp) }
                            }
                        }
                        "gif" -> if (gifApi != null) Box(
                            Modifier.fillMaxWidth().height(340.dp).clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp)).background(MaterialTheme.colorScheme.surface),
                        ) {
                            app.talklive.ui.chat.GifPanel(gifApi) { g ->
                                if (gifs.size >= 6) error = maxGifsMsg
                                else { gifs.add(StoryGif(g.url, g.preview, g.w, g.h, 0.5f, 0.4f)); panel = null }
                            }
                        }
                    }
                    Row(
                        Modifier.fillMaxWidth().background(Brush.verticalGradient(listOf(Color.Transparent, Color(0x88000000)))).padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        LazyRow(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(StoryBgKeys) { k ->
                                Box(
                                    Modifier.size(if (k == bg) 32.dp else 28.dp).clip(CircleShape).background(storyBrush(k))
                                        .border(2.dp, if (k == bg) Color.White else Color.White.copy(alpha = 0.4f), CircleShape).clickable { bg = k },
                                )
                            }
                        }
                        Spacer(Modifier.width(10.dp))
                        Box(
                            Modifier.clip(CircleShape).background(Color.White).clickable {
                                if (draft().isEmpty) { error = emptyMsg; return@clickable }
                                val d = draft()
                                app.talklive.social.StoryDrafts.save(d)
                                onPost(d)
                                onDismiss()
                            }.padding(horizontal = 20.dp, vertical = 10.dp),
                        ) { Text(stringResource(R.string.story_post), color = Color.Black, fontWeight = FontWeight.ExtraBold) }
                    }
                }
            }

            // Typing: its own layer, everything sits above the keyboard.
            if (editing != null) {
                val focus = remember { FocusRequester() }
                LaunchedEffect(Unit) { focus.requestFocus() }
                Column(Modifier.fillMaxSize().background(Color(0x99000000)).statusBarsPadding().imePadding().navigationBarsPadding()) {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        // Highlight: the words on a pill of their colour.
                        Box(
                            Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).background(if (editPill) Color.White else Color(0x33FFFFFF)).clickable { editPill = !editPill },
                            contentAlignment = Alignment.Center,
                        ) { Text("A", color = if (editPill) Color.Black else Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp) }
                        Spacer(Modifier.weight(1f))
                        Box(Modifier.clip(CircleShape).background(Color.White).clickable { finishText() }.padding(horizontal = 18.dp, vertical = 8.dp)) {
                            Text(stringResource(R.string.done), color = Color.Black, fontWeight = FontWeight.ExtraBold)
                        }
                    }
                    Box(Modifier.weight(1f).fillMaxWidth().clickable(indication = null, interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }) { finishText() }, contentAlignment = Alignment.Center) {
                        val c = hexColor(editColor)
                        val size = (storyW.value * TEXT_FRACTION).sp
                        BasicTextField(
                            editText, { editText = it.take(300) },
                            textStyle = TextStyle(
                                color = if (editPill) (if (c.luminance() > 0.6f) Color(0xFF111111) else Color.White) else c,
                                fontSize = size, lineHeight = size * 1.2f, fontWeight = FontWeight.ExtraBold, textAlign = TextAlign.Center,
                            ),
                            cursorBrush = SolidColor(Color.White),
                            modifier = Modifier.widthIn(min = 40.dp, max = storyW * 0.82f).focusRequester(focus)
                                .then(if (editPill) Modifier.clip(RoundedCornerShape(12.dp)).background(c).padding(horizontal = 12.dp, vertical = 6.dp) else Modifier),
                        )
                    }
                    LazyRow(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(StoryTextColors) { k ->
                            Box(
                                Modifier.size(if (k == editColor) 34.dp else 28.dp).clip(CircleShape).background(hexColor(k))
                                    .border(2.dp, Color.White, CircleShape).clickable { editColor = k },
                            )
                        }
                    }
                }
            }

            if (confirmLeave) androidx.compose.material3.AlertDialog(
                onDismissRequest = { confirmLeave = false },
                title = { Text(stringResource(R.string.story_leave_title)) },
                text = { Text(stringResource(R.string.story_leave_body)) },
                confirmButton = { androidx.compose.material3.TextButton(onClick = { confirmLeave = false }) { Text(stringResource(R.string.story_keep_editing)) } },
                dismissButton = {
                    androidx.compose.material3.TextButton(onClick = { confirmLeave = false; app.talklive.social.StoryDrafts.clear(); onDismiss() }) {
                        Text(stringResource(R.string.story_discard), color = Color(0xFFEF4444))
                    }
                },
            )
            error?.let {
                Text(
                    it, color = Color.White, fontWeight = FontWeight.Bold,
                    modifier = Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(top = 64.dp).clip(CircleShape).background(Color(0xFFDC2626)).padding(horizontal = 14.dp, vertical = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun EditorTool(label: String, onClick: () -> Unit) {
    Box(Modifier.size(44.dp).clip(CircleShape).background(Color(0x66000000)).clickable(onClick = onClick), contentAlignment = Alignment.Center) {
        Text(label, color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = if (label.length > 1 && label != "😊") 14.sp else 20.sp)
    }
}
