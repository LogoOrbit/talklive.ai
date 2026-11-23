package app.talklive.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
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
private val StoryRing = Brush.linearGradient(listOf(Color(0xFFF59E0B), Color(0xFFEC4899), Color(0xFF8B5CF6)))
private const val MAX_GIFS = 6
private const val MAX_TEXT = 700
private const val STORY_MS = 6000L
private val StoryEmojis = ("😀 😂 🤣 😊 😍 😘 😎 🤩 🥳 😇 🤗 🤔 😴 😭 😡 🤯 😱 🥺 😏 🙄 👋 👍 👏 🙌 🙏 💪 🤝 ✌️ 🤞 👀 " +
    "❤️ 🧡 💛 💚 💙 💜 🖤 💔 💕 💯 ✨ ⭐ 🔥 🎉 🎊 🎁 🎂 🍕 🍔 ☕ ⚽ 🏀 🎮 🎵 🎧 🎤 ✈️ 🚀 🌍 🌙 ☀️ 🌈 🌸 🌹 🐶 🐱 🦊 🐼 🦁 🐸 🦋 👻 🤖 👽").split(" ")

/** "Your story" at the start of the row: a + to add one, or a ring when you have one. */
@Composable
fun MyStoryBubble(me: StoryPerson?, onAdd: () -> Unit, onOpen: () -> Unit) {
    val has = me != null && me.stories.isNotEmpty()
    Column(Modifier.width(64.dp).clip(RoundedCornerShape(12.dp)).clickable { if (has) onOpen() else onAdd() }, horizontalAlignment = Alignment.CenterHorizontally) {
        Box {
            Box(
                Modifier.size(58.dp).clip(CircleShape)
                    .then(if (has) Modifier.background(MaterialTheme.colorScheme.outlineVariant) else Modifier)
                    .padding(2.5.dp).clip(CircleShape).background(MaterialTheme.colorScheme.background).padding(1.dp),
                contentAlignment = Alignment.Center,
            ) { AnimalAvatar(me?.animal, me?.name, 52.dp) }
            Box(
                Modifier.align(Alignment.BottomEnd).size(22.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary)
                    .border(2.dp, MaterialTheme.colorScheme.background, CircleShape).clickable(onClick = onAdd),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Rounded.Add, stringResource(R.string.story_add), tint = Color.White, modifier = Modifier.size(15.dp)) }
        }
        Spacer(Modifier.height(4.dp))
        Text(stringResource(R.string.your_story), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
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

/** A story as it looks: the colour, the GIFs where they were put, the text in the middle. */
@Composable
private fun StoryCanvas(bg: String, gifs: List<StoryGif>, text: String?, modifier: Modifier = Modifier) {
    BoxWithConstraints(modifier.fillMaxSize().background(bgBrush(bg))) {
        val w = constraints.maxWidth.toFloat()
        val h = constraints.maxHeight.toFloat()
        val gifW = maxWidth * 0.4f
        val gifWpx = with(LocalDensity.current) { gifW.toPx() }
        gifs.forEach { g ->
            val ratio = if (g.w > 0 && g.h > 0) g.h.toFloat() / g.w else 0.75f
            AsyncImage(
                model = g.url, contentDescription = "GIF", contentScale = ContentScale.Crop,
                modifier = Modifier
                    .offset { IntOffset((g.x * w - gifWpx / 2).roundToInt(), (g.y * h - gifWpx * ratio / 2).roundToInt()) }
                    .width(gifW).height(gifW * ratio).clip(RoundedCornerShape(10.dp)),
            )
        }
        if (!text.isNullOrBlank()) Text(
            text, color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 34.sp, textAlign = TextAlign.Center,
            modifier = Modifier.align(Alignment.Center).padding(horizontal = 28.dp),
        )
    }
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
) {
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
    LaunchedEffect(pi, si) {
        if (!person.mine && !story.seen) onSeen(person, story)
        progress = 0f
        var elapsed = 0L
        while (elapsed < STORY_MS) {
            delay(32)
            if (!paused && !showViews) elapsed += 32
            progress = elapsed / STORY_MS.toFloat()
        }
        next()
    }
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            StoryCanvas(story.bg, story.gifs, story.text, Modifier.pointerInput(pi, si) {
                detectTapGestures(
                    onPress = { paused = true; tryAwaitRelease(); paused = false },
                    onTap = { o -> if (o.x < size.width * 0.33f) prev() else next() },
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
                Row(Modifier.clip(CircleShape).clickable { showViews = true }.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Visibility, null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(story.views.size.toString(), color = Color.White, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.weight(1f))
                StoryPill(stringResource(R.string.story_add), Icons.Rounded.Add) { onDismiss(); onAdd() }
                Spacer(Modifier.width(10.dp))
                StoryPill(stringResource(R.string.story_delete), Icons.Rounded.Delete) {
                    onDelete(story)
                    if (person.stories.size <= 1) onDismiss() else if (si >= person.stories.size - 1) si--
                }
            }
            if (showViews) Box(Modifier.fillMaxSize().background(Color(0x66000000)).clickable { showViews = false }) {
                Column(
                    Modifier.align(Alignment.BottomCenter).fillMaxWidth().clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                        .background(MaterialTheme.colorScheme.surface).navigationBarsPadding().padding(20.dp),
                ) {
                    Text(stringResource(R.string.story_seen_by), style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(10.dp))
                    if (story.views.isEmpty()) Text(stringResource(R.string.story_no_views), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    story.views.forEach { Text(it, modifier = Modifier.padding(vertical = 6.dp)) }
                }
            }
        }
    }
}

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

/** Writing a story: type on a colour, add emoji, drop GIFs and drag them where you want. */
@Composable
fun StoryComposer(onPost: suspend (String, String, List<StoryGif>) -> String?, onDismiss: () -> Unit) {
    var bg by remember { mutableStateOf(StoryBgs.keys.random()) }
    var text by remember { mutableStateOf("") }
    val gifs = remember { mutableStateListOf<StoryGif>() }
    var panel by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var posting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val gifApi = remember { runCatching { dagger.hilt.android.EntryPointAccessors.fromApplication(context.applicationContext, app.talklive.ui.chat.GifEntryPoint::class.java).gifs() }.getOrNull() }
    val emptyMsg = stringResource(R.string.story_empty)
    val maxGifsMsg = stringResource(R.string.story_max_gifs, MAX_GIFS)
    LaunchedEffect(error) { if (error != null) { delay(2600); error = null } }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        BoxWithConstraints(Modifier.fillMaxSize().background(bgBrush(bg))) {
            val w = constraints.maxWidth.toFloat()
            val h = constraints.maxHeight.toFloat()
            val gifW = maxWidth * 0.4f
            val gifWpx = with(LocalDensity.current) { gifW.toPx() }
            // The GIFs, each dragged on its own; the small × takes one off.
            gifs.forEachIndexed { i, g ->
                val ratio = if (g.w > 0 && g.h > 0) g.h.toFloat() / g.w else 0.75f
                Box(
                    Modifier
                        .offset { IntOffset((g.x * w - gifWpx / 2).roundToInt(), (g.y * h - gifWpx * ratio / 2).roundToInt()) }
                        .width(gifW).height(gifW * ratio)
                        .pointerInput(g.url, i) {
                            detectDragGestures { change, drag ->
                                change.consume()
                                val cur = gifs.getOrNull(i) ?: return@detectDragGestures
                                gifs[i] = cur.copy(x = (cur.x + drag.x / w).coerceIn(0f, 1f), y = (cur.y + drag.y / h).coerceIn(0f, 1f))
                            }
                        },
                ) {
                    AsyncImage(model = g.url, contentDescription = "GIF", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(10.dp)))
                    Box(
                        Modifier.align(Alignment.TopEnd).offset(8.dp, (-8).dp).size(26.dp).clip(CircleShape).background(Color(0xCC000000))
                            .clickable { gifs.removeAt(i) },
                        contentAlignment = Alignment.Center,
                    ) { Icon(Icons.Rounded.Close, null, tint = Color.White, modifier = Modifier.size(16.dp)) }
                }
            }
            Box(Modifier.align(Alignment.Center).fillMaxWidth().padding(horizontal = 24.dp), contentAlignment = Alignment.Center) {
                if (text.isEmpty()) Text(stringResource(R.string.story_placeholder), color = Color.White.copy(alpha = 0.65f), fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, textAlign = TextAlign.Center)
                BasicTextField(
                    text, { text = it.take(MAX_TEXT) },
                    textStyle = androidx.compose.ui.text.TextStyle(color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 34.sp, textAlign = TextAlign.Center),
                    cursorBrush = SolidColor(Color.White), modifier = Modifier.fillMaxWidth(),
                )
            }
            // Top: close, then emoji and GIF on the right.
            Row(Modifier.fillMaxWidth().statusBarsPadding().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onDismiss) { Icon(Icons.Rounded.Close, stringResource(R.string.close), tint = Color.White) }
                Text(stringResource(R.string.new_story), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Spacer(Modifier.weight(1f))
                ToolButton("😊") { panel = if (panel == "emoji") null else "emoji" }
                Spacer(Modifier.width(8.dp))
                if (gifApi != null) ToolButton("GIF") { panel = if (panel == "gif") null else "gif" }
            }
            // Bottom: colours and Post.
            Column(Modifier.align(Alignment.BottomCenter).fillMaxWidth().imePadding().navigationBarsPadding()) {
                when (panel) {
                    "emoji" -> LazyVerticalGrid(
                        GridCells.Adaptive(44.dp),
                        Modifier.fillMaxWidth().height(220.dp).clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp)).background(Color(0xF0111827)).padding(8.dp),
                    ) {
                        items(StoryEmojis.size) { k ->
                            val e = StoryEmojis[k]
                            Box(Modifier.size(44.dp).clip(RoundedCornerShape(8.dp)).clickable { text = (text + e).take(MAX_TEXT) }, contentAlignment = Alignment.Center) {
                                Text(e, fontSize = 26.sp)
                            }
                        }
                    }
                    "gif" -> if (gifApi != null) Box(
                        Modifier.fillMaxWidth().height(320.dp).clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp)).background(MaterialTheme.colorScheme.surface),
                    ) {
                        app.talklive.ui.chat.GifPanel(gifApi) { g ->
                            if (gifs.size >= MAX_GIFS) { error = maxGifsMsg } else {
                                gifs.add(StoryGif(g.url, g.preview, g.w, g.h, 0.3f + Math.random().toFloat() * 0.4f, 0.25f + Math.random().toFloat() * 0.4f))
                                panel = null
                            }
                        }
                    }
                }
                Row(
                    Modifier.fillMaxWidth().background(Brush.verticalGradient(listOf(Color.Transparent, Color(0x88000000)))).padding(horizontal = 12.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    LazyRow(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(StoryBgs.keys.toList()) { k ->
                            Box(
                                Modifier.size(if (k == bg) 32.dp else 28.dp).clip(CircleShape).background(bgBrush(k))
                                    .border(2.dp, if (k == bg) Color.White else Color.White.copy(alpha = 0.4f), CircleShape)
                                    .clickable { bg = k },
                            )
                        }
                    }
                    Spacer(Modifier.width(10.dp))
                    Box(
                        Modifier.clip(CircleShape).background(Color.White).clickable(enabled = !posting) {
                            if (text.isBlank() && gifs.isEmpty()) { error = emptyMsg; return@clickable }
                            posting = true
                            scope.launch {
                                val err = onPost(text.trim(), bg, gifs.toList())
                                posting = false
                                if (err == null) onDismiss() else error = err
                            }
                        }.padding(horizontal = 20.dp, vertical = 10.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (posting) CircularProgressIndicator(Modifier.size(20.dp), color = Color.Black, strokeWidth = 2.dp)
                        else Text(stringResource(R.string.story_post), color = Color.Black, fontWeight = FontWeight.ExtraBold)
                    }
                }
            }
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
private fun ToolButton(label: String, onClick: () -> Unit) {
    Box(Modifier.size(44.dp).clip(CircleShape).background(Color(0x66000000)).clickable(onClick = onClick), contentAlignment = Alignment.Center) {
        Text(label, color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = if (label.length > 2) 13.sp else 20.sp)
    }
}
