package app.talklive.ui.posts

import android.text.format.DateUtils
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.talklive.R
import app.talklive.posts.Post
import app.talklive.posts.PostComment
import app.talklive.posts.REACTION_TYPES
import app.talklive.social.animalOf
import app.talklive.ui.animals.AnimalAvatar
import app.talklive.ui.components.SlidePullToRefresh
import coil.compose.AsyncImage
import kotlinx.coroutines.launch

private fun emojiOf(type: String) = when (type) {
    "like" -> "👍"
    "love" -> "❤️"
    "haha" -> "😂"
    "wow" -> "😮"
    else -> "😢"
}

private fun ago(ts: Long): String =
    if (ts <= 0) "" else DateUtils.getRelativeTimeSpanString(ts, System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS).toString()

/** "TalkLive news": the posts, newest first, loaded only now that the screen is open. */
@Composable
fun NewsScreen(vm: PostsViewModel, onBack: () -> Unit) {
    val state by vm.state.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { vm.load() }
    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxSize().statusBarsPadding()) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, stringResource(R.string.back), tint = MaterialTheme.colorScheme.onBackground) }
                Text(stringResource(R.string.news_title), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
            }
            // All, or just the news (features, updates, what is coming), or just the posts.
            var filter by androidx.compose.runtime.saveable.rememberSaveable { mutableStateOf("all") }
            val hasNews = state.posts.any { it.kind == "news" }
            if (hasNews) Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("all" to R.string.news_filter_all, "news" to R.string.news_filter_news, "post" to R.string.news_filter_posts).forEach { (k, label) ->
                    androidx.compose.material3.FilterChip(
                        selected = filter == k, onClick = { filter = k },
                        label = { Text(stringResource(label)) },
                    )
                }
            }
            val shown = if (filter == "all") state.posts else state.posts.filter { it.kind == filter }
            SlidePullToRefresh(refreshing = state.loading && state.loaded, onRefresh = { vm.load() }, modifier = Modifier.weight(1f)) {
                when {
                    shown.isNotEmpty() -> LazyColumn(Modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        items(shown, key = { it.id }) { p ->
                            PostCard(p, state.canComment, onReact = { type -> vm.react(p.id, type) }, onComment = { text -> vm.comment(p.id, text) })
                        }
                    }
                    state.posts.isEmpty() && (state.loading || !state.loaded && !state.error) -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                    else -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text(
                            stringResource(if (state.error) R.string.news_error else R.string.news_empty),
                            style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

/** The pinned-post pushpin: domed blue head, darker collar, silver needle, tilted 28 degrees, in a soft blue disc. */
@Composable
fun PinIcon(modifier: Modifier = Modifier) {
    val desc = stringResource(R.string.post_pinned)
    androidx.compose.foundation.Canvas(
        modifier.size(20.dp).clip(CircleShape).background(app.talklive.ui.theme.BrandBlue.copy(alpha = 0.14f))
            .semantics { contentDescription = desc },
    ) {
        val u = size.minDimension / 20f
        rotate(28f, pivot = androidx.compose.ui.geometry.Offset(size.width / 2f, size.height / 2f)) {
            // Needle.
            drawRoundRect(
                brush = androidx.compose.ui.graphics.Brush.verticalGradient(
                    listOf(androidx.compose.ui.graphics.Color(0xFFE5E9F0), androidx.compose.ui.graphics.Color(0xFF8B95A7)),
                    startY = 11.5f * u, endY = 17.5f * u,
                ),
                topLeft = androidx.compose.ui.geometry.Offset(9.4f * u, 11.5f * u),
                size = androidx.compose.ui.geometry.Size(1.2f * u, 6f * u),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(0.6f * u),
            )
            // Collar.
            drawRoundRect(
                color = androidx.compose.ui.graphics.Color(0xFF174BB0),
                topLeft = androidx.compose.ui.geometry.Offset(6.6f * u, 9.6f * u),
                size = androidx.compose.ui.geometry.Size(6.8f * u, 2.2f * u),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(1f * u),
            )
            // Domed head.
            val head = androidx.compose.ui.graphics.Path().apply {
                moveTo(6.2f * u, 9.8f * u)
                cubicTo(6.2f * u, 4.2f * u, 13.8f * u, 4.2f * u, 13.8f * u, 9.8f * u)
                close()
            }
            drawPath(
                head,
                androidx.compose.ui.graphics.Brush.linearGradient(
                    listOf(androidx.compose.ui.graphics.Color(0xFF5AA2FF), androidx.compose.ui.graphics.Color(0xFF1F5FD6)),
                    start = androidx.compose.ui.geometry.Offset(7f * u, 4.5f * u), end = androidx.compose.ui.geometry.Offset(13f * u, 10f * u),
                ),
            )
            // Highlight.
            drawOval(
                color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.85f),
                topLeft = androidx.compose.ui.geometry.Offset(7.8f * u, 6f * u),
                size = androidx.compose.ui.geometry.Size(1.6f * u, 2.2f * u),
            )
        }
    }
}

/** TalkLive's own avatar on posts and replies: a person silhouette on a calm slate-blue disc (same as the website). */
@Composable
fun TeamAvatar(size: androidx.compose.ui.unit.Dp, modifier: Modifier = Modifier) {
    androidx.compose.foundation.Canvas(modifier.size(size).clip(CircleShape)) {
        val w = this.size.width
        drawRect(androidx.compose.ui.graphics.Brush.linearGradient(listOf(androidx.compose.ui.graphics.Color(0xFF3B4A66), androidx.compose.ui.graphics.Color(0xFF1F2A40))))
        val fg = androidx.compose.ui.graphics.Color(0xFFCFE0FF)
        // Head.
        drawCircle(fg, radius = w * 0.156f, center = androidx.compose.ui.geometry.Offset(w * 0.5f, w * 0.39f))
        // Shoulders: an arc rising from the bottom of the disc.
        val path = androidx.compose.ui.graphics.Path().apply {
            moveTo(w * 0.2f, w * 1.0f)
            cubicTo(w * 0.2f, w * 0.7f, w * 0.34f, w * 0.585f, w * 0.5f, w * 0.585f)
            cubicTo(w * 0.66f, w * 0.585f, w * 0.8f, w * 0.7f, w * 0.8f, w * 1.0f)
            close()
        }
        drawPath(path, fg)
    }
}

/** A coloured chip for a news item's tag: New feature, Update, Coming soon, Fix, Event. */
@Composable
fun NewsTagChip(tag: String) {
    val (label, color) = when (tag) {
        "feature" -> R.string.news_tag_feature to androidx.compose.ui.graphics.Color(0xFF1F9D55)
        "upcoming" -> R.string.news_tag_upcoming to androidx.compose.ui.graphics.Color(0xFF8B5CF6)
        "fix" -> R.string.news_tag_fix to androidx.compose.ui.graphics.Color(0xFFD97706)
        "event" -> R.string.news_tag_event to androidx.compose.ui.graphics.Color(0xFFE0457B)
        else -> R.string.news_tag_update to androidx.compose.ui.graphics.Color(0xFF2A6FE8)
    }
    Text(
        stringResource(label).uppercase(),
        style = MaterialTheme.typography.labelSmall,
        color = androidx.compose.ui.graphics.Color.White,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(color).padding(horizontal = 9.dp, vertical = 3.dp),
    )
}

@Composable
private fun PostHeader(post: Post) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        TeamAvatar(38.dp)
        Spacer(Modifier.width(10.dp))
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.from_talklive), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
                if (post.pinned) {
                    Spacer(Modifier.width(6.dp))
                    PinIcon()
                }
            }
            Text(ago(post.createdAt), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** A news item's tag and title (nothing for an ordinary post). */
@Composable
private fun NewsTitle(post: Post, modifier: Modifier = Modifier) {
    if (post.kind != "news" || post.title == null) return
    Column(modifier) {
        post.tag?.let { NewsTagChip(it); Spacer(Modifier.height(6.dp)) }
        Text(post.title, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
    }
}

/** One post like a Facebook card: text, picture, reactions with counts, comments, a comment box. */
@Composable
fun PostCard(post: Post, canComment: Boolean, onReact: (String?) -> Unit, onComment: suspend (String) -> String?) {
    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(14.dp)) {
            PostHeader(post)
            NewsTitle(post, Modifier.padding(top = 10.dp))
            if (post.text.isNotBlank()) {
                Spacer(Modifier.height(if (post.title != null) 6.dp else 10.dp))
                Text(post.text, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface)
            }
            post.image?.let { url ->
                Spacer(Modifier.height(10.dp))
                AsyncImage(url, null, Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)), contentScale = ContentScale.FillWidth)
            }
            Spacer(Modifier.height(10.dp))
            // Totals: the top reactions and how many people reacted.
            if (post.total > 0 || post.commentCount > 0) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (post.total > 0) {
                        Text(
                            post.counts.filterValues { it > 0 }.entries.sortedByDescending { it.value }.take(3).joinToString("") { emojiOf(it.key) } + " " + post.total,
                            style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Spacer(Modifier.weight(1f))
                    if (post.commentCount > 0) Text(
                        pluralStringResource(R.plurals.post_comments, post.commentCount, post.commentCount),
                        style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Spacer(Modifier.height(8.dp))
            }
            // The five reactions; the chosen one is lit, tapping it again takes it back.
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                REACTION_TYPES.forEach { t ->
                    val on = post.mine == t
                    Row(
                        Modifier.weight(1f).clip(RoundedCornerShape(50))
                            .background(if (on) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.background)
                            .border(1.dp, if (on) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(50))
                            .clickable { onReact(if (on) null else t) }.padding(vertical = 7.dp),
                        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(emojiOf(t), style = MaterialTheme.typography.bodyLarge)
                        val n = post.counts[t] ?: 0
                        if (n > 0) Text(" $n", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            CommentsSection(post, canComment, onComment)
        }
    }
}

@Composable
private fun CommentsSection(post: Post, canComment: Boolean, onComment: suspend (String) -> String?) {
    var all by remember { mutableStateOf(false) }
    val shown = if (all || post.comments.size <= 2) post.comments else post.comments.takeLast(2)
    Column(Modifier.fillMaxWidth().padding(top = 10.dp)) {
        if (!all && post.commentCount > shown.size) {
            TextButton(onClick = { all = true }) { Text(stringResource(R.string.view_all_comments, post.commentCount)) }
        }
        shown.forEach { CommentRow(it) }
        if (canComment) CommentBox(onComment) else Text(
            stringResource(R.string.comment_verify),
            style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 6.dp),
        )
    }
}

@Composable
private fun CommentRow(c: PostComment) {
    Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.Top) {
        if (c.admin) TeamAvatar(30.dp)
        else AnimalAvatar(animalOf(c.avatar), c.name, 30.dp)
        Spacer(Modifier.width(8.dp))
        Column(Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.background).padding(horizontal = 12.dp, vertical = 8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(c.name, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                if (c.admin) Text("  " + stringResource(R.string.admin_tag), style = MaterialTheme.typography.labelSmall, color = app.talklive.ui.theme.AccentText)
                Text("  " + ago(c.ts), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
            }
            Text(c.text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
private fun CommentBox(onComment: suspend (String) -> String?) {
    var text by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var problem by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxWidth().padding(top = 6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = text, onValueChange = { text = it.take(500); problem = null },
                placeholder = { Text(stringResource(R.string.comment_hint)) },
                modifier = Modifier.weight(1f), shape = RoundedCornerShape(24.dp), maxLines = 4,
            )
            IconButton(
                enabled = text.isNotBlank() && !busy,
                onClick = {
                    val t = text.trim()
                    busy = true
                    scope.launch {
                        val r = onComment(t)
                        busy = false
                        if (r == null) text = "" else problem = r
                    }
                },
            ) { Icon(Icons.AutoMirrored.Rounded.Send, stringResource(R.string.send), tint = MaterialTheme.colorScheme.primary) }
        }
        problem?.let { r ->
            Text(
                stringResource(when (r) { "verify" -> R.string.comment_verify; "rate" -> R.string.comment_rate; "blocked" -> R.string.comment_blocked; else -> R.string.t_couldnt_send }),
                style = MaterialTheme.typography.labelMedium, color = app.talklive.ui.theme.DangerText,
            )
        }
    }
}

/** Home's small card for the latest post; tap opens the news. */
@Composable
fun LatestPostCard(post: Post, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Surface(onClick = onClick, shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface, modifier = modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp)) {
            PostHeader(post)
            NewsTitle(post, Modifier.padding(top = 8.dp))
            if (post.text.isNotBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(post.text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 3, overflow = TextOverflow.Ellipsis)
            }
            post.image?.let { url ->
                Spacer(Modifier.height(8.dp))
                AsyncImage(url, null, Modifier.fillMaxWidth().height(150.dp).clip(RoundedCornerShape(12.dp)), contentScale = ContentScale.Crop)
            }
            if (post.total > 0 || post.commentCount > 0) {
                Spacer(Modifier.height(8.dp))
                Text(
                    listOfNotNull(
                        post.total.takeIf { it > 0 }?.let { "👍 $it" },
                        post.commentCount.takeIf { it > 0 }?.let { pluralStringResource(R.plurals.post_comments, it, it) },
                    ).joinToString("  ·  "),
                    style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
