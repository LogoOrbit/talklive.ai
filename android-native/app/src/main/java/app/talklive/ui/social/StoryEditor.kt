package app.talklive.ui.social

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.calculatePan
import androidx.compose.foundation.gestures.calculateRotation
import androidx.compose.foundation.gestures.calculateZoom
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.material.icons.automirrored.rounded.FormatAlignLeft
import androidx.compose.material.icons.automirrored.rounded.FormatAlignRight
import androidx.compose.material.icons.automirrored.rounded.Redo
import androidx.compose.material.icons.automirrored.rounded.Undo
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.FormatAlignCenter
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
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
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChanged
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
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
import kotlin.math.roundToInt

// Sizes are fractions of the story's width, the same on every phone and on the website.
private const val TEXT_FRACTION = 0.075f
private const val EMOJI_FRACTION = 0.17f
private const val GIF_FRACTION = 0.4f
private const val MAX_STORY_GIFS = 6

/** The text colours and gradient fills the server accepts (server/stories.js). */
val StoryTextColors = listOf("#ffffff", "#111111", "#facc15", "#ef4444", "#3b82f6", "#22c55e", "#ec4899", "#a855f7", "#f97316")
private val StoryGradients: Map<String, List<Color>> = linkedMapOf(
    "g:sunset" to listOf(Color(0xFFF97316), Color(0xFFEC4899)),
    "g:ocean" to listOf(Color(0xFF06B6D4), Color(0xFF3B82F6)),
    "g:candy" to listOf(Color(0xFFF472B6), Color(0xFFA855F7)),
    "g:aurora" to listOf(Color(0xFF22C55E), Color(0xFF06B6D4), Color(0xFFA855F7)),
    "g:gold" to listOf(Color(0xFFFDE68A), Color(0xFFF59E0B)),
)

/** The eight type styles, by the id the server keeps (server/stories.js TEXT_FONTS). */
private val StoryFonts = listOf("classic", "serif", "mono", "hand", "heavy", "neon", "outline", "retro")

/** Little motions words and emoji can play when the story is watched (none on Instagram). */
private val StoryMotions = listOf("none", "type", "pulse", "wiggle", "float", "pop", "rainbow")

private fun hexColor(h: String): Color = runCatching { Color(android.graphics.Color.parseColor(h)) }.getOrDefault(Color.White)
private fun mainColor(c: String): Color = StoryGradients[c]?.first() ?: hexColor(c)

/** One type style, at [size]: family, weight and the effect that makes it that style. */
private fun storyFontStyle(f: String, size: TextUnit, color: Color, pill: Boolean): TextStyle {
    val soft = if (pill) null else Shadow(Color(0x66000000), Offset(0f, 3f), 10f)
    return when (f) {
        "serif" -> TextStyle(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontStyle = FontStyle.Italic, fontSize = size * 1.05f, shadow = soft)
        "mono" -> TextStyle(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = size * 0.92f, letterSpacing = 0.02.em, shadow = soft)
        "hand" -> TextStyle(fontFamily = FontFamily.Cursive, fontWeight = FontWeight.Medium, fontSize = size * 1.2f, shadow = soft)
        "heavy" -> TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Black, fontSize = size * 1.1f, letterSpacing = (-0.02).em, shadow = soft)
        "neon" -> TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = size, shadow = Shadow(color.copy(alpha = 0.95f), Offset.Zero, 28f))
        "outline" -> TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Black, fontSize = size * 1.1f, drawStyle = Stroke(width = size.value * 0.16f))
        "retro" -> TextStyle(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Black, fontStyle = FontStyle.Italic, fontSize = size * 1.05f, shadow = Shadow(Color(0xCC000000), Offset(5f, 5f), 0f))
        else -> TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.ExtraBold, fontSize = size, shadow = soft)
    }
}

