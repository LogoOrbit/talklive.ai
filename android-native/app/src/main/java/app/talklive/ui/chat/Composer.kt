package app.talklive.ui.chat

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
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
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.staggeredgrid.LazyVerticalStaggeredGrid
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridCells
import androidx.compose.foundation.lazy.staggeredgrid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.EmojiEmotions
import androidx.compose.material.icons.rounded.Keyboard
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import app.talklive.R
import app.talklive.chat.GifApi
import app.talklive.social.Gif
import app.talklive.ui.components.BrandGradient
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.delay

/** One tile in the "+" tray: a big, labelled button anyone can understand. */
data class ChatAction(
    val icon: ImageVector,
    val label: String,
    val tint: Color? = null,
    val enabled: Boolean = true,
    /** Stays open after a tap, so the tile can show what happened (e.g. "Request sent"). */
    val keepOpen: Boolean = false,
    /** Done state: green with a check, still tappable for a reminder. */
    val done: Boolean = false,
    val onClick: () -> Unit,
)

private enum class Panel { None, Actions, Emoji, Gif }

@EntryPoint
@InstallIn(SingletonComponent::class)
interface GifEntryPoint { fun gifs(): GifApi }

/**
 * The chat composer used by stranger chats and friend chats:
 *  [+]  [ message ............ 😊 GIF ]  [send | trailing]
 * "+" opens a tray of labelled actions (add friend, voice call, game,
 * report...), so the header stays calm. Emoji and GIF panels take the
 * keyboard's place, like a messaging app.
 */
