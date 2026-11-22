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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
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
            SlidePullToRefresh(refreshing = state.loading && state.loaded, onRefresh = { vm.load() }, modifier = Modifier.weight(1f)) {
                when {
                    state.posts.isNotEmpty() -> LazyColumn(Modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        items(state.posts, key = { it.id }) { p ->
                            PostCard(p, state.canComment, onReact = { type -> vm.react(p.id, type) }, onComment = { text -> vm.comment(p.id, text) })
                        }
                    }
                    state.loading || !state.loaded && !state.error -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
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

@Composable
private fun PostHeader(post: Post) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Image(painterResource(R.drawable.logo), null, Modifier.size(38.dp).clip(CircleShape))
        Spacer(Modifier.width(10.dp))
        Column {
            Text(stringResource(R.string.from_talklive), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
            Text(ago(post.createdAt), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** One post like a Facebook card: text, picture, reactions with counts, comments, a comment box. */
@Composable
fun PostCard(post: Post, canComment: Boolean, onReact: (String?) -> Unit, onComment: suspend (String) -> String?) {
    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(14.dp)) {
            PostHeader(post)
            if (post.text.isNotBlank()) {
                Spacer(Modifier.height(10.dp))
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
        if (c.admin) Image(painterResource(R.drawable.logo), null, Modifier.size(30.dp).clip(CircleShape))
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