/** The look of words: style, then colour or gradient fill, on a pill when highlighted. */
@Composable
private fun storyTextStyle(l: StoryLayer, size: TextUnit, rainbowHue: Float?): TextStyle {
    val main = mainColor(l.c)
    val gradient = StoryGradients[l.c]
    val onPill = if (main.luminance() > 0.6f) Color(0xFF111111) else Color.White
    val textColor = when {
        l.b -> onPill
        l.f == "neon" -> Color.White
        else -> main
    }
    val align = when (l.a) { "left" -> TextAlign.Left; "right" -> TextAlign.Right; else -> TextAlign.Center }
    val brush: Brush? = when {
        rainbowHue != null && !l.b -> Brush.linearGradient(
            listOf(0f, 60f, 120f, 180f).map { Color.hsv((rainbowHue + it) % 360f, 0.75f, 1f) },
        )
        gradient != null && !l.b && l.f != "neon" -> Brush.linearGradient(gradient)
        else -> null
    }
    val base = storyFontStyle(l.f, size, if (l.f == "neon") main else textColor, l.b)
    val withColor = base.merge(TextStyle(color = textColor, textAlign = align, lineHeight = base.fontSize * 1.2f))
    return if (brush != null) withColor.merge(TextStyle(brush = brush)) else withColor
}

/** Something placed on a story, positioned by its centre, then sized and turned about it. */
@Composable
private fun Placed(x: Float, y: Float, s: Float, r: Float, w: Float, h: Float, onSize: (IntSize) -> Unit = {}, content: @Composable () -> Unit) {
    var size by remember { mutableStateOf(IntSize.Zero) }
    Box(
        Modifier
            .offset { IntOffset((x * w - size.width / 2f).roundToInt(), (y * h - size.height / 2f).roundToInt()) }
            .onSizeChanged { size = it; onSize(it) }
            .graphicsLayer { scaleX = s; scaleY = s; rotationZ = r },
    ) { content() }
}

/** A motion played while the story is watched (and previewed while it is made). */
@Composable
private fun Modifier.storyMotion(m: String, animate: Boolean): Modifier {
    if (!animate || m == "none" || m == "type" || m == "rainbow") return this
    val t = rememberInfiniteTransition(label = "motion")
    val v by t.animateFloat(
        0f, 1f,
        infiniteRepeatable(tween(if (m == "pop") 2600 else 1300, easing = if (m == "pop") LinearEasing else FastOutSlowInEasing), if (m == "pop") RepeatMode.Restart else RepeatMode.Reverse),
        label = "v",
    )
    val lift = with(LocalDensity.current) { 8.dp.toPx() }
    return this.graphicsLayer {
        when (m) {
            "pulse" -> { scaleX = 1f + 0.09f * v; scaleY = scaleX }
            "wiggle" -> rotationZ = -6f + 12f * v
            "float" -> translationY = -lift * v
            "pop" -> {
                // Springs in, then holds: 0.6 -> 1.18 -> 1 in the first quarter.
                val k = when {
                    v < 0.12f -> 0.6f + (v / 0.12f) * 0.58f
                    v < 0.25f -> 1.18f - ((v - 0.12f) / 0.13f) * 0.18f
                    else -> 1f
                }
                scaleX = k; scaleY = k
            }
        }
    }
}

/** Words on a story, in their style, colour, alignment and motion. */
@Composable
fun StoryTextView(l: StoryLayer, storyWidth: Dp, animate: Boolean = true) {
    val reduce = app.talklive.ui.theme.LocalReduceMotion.current
    val live = animate && !reduce
    val size = (storyWidth.value * TEXT_FRACTION).sp
    // Typing on: the words appear letter by letter, hold, then type again.
    var shown by remember(l.text, l.m, live) { mutableIntStateOf(l.text.length) }
    if (live && l.m == "type") LaunchedEffect(l.text) {
        while (true) {
            for (i in 0..l.text.length) { shown = i; delay(55) }
            delay(2400)
        }
    }
    val hue = if (live && l.m == "rainbow") {
        val t = rememberInfiniteTransition(label = "rainbow")
        t.animateFloat(0f, 360f, infiniteRepeatable(tween(3000, easing = LinearEasing)), label = "hue").value
    } else null
    val text = (if (l.f == "heavy") l.text.uppercase() else l.text).let { if (l.m == "type" && live) it.take(shown) else it }
    val pill = mainColor(l.c)
    Text(
        text.ifEmpty { " " },
        style = storyTextStyle(l, size, hue),
        modifier = Modifier.storyMotion(l.m, live).widthIn(max = storyWidth * 0.82f)
            .then(if (l.b) Modifier.clip(RoundedCornerShape(12.dp)).background(StoryGradients[l.c]?.let { Brush.linearGradient(it) } ?: SolidColor(pill)).padding(horizontal = 12.dp, vertical = 6.dp) else Modifier),
    )
}