@Composable
fun Composer(
    draft: String,
    onDraft: (String) -> Unit,
    onSend: () -> Unit,
    onGif: ((Gif) -> Unit)?,
    actions: List<ChatAction>,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    hint: String = stringResource(R.string.message_hint),
    /** Shown instead of the send button while the draft is empty (voice notes). */
    idleTrailing: (@Composable () -> Unit)? = null,
) {
    var panel by remember { mutableStateOf(Panel.None) }
    val keyboard = LocalSoftwareKeyboardController.current
    val context = LocalContext.current
    val gifApi = remember { runCatching { EntryPointAccessors.fromApplication(context.applicationContext, GifEntryPoint::class.java).gifs() }.getOrNull() }
    var gifsOn by remember { mutableStateOf(false) }
    LaunchedEffect(onGif) {
        gifsOn = onGif != null && gifApi?.available() == true
        if (gifsOn) runCatching { gifApi?.warm(context) }
    }
    BackHandler(enabled = panel != Panel.None) { panel = Panel.None }
    // Tapping the text field brings the keyboard back in place of a panel.
    val fieldTaps = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
    LaunchedEffect(fieldTaps) {
        fieldTaps.interactions.collect { if (it is androidx.compose.foundation.interaction.PressInteraction.Release) panel = Panel.None }
    }

    fun toggle(p: Panel) {
        if (panel == p) { panel = Panel.None; keyboard?.show() } else { keyboard?.hide(); panel = p }
    }

    Column(modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp), verticalAlignment = Alignment.Bottom) {
            if (actions.isNotEmpty()) {
                val turn by animateFloatAsState(if (panel == Panel.Actions) 45f else 0f, spring(dampingRatio = 0.6f), label = "plus")
                Box(
                    Modifier.size(48.dp).clip(CircleShape)
                        .background(if (panel == Panel.Actions) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                        .clickable(enabled = enabled) { toggle(Panel.Actions) },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Rounded.Add, stringResource(R.string.more_actions),
                        tint = if (panel == Panel.Actions) Color.White else MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.rotate(turn),
                    )
                }
                Spacer(Modifier.width(8.dp))
            }
            Row(
                Modifier.weight(1f).heightIn(min = 48.dp).clip(RoundedCornerShape(24.dp)).background(MaterialTheme.colorScheme.background),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.weight(1f).padding(start = 18.dp, top = 13.dp, bottom = 13.dp), contentAlignment = Alignment.CenterStart) {
                    if (draft.isEmpty()) Text(hint, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyLarge, maxLines = 1)
                    BasicTextField(
                        value = draft,
                        onValueChange = { onDraft(it.take(1000)) },
                        enabled = enabled,
                        textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                        maxLines = 5,
                        interactionSource = fieldTaps,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                // Emoji, and GIF when the server offers it.
                Box(
                    Modifier.size(40.dp).clip(CircleShape).clickable(enabled = enabled) { toggle(Panel.Emoji) },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        if (panel == Panel.Emoji) Icons.Rounded.Keyboard else Icons.Rounded.EmojiEmotions, stringResource(R.string.emoji),
                        tint = if (panel == Panel.Emoji) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (gifsOn) {
                    Box(
                        Modifier.padding(end = 8.dp).clip(RoundedCornerShape(8.dp))
                            .background(if (panel == Panel.Gif) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                            .clickable(enabled = enabled) { toggle(Panel.Gif) }
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                    ) {
                        Text("GIF", fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, color = if (panel == Panel.Gif) Color.White else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                } else Spacer(Modifier.width(6.dp))
            }
            Spacer(Modifier.width(8.dp))
            AnimatedContent(
                targetState = draft.isNotBlank() || idleTrailing == null,
                transitionSpec = { (scaleIn(spring(dampingRatio = 0.5f)) + fadeIn()) togetherWith (scaleOut() + fadeOut()) },
                label = "send",
            ) { showSend ->
                if (showSend) {
                    val ready = draft.isNotBlank() && enabled
                    Box(
                        Modifier.size(48.dp).clip(CircleShape)
                            .background(if (ready) BrandGradient else SolidColor(MaterialTheme.colorScheme.surfaceVariant))
                            .clickable(enabled = ready) { onSend() },
                        contentAlignment = Alignment.Center,
                    ) { Icon(Icons.AutoMirrored.Rounded.Send, stringResource(R.string.send), tint = if (ready) Color.White else MaterialTheme.colorScheme.onSurfaceVariant) }
                } else idleTrailing?.invoke()
            }
        }

        AnimatedVisibility(panel != Panel.None, enter = expandVertically() + fadeIn(), exit = shrinkVertically() + fadeOut()) {
            Box(Modifier.fillMaxWidth().height(if (panel == Panel.Actions) 210.dp else 300.dp)) {
                when (panel) {
                    Panel.Actions -> ActionTray(actions) { panel = Panel.None }
                    Panel.Emoji -> EmojiPanel { e -> onDraft((draft + e).take(1000)) }
                    Panel.Gif -> if (gifApi != null) GifPanel(gifApi) { g -> onGif?.invoke(g); panel = Panel.None }
                    Panel.None -> Unit
                }
            }
        }
        Spacer(Modifier.navigationBarsPadding())
    }
}

@Composable
private fun ActionTray(actions: List<ChatAction>, close: () -> Unit) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(4),
        contentPadding = PaddingValues(12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        modifier = Modifier.fillMaxSize(),
    ) {
        items(actions, key = { it.label + it.icon.name }) { a ->
            val bounce = remember { androidx.compose.animation.core.Animatable(1f) }
            val scope = rememberCoroutineScope()
            Column(
                Modifier.clip(RoundedCornerShape(16.dp)).clickable(enabled = a.enabled) {
                    app.talklive.sound.Tap.pop()
                    scope.launch {
                        bounce.animateTo(0.82f, androidx.compose.animation.core.tween(70))
                        bounce.animateTo(1f, androidx.compose.animation.core.spring(dampingRatio = 0.35f, stiffness = 500f))
                    }
                    if (!a.keepOpen) close()
                    a.onClick()
                }.padding(vertical = 6.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                val bg = when {
                    a.done -> SolidColor(app.talklive.ui.theme.Success)
                    !a.enabled -> SolidColor(MaterialTheme.colorScheme.surfaceVariant)
                    else -> a.tint?.let { SolidColor(it) } ?: BrandGradient
                }
                Box(
                    Modifier.size(56.dp).graphicsLayer { scaleX = bounce.value; scaleY = bounce.value }.clip(RoundedCornerShape(18.dp)).background(bg),
                    contentAlignment = Alignment.Center,
                ) {
                    androidx.compose.animation.AnimatedContent(a.icon, transitionSpec = {
                        (androidx.compose.animation.scaleIn(initialScale = 0.4f) + androidx.compose.animation.fadeIn()) togetherWith androidx.compose.animation.fadeOut()
                    }, label = "tile") { icon ->
                        Icon(icon, null, tint = if (a.enabled) Color.White else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(26.dp))
                    }
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    a.label, style = MaterialTheme.typography.labelMedium, textAlign = TextAlign.Center, maxLines = 2,
                    color = if (a.enabled) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

/** The website's emoji set (public/chat-extras.js), with recents first. */
private val EMOJI_GROUPS = listOf(
    "😀" to "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😌 😍 🥰 😘 😚 😋 😛 😜 🤪 😎 🤓 🥳 🤗 🤔 🤭 🫢 😐 😶 🙄 😏 😬 😒 😞 😔 😟 😕 🙁 ☹️ 😫 😩 🥺 😪 😓 😥 😢 😭 😱 😨 😰 😳 🥵 🥶 😴 🤤 😡 😠 🤬 😈 👿 💀 💩 🤡 👹 👽 🤖 😻 😹 😿 🙈 🙉 🙊",
    "👋" to "👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🙏 ✍️ 💪 🤳 🤝 💅 👀 🫡",
    "❤️" to "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 💯 💥 💫 ✨ ⭐ 🌟 🔥 🎉 🎊 🎁 🎈 🏆 🥇",
    "🐶" to "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦉 🐺 🦄 🐝 🦋 🐢 🐍 🐙 🐟 🐬 🐳 🦈 🌸 🌺 🌻 🌹 🌷 🌲 🌴 🍀 🌍 🌙 ☀️ ⛅ 🌈 🌧️ ⛄ ❄️ 🌊",
    "🍕" to "🍕 🍔 🍟 🌭 🌮 🌯 🍜 🍝 🍣 🍱 🥟 🍩 🍪 🎂 🍰 🍫 🍿 🍦 ☕ 🍵 🧋 🍺 🍷 🍹 🥤 🍎 🍌 🍉 🍓 🥑 🌶️",
    "⚽" to "⚽ 🏀 🏈 ⚾ 🎾 🏐 🏓 🥊 🎮 🕹️ 🎲 ♟️ 🎯 🎵 🎶 🎸 🎹 🥁 🎤 🎧 🎬 📷 📚 ✈️ 🚗 🏍️ 🚀 🏖️ 🏔️ 🗽 🏠 💰 💡 📱 💻 ⌚ 🕒 ✅ ❌ ❓ ❗ 💤 🆗 🆒",
)

private val recentEmoji = mutableStateListOf<String>()

@Composable
private fun EmojiPanel(onPick: (String) -> Unit) {
    var group by remember { mutableStateOf(if (recentEmoji.isEmpty()) 1 else 0) }
    Column(Modifier.fillMaxSize()) {
        LazyRow(contentPadding = PaddingValues(horizontal = 8.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            item {
                if (recentEmoji.isNotEmpty()) TabIcon("🕘", group == 0) { group = 0 }
            }
            itemsIndexed(EMOJI_GROUPS) { i, (icon, _) -> TabIcon(icon, group == i + 1) { group = i + 1 } }
        }
        val list = if (group == 0) recentEmoji.toList() else EMOJI_GROUPS[group - 1].second.split(" ")
        LazyVerticalGrid(columns = GridCells.Adaptive(46.dp), contentPadding = PaddingValues(8.dp), modifier = Modifier.fillMaxSize()) {
            items(list) { e ->
                Box(
                    Modifier.aspectRatio(1f).clip(RoundedCornerShape(12.dp)).clickable {
                        onPick(e)
                        recentEmoji.remove(e); recentEmoji.add(0, e)
                        if (recentEmoji.size > 24) recentEmoji.removeAt(recentEmoji.lastIndex)
                    },
                    contentAlignment = Alignment.Center,
                ) { Text(e, fontSize = 28.sp) }
            }
        }
    }
}

@Composable
private fun TabIcon(e: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.size(42.dp).clip(RoundedCornerShape(12.dp))
            .background(if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.18f) else Color.Transparent)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Text(e, fontSize = 22.sp) }
}

@Composable
private fun GifPanel(api: GifApi, onPick: (Gif) -> Unit) {
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf(api.cached("")) }
    LaunchedEffect(query) {
        api.cached(query)?.let { results = it; return@LaunchedEffect }
        if (query.isNotBlank()) delay(350)
        results = null
        results = api.search(query)
    }
    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp).clip(RoundedCornerShape(20.dp))
                .background(MaterialTheme.colorScheme.background).padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.Search, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Box(Modifier.weight(1f)) {
                if (query.isEmpty()) Text(stringResource(R.string.gif_search), color = MaterialTheme.colorScheme.onSurfaceVariant)
                BasicTextField(
                    query, { query = it.take(50) }, singleLine = true,
                    textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.primary), modifier = Modifier.fillMaxWidth(),
                )
            }
        }
        val list = results
        when {
            list == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(28.dp)) }
            list.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(stringResource(R.string.gif_none), color = MaterialTheme.colorScheme.onSurfaceVariant) }
            else -> LazyVerticalStaggeredGrid(
                columns = StaggeredGridCells.Fixed(2),
                contentPadding = PaddingValues(8.dp),
                verticalItemSpacing = 6.dp,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                items(list, key = { it.url }) { g ->
                    AsyncImage(
                        model = g.preview, contentDescription = g.alt, contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxWidth().aspectRatio(if (g.w > 0 && g.h > 0) g.w.toFloat() / g.h else 1.4f)
                            .clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant).clickable { onPick(g) },
                    )
                }
            }
        }
        Text("Powered by GIPHY", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.align(Alignment.End).padding(end = 12.dp, bottom = 4.dp))
    }
}
