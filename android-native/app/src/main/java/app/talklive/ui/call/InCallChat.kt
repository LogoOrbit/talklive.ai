package app.talklive.ui.call

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.social.ChatMessage
import app.talklive.social.Gif
import app.talklive.ui.components.BrandGradient
import coil.compose.AsyncImage

/**
 * Messages with the person you are talking to, without leaving the call:
 * text, emoji and GIFs (no icebreakers here; you are already talking).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InCallChat(
    name: String,
    messages: List<ChatMessage>,
    partnerTyping: Boolean,
    onSend: (String) -> Unit,
    onSendGif: (Gif) -> Unit,
    onTyping: () -> Unit,
    onDismiss: () -> Unit,
) {
    var draft by remember { mutableStateOf("") }
    val list = rememberLazyListState()
    LaunchedEffect(messages.size) { if (messages.isNotEmpty()) list.animateScrollToItem(messages.lastIndex) }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.background,
    ) {
        Column(Modifier.fillMaxWidth().fillMaxHeight(0.75f).navigationBarsPadding().imePadding()) {
            Text(
                stringResource(R.string.chat_with, name),
                style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
            )
            LazyColumn(
                state = list,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(6.dp),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 10.dp),
            ) {
                if (messages.isEmpty()) item {
                    Text(
                        stringResource(R.string.in_call_chat_empty), style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
                items(messages, key = { it.id }) { m -> Bubble(m) }
                if (partnerTyping) item(key = "typing") {
                    Text(stringResource(R.string.typing), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                }
            }
            app.talklive.ui.chat.Composer(
                draft = draft,
                onDraft = { draft = it; if (it.isNotBlank()) onTyping() },
                onSend = { if (draft.isNotBlank()) { onSend(draft.trim()); draft = "" } },
                onGif = onSendGif,
                actions = emptyList(),
            )
        }
    }
}

@Composable
private fun Bubble(m: ChatMessage) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (m.mine) Arrangement.End else Arrangement.Start) {
        val shape = RoundedCornerShape(18.dp)
        if (m.gifUrl != null) {
            AsyncImage(
                model = m.gifUrl, contentDescription = null, contentScale = ContentScale.Crop,
                modifier = Modifier.widthIn(max = 220.dp).size(width = 200.dp, height = 150.dp).clip(shape),
            )
        } else {
            Box(
                Modifier.widthIn(max = 280.dp).clip(shape)
                    .then(if (m.mine) Modifier.background(BrandGradient) else Modifier.background(MaterialTheme.colorScheme.surfaceVariant))
                    .padding(horizontal = 14.dp, vertical = 9.dp),
            ) {
                Text(m.text, style = MaterialTheme.typography.bodyLarge, color = if (m.mine) Color.White else MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}

/** A small note that slides in at the top for two seconds (a friend calling or messaging mid-call). */
@Composable
fun MiniNote(text: String?, modifier: Modifier = Modifier) {
    androidx.compose.animation.AnimatedVisibility(
        visible = text != null,
        enter = androidx.compose.animation.slideInVertically { -it } + androidx.compose.animation.fadeIn(),
        exit = androidx.compose.animation.slideOutVertically { -it } + androidx.compose.animation.fadeOut(),
        modifier = modifier,
    ) {
        var last by remember { mutableStateOf("") }
        if (text != null) last = text
        Box(
            Modifier.clip(RoundedCornerShape(50)).background(MaterialTheme.colorScheme.surfaceVariant).padding(horizontal = 14.dp, vertical = 8.dp),
            contentAlignment = Alignment.Center,
        ) { Text(last, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface, maxLines = 1) }
    }
}