@Composable
private fun StoryEmojiView(l: StoryLayer, storyWidth: Dp, animate: Boolean = true) {
    val live = animate && !app.talklive.ui.theme.LocalReduceMotion.current
    Text(l.text, fontSize = (storyWidth.value * EMOJI_FRACTION).sp, modifier = Modifier.storyMotion(l.m, live))
}

/**
 * A GIF on a story. Its small preview (already loaded when it was picked) shows at once, and
 * the full one, as a lighter WebP where the phone can play it, takes over when it arrives.
 * A soft frame stands in until then, so a GIF is never invisible.
 */
@Composable
private fun StoryGifView(g: StoryGif, storyWidth: Dp) {
    val ratio = if (g.w > 0 && g.h > 0) g.h.toFloat() / g.w else 0.75f
    val gw = storyWidth * GIF_FRACTION
    val full = if (android.os.Build.VERSION.SDK_INT >= 28) g.url.replace(Regex("\\.gif(?=\\?|$)"), ".webp") else g.url
    Box(Modifier.width(gw).height(gw * ratio).clip(RoundedCornerShape(10.dp)).background(Color(0x33FFFFFF))) {
        if (g.preview.isNotBlank() && g.preview != full) AsyncImage(model = g.preview, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.matchParentSize())
        AsyncImage(model = full, contentDescription = "GIF", contentScale = ContentScale.Crop, modifier = Modifier.matchParentSize())
    }
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

private val StoryEmojiPicks = (
    "😀 😂 🤣 😊 😍 🥰 😘 😎 🤩 🥳 😇 🤗 🤔 😴 😭 😡 🤯 😱 🥺 😏 🙄 👋 👍 👏 🙌 🙏 💪 🤝 ✌️ 🤞 👀 " +
        "❤️ 🧡 💛 💚 💙 💜 🖤 💔 💕 💯 ✨ ⭐ 🔥 🎉 🎊 🎁 🎂 🍕 🍔 ☕ 🍺 ⚽ 🏀 🎮 🎵 🎧 🎤 📷 ✈️ 🚀 🌍 🌙 ☀️ 🌈 🌸 🌹 " +
        "🐶 🐱 🦊 🐼 🦁 🐸 🦋 👻 💀 🤖 👽 💩"
    ).split(" ")

/** What Undo goes back to: the whole story at one moment. */
private data class StorySnapshot(val bg: String, val gifs: List<StoryGif>, val layers: List<StoryLayer>)

/**
 * Making a story. Like Instagram's - write anywhere, move with one finger, pinch with two to
 * size and turn, drop on the bin to delete - and more: pinch works anywhere on the screen on
 * the thing last touched (so even one small word resizes easily), a size slider while typing,
 * eight type styles and gradient fills, words that move (type on, pulse, wiggle, float, pop,
 * rainbow), long-press to duplicate, centre guides that snap, and Undo / Redo.
 */
@Composable
fun StoryComposer(onPost: (StoryDraft) -> Unit, onDismiss: () -> Unit) {
    val saved = remember { app.talklive.social.StoryDrafts.load() }
    var bg by remember { mutableStateOf(saved?.bg?.takeIf { it in StoryBgKeys } ?: StoryBgKeys.random()) }
    val gifs = remember { mutableStateListOf<StoryGif>().apply { saved?.gifs?.let { addAll(it.distinctBy { g -> g.url }.take(MAX_STORY_GIFS)) } } }
    val layers = remember {
        mutableStateListOf<StoryLayer>().apply {
            saved?.layers?.let { addAll(it) }
            saved?.text?.takeIf { it.isNotBlank() }?.let { add(StoryLayer(StoryLayer.nextId(), "text", it, 0.5f, 0.45f)) }
        }
    }
    var panel by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var confirmLeave by remember { mutableStateOf(false) }
    // Typing: a new text or one tapped to change, with its style while it is typed.
    var editing by remember { mutableStateOf<StoryLayer?>(null) }
    var editText by remember { mutableStateOf("") }
    var editColor by remember { mutableStateOf("#ffffff") }
    var editPill by remember { mutableStateOf(false) }
    var editFont by remember { mutableStateOf("classic") }
    var editAlign by remember { mutableStateOf("center") }
    var editMotion by remember { mutableStateOf("none") }
    var editScale by remember { mutableStateOf(1f) }
    // Moving things.
    var dragging by remember { mutableStateOf(false) }
    var overBin by remember { mutableStateOf(false) }
    var guideV by remember { mutableStateOf(false) }
    var guideH by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf<Long?>(null) }
    val sizes = remember { mutableStateMapOf<Long, IntSize>() }
    var lastGifPick by remember { mutableLongStateOf(0L) }
    val haptics = LocalHapticFeedback.current

    // Undo / Redo: the story before each change.
    val undo = remember { ArrayDeque<StorySnapshot>() }
    val redo = remember { ArrayDeque<StorySnapshot>() }
    var history by remember { mutableIntStateOf(0) }
    fun snapshot() = StorySnapshot(bg, gifs.toList(), layers.toList())
    fun record() { undo.addLast(snapshot()); while (undo.size > 40) undo.removeFirst(); redo.clear(); history++ }
    fun restore(s: StorySnapshot) { bg = s.bg; gifs.clear(); gifs.addAll(s.gifs); layers.clear(); layers.addAll(s.layers); history++ }
    fun doUndo() { val s = undo.removeLastOrNull() ?: return; redo.addLast(snapshot()); restore(s) }
    fun doRedo() { val s = redo.removeLastOrNull() ?: return; undo.addLast(snapshot()); restore(s) }

    fun draft() = StoryDraft("", bg, gifs.toList(), layers.toList())
    LaunchedEffect(bg, gifs.toList(), layers.toList()) { app.talklive.social.StoryDrafts.save(draft()) }
    fun startText(l: StoryLayer?) {
        panel = null
        editing = l ?: StoryLayer(StoryLayer.nextId(), "text", "", 0.5f, 0.42f)
        editText = l?.text.orEmpty(); editColor = l?.c ?: "#ffffff"; editPill = l?.b ?: false
        editFont = l?.f ?: "classic"; editAlign = l?.a ?: "center"; editMotion = l?.m ?: "none"; editScale = l?.s ?: 1f
    }
    fun finishText() {
        val e = editing ?: return
        val i = layers.indexOfFirst { it.id == e.id }
        val t = editText.trim()
        val styled = e.copy(text = t.take(300), c = editColor, b = editPill, f = editFont, a = editAlign, m = editMotion, s = editScale)
        val before = layers.getOrNull(i)
        if (t.isEmpty() && i < 0) { editing = null; return }
        if (before != styled) record()
        when {
            t.isEmpty() -> layers.removeAt(i)
            i >= 0 -> layers[i] = styled
            else -> layers.add(styled)
        }
        selected = styled.id
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
    val maxGifsMsg = stringResource(R.string.story_max_gifs, MAX_STORY_GIFS)
    LaunchedEffect(error) { if (error != null) { delay(2600); error = null } }

    Dialog(onDismissRequest = { requestClose() }, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        BoxWithConstraints(Modifier.fillMaxSize().background(storyBrush(bg))) {
            val w = constraints.maxWidth.toFloat()
            val h = constraints.maxHeight.toFloat()
            val storyW = maxWidth
            val slop = with(LocalDensity.current) { 18.dp.toPx() }

            gifs.forEach { g -> Placed(g.x, g.y, g.s, g.r, w, h, onSize = { sizes[g.id] = it }) { StoryGifView(g, storyW) } }
            layers.forEach { l ->
                if (editing?.id == l.id) return@forEach
                Placed(l.x, l.y, l.s, l.r, w, h, onSize = { sizes[l.id] = it }) {
                    if (l.kind == "emoji") StoryEmojiView(l, storyW) else StoryTextView(l, storyW)
                }
            }
            if (layers.isEmpty() && gifs.isEmpty() && editing == null) Text(
                stringResource(R.string.story_tap_to_write), color = Color.White.copy(alpha = 0.7f), fontSize = 26.sp,
                fontWeight = FontWeight.ExtraBold, textAlign = TextAlign.Center,
                modifier = Modifier.align(Alignment.Center).padding(horizontal = 32.dp),
            )
            // Centre guides while something snaps to the middle.
            if (guideV) Box(Modifier.align(Alignment.Center).width(1.5.dp).fillMaxHeight().background(Color(0xCCFFFFFF)))
            if (guideH) Box(Modifier.align(Alignment.Center).height(1.5.dp).fillMaxWidth().background(Color(0xCCFFFFFF)))

            // One gesture layer for the whole story: what is under the first finger is picked up;
            // a second finger anywhere sizes and turns it (or the last thing touched).
            fun hit(id: Long, x: Float, y: Float, s: Float, p: Offset): Boolean {
                val sz = sizes[id] ?: return false
                return abs(p.x - x * w) <= sz.width * s / 2f + slop && abs(p.y - y * h) <= sz.height * s / 2f + slop
            }
            fun itemAt(p: Offset): Long? {
                layers.asReversed().firstOrNull { it.id != editing?.id && hit(it.id, it.x, it.y, it.s, p) }?.let { return it.id }
                gifs.asReversed().firstOrNull { hit(it.id, it.x, it.y, it.s, p) }?.let { return it.id }
                return null
            }
            fun bringToFront(id: Long) {
                val i = layers.indexOfFirst { it.id == id }
                if (i in 0 until layers.size - 1) layers.add(layers.removeAt(i))
                val j = gifs.indexOfFirst { it.id == id }
                if (j in 0 until gifs.size - 1) gifs.add(gifs.removeAt(j))
            }
            fun snapX(v: Float): Float {
                val near = abs(v - 0.5f) < 0.015f
                if (near != guideV) { guideV = near; if (near) haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove) }
                return if (near) 0.5f else v
            }
            fun snapY(v: Float): Float {
                val near = abs(v - 0.5f) < 0.012f
                if (near != guideH) { guideH = near; if (near) haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove) }
                return if (near) 0.5f else v
            }
            fun binCheck(x: Float, y: Float) {
                val now = y > 0.84f && abs(x - 0.5f) < 0.16f
                if (now != overBin) { overBin = now; if (now) haptics.performHapticFeedback(HapticFeedbackType.LongPress) }
            }
            fun move(id: Long, dx: Float, dy: Float, zoom: Float, rot: Float) {
                val i = layers.indexOfFirst { it.id == id }
                if (i >= 0) {
                    val c = layers[i]
                    val nx = snapX((c.x + dx / w).coerceIn(0f, 1f)); val ny = snapY((c.y + dy / h).coerceIn(0f, 1f))
                    layers[i] = c.copy(x = nx, y = ny, s = (c.s * zoom).coerceIn(0.3f, 5f), r = ((c.r + rot + 540f) % 360f) - 180f)
                    binCheck(nx, ny); return
                }
                val j = gifs.indexOfFirst { it.id == id }
                if (j >= 0) {
                    val c = gifs[j]
                    val nx = snapX((c.x + dx / w).coerceIn(0f, 1f)); val ny = snapY((c.y + dy / h).coerceIn(0f, 1f))
                    gifs[j] = c.copy(x = nx, y = ny, s = (c.s * zoom).coerceIn(0.3f, 5f), r = ((c.r + rot + 540f) % 360f) - 180f)
                    binCheck(nx, ny)
                }
            }
            fun remove(id: Long) { layers.removeAll { it.id == id }; gifs.removeAll { it.id == id }; sizes.remove(id); if (selected == id) selected = null }
            fun duplicate(id: Long) {
                record()
                layers.firstOrNull { it.id == id }?.let { layers.add(it.copy(id = StoryLayer.nextId(), x = (it.x + 0.05f).coerceAtMost(1f), y = (it.y + 0.05f).coerceAtMost(1f))); return }
                if (gifs.size >= MAX_STORY_GIFS) { error = maxGifsMsg; return }
                gifs.firstOrNull { it.id == id }?.let { gifs.add(it.copy(id = StoryLayer.nextId(), x = (it.x + 0.05f).coerceAtMost(1f), y = (it.y + 0.05f).coerceAtMost(1f))) }
            }
            Box(
                Modifier.fillMaxSize().pointerInput(w, h) {
                    awaitEachGesture {
                        val down = awaitFirstDown(requireUnconsumed = false)
                        var target = itemAt(down.position)
                        if (target != null) { selected = target; bringToFront(target) }
                        var travel = 0f
                        var started = false
                        var longPressed = false
                        var ended = false
                        while (!ended) {
                            val ev = if (target != null && !started && !longPressed) withTimeoutOrNull(520L) { awaitPointerEvent() } else awaitPointerEvent()
                            if (ev == null) {
                                // Held still on something: a copy of it.
                                longPressed = true
                                target?.let { duplicate(it); haptics.performHapticFeedback(HapticFeedbackType.LongPress) }
                                continue
                            }
                            if (target == null && ev.changes.count { it.pressed } >= 2) target = selected
                            val zoom = ev.calculateZoom()
                            val rot = ev.calculateRotation()
                            val pan = ev.calculatePan()
                            travel += pan.getDistance() + abs(zoom - 1f) * 60f + abs(rot) * 2f
                            if (!started && travel > viewConfiguration.touchSlop && target != null && !longPressed) {
                                started = true; dragging = true; record()
                            }
                            if (started) {
                                target?.let { move(it, pan.x, pan.y, zoom, rot) }
                                ev.changes.forEach { if (it.positionChanged()) it.consume() }
                            }
                            ended = ev.changes.none { it.pressed }
                        }
                        if (started) {
                            if (overBin) { target?.let { remove(it) }; haptics.performHapticFeedback(HapticFeedbackType.LongPress) }
                        } else if (!longPressed && travel < viewConfiguration.touchSlop) {
                            // A tap: words open for editing; empty space starts new words (or closes a panel).
                            val l = layers.firstOrNull { it.id == target }
                            when {
                                l != null && l.kind == "text" -> startText(l)
                                target == null && panel != null -> panel = null
                                target == null && editing == null -> startText(null)
                            }
                        }
                        dragging = false; overBin = false; guideV = false; guideH = false
                    }
                },
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
                    // Undo and Redo (history is read so the buttons follow it).
                    val canUndo = history >= 0 && undo.isNotEmpty()
                    val canRedo = history >= 0 && redo.isNotEmpty()
                    IconButton(onClick = { doUndo() }, enabled = canUndo) {
                        Icon(Icons.AutoMirrored.Rounded.Undo, stringResource(R.string.story_undo), tint = Color.White.copy(alpha = if (canUndo) 1f else 0.35f))
                    }
                    IconButton(onClick = { doRedo() }, enabled = canRedo) {
                        Icon(Icons.AutoMirrored.Rounded.Redo, stringResource(R.string.story_redo), tint = Color.White.copy(alpha = if (canRedo) 1f else 0.35f))
                    }
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
                                        record()
                                        val l = StoryLayer(StoryLayer.nextId(), "emoji", e, 0.35f + Math.random().toFloat() * 0.3f, 0.3f + Math.random().toFloat() * 0.3f)
                                        layers.add(l); selected = l.id
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
                                val now = System.currentTimeMillis()
                                when {
                                    // One pick is one GIF: a quick second tap, or the same GIF again, adds nothing.
                                    now - lastGifPick < 800 -> Unit
                                    gifs.any { it.url == g.url } -> { lastGifPick = now; panel = null }
                                    gifs.size >= MAX_STORY_GIFS -> error = maxGifsMsg
                                    else -> {
                                        lastGifPick = now
                                        record()
                                        val sg = StoryGif(g.url, g.preview, g.w, g.h, 0.5f, 0.4f)
                                        gifs.add(sg); selected = sg.id
                                        panel = null
                                    }
                                }
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
                                        .border(2.dp, if (k == bg) Color.White else Color.White.copy(alpha = 0.4f), CircleShape)
                                        .clickable { if (k != bg) { record(); bg = k } },
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
                val preview = StoryLayer(0, "text", editText, 0.5f, 0.5f, editScale, 0f, editColor, editPill, editFont, editAlign, "none")
                Column(Modifier.fillMaxSize().background(Color(0x99000000)).statusBarsPadding().imePadding().navigationBarsPadding()) {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        // Highlight: the words on a pill of their colour.
                        EditorChip("A", on = editPill) { editPill = !editPill }
                        Spacer(Modifier.width(8.dp))
                        // Alignment: centre, left, right.
                        Box(
                            Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).background(Color(0x33FFFFFF))
                                .clickable { editAlign = when (editAlign) { "center" -> "left"; "left" -> "right"; else -> "center" } },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                when (editAlign) { "left" -> Icons.AutoMirrored.Rounded.FormatAlignLeft; "right" -> Icons.AutoMirrored.Rounded.FormatAlignRight; else -> Icons.Rounded.FormatAlignCenter },
                                stringResource(R.string.story_align), tint = Color.White,
                            )
                        }
                        Spacer(Modifier.width(8.dp))
                        // Motion: what the words do when the story is watched.
                        EditorChip(motionLabel(editMotion), on = editMotion != "none") {
                            editMotion = StoryMotions[(StoryMotions.indexOf(editMotion) + 1) % StoryMotions.size]
                        }
                        Spacer(Modifier.weight(1f))
                        Box(Modifier.clip(CircleShape).background(Color.White).clickable { finishText() }.padding(horizontal = 18.dp, vertical = 8.dp)) {
                            Text(stringResource(R.string.done), color = Color.Black, fontWeight = FontWeight.ExtraBold)
                        }
                    }
                    Box(
                        Modifier.weight(1f).fillMaxWidth()
                            .clickable(indication = null, interactionSource = remember { MutableInteractionSource() }) { finishText() },
                        contentAlignment = Alignment.Center,
                    ) {
                        val size = (storyW.value * TEXT_FRACTION).sp
                        Box(Modifier.graphicsLayer { scaleX = editScale; scaleY = editScale }) {
                            BasicTextField(
                                editText, { editText = it.take(300) },
                                textStyle = storyTextStyle(preview, size, null),
                                cursorBrush = SolidColor(Color.White),
                                modifier = Modifier.widthIn(min = 40.dp, max = storyW * 0.82f).focusRequester(focus)
                                    .then(
                                        if (editPill) Modifier.clip(RoundedCornerShape(12.dp))
                                            .background(StoryGradients[editColor]?.let { Brush.linearGradient(it) } ?: SolidColor(mainColor(editColor)))
                                            .padding(horizontal = 12.dp, vertical = 6.dp) else Modifier,
                                    ),
                            )
                        }
                        // Size: slide up for bigger, down for smaller, as on Instagram.
                        SizeSlider(editScale, { editScale = it }, Modifier.align(Alignment.CenterStart).padding(start = 10.dp))
                    }
                    // The eight type styles, each shown in its own style.
                    LazyRow(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(StoryFonts) { f ->
                            val on = f == editFont
                            Box(
                                Modifier.clip(RoundedCornerShape(12.dp)).background(if (on) Color.White else Color(0x33FFFFFF))
                                    .clickable { editFont = f }.padding(horizontal = 14.dp, vertical = 8.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                val chip = StoryLayer(0, "text", "Aa", 0f, 0f, f = f, c = if (on) "#111111" else "#ffffff")
                                Text(fontLabel(f), style = storyTextStyle(chip, 15.sp, null).merge(TextStyle(textAlign = TextAlign.Center)))
                            }
                        }
                    }
                    // Colours, then gradient fills.
                    LazyRow(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(StoryTextColors + StoryGradients.keys.toList()) { k ->
                            Box(
                                Modifier.size(if (k == editColor) 34.dp else 28.dp).clip(CircleShape)
                                    .background(StoryGradients[k]?.let { Brush.linearGradient(it) } ?: SolidColor(hexColor(k)))
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
private fun fontLabel(f: String): String = stringResource(
    when (f) {
        "serif" -> R.string.story_font_serif
        "mono" -> R.string.story_font_mono
        "hand" -> R.string.story_font_hand
        "heavy" -> R.string.story_font_heavy
        "neon" -> R.string.story_font_neon
        "outline" -> R.string.story_font_outline
        "retro" -> R.string.story_font_retro
        else -> R.string.story_font_classic
    },
)

@Composable
private fun motionLabel(m: String): String = stringResource(
    when (m) {
        "type" -> R.string.story_motion_type
        "pulse" -> R.string.story_motion_pulse
        "wiggle" -> R.string.story_motion_wiggle
        "float" -> R.string.story_motion_float
        "pop" -> R.string.story_motion_pop
        "rainbow" -> R.string.story_motion_rainbow
        else -> R.string.story_motion_none
    },
)

/** A tall, tapered slider on the left: up for bigger words, down for smaller. */
@Composable
private fun SizeSlider(value: Float, onChange: (Float) -> Unit, modifier: Modifier = Modifier) {
    val min = 0.5f
    val max = 3f
    // The drag reads the latest value, not the one when the gesture handler was set up.
    val current by androidx.compose.runtime.rememberUpdatedState(value)
    val change by androidx.compose.runtime.rememberUpdatedState(onChange)
    Box(
        modifier.width(36.dp).height(240.dp).pointerInput(Unit) {
            detectVerticalDragGestures { c, d ->
                c.consume()
                change((current - d / size.height * (max - min)).coerceIn(min, max))
            }
        },
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val cx = size.width / 2
            val path = androidx.compose.ui.graphics.Path().apply {
                moveTo(cx - 9.dp.toPx(), 0f); lineTo(cx + 9.dp.toPx(), 0f)
                lineTo(cx + 2.dp.toPx(), size.height); lineTo(cx - 2.dp.toPx(), size.height); close()
            }
            drawPath(path, Color.White.copy(alpha = 0.45f))
            val y = (1f - (value - min) / (max - min)) * size.height
            drawCircle(Color.White, 11.dp.toPx(), Offset(cx, y))
        }
    }
}

@Composable
private fun EditorChip(label: String, on: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.height(40.dp).widthIn(min = 40.dp).clip(RoundedCornerShape(10.dp)).background(if (on) Color.White else Color(0x33FFFFFF))
            .clickable(onClick = onClick).padding(horizontal = 10.dp),
        contentAlignment = Alignment.Center,
    ) { Text(label, color = if (on) Color.Black else Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp) }
}

@Composable
private fun EditorTool(label: String, onClick: () -> Unit) {
    Box(Modifier.size(44.dp).clip(CircleShape).background(Color(0x66000000)).clickable(onClick = onClick), contentAlignment = Alignment.Center) {
        Text(label, color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = if (label.length > 1 && label != "😊") 14.sp else 20.sp)
    }
}
