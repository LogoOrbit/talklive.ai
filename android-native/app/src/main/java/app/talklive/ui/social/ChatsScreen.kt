package app.talklive.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.DoneAll
import androidx.compose.material.icons.rounded.NotificationsOff
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.talklive.R
import app.talklive.ui.components.BrandGradient
import app.talklive.ui.main.EmptyTab
import app.talklive.ui.main.MainTab

@Composable
fun ChatsScreen(vm: SocialViewModel, onOpenChat: (String) -> Unit, onStartTalking: () -> Unit) {
    val conversations by vm.conversations.collectAsStateWithLifecycle()
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Text(
            stringResource(R.string.tab_chats),
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(start = 24.dp, top = 20.dp, bottom = 8.dp),
        )
        if (conversations.isEmpty()) {
            Box(Modifier.weight(1f)) { EmptyTab(MainTab.Chats, onStart = onStartTalking, showTitle = false) }
            return@Column
        }
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(vertical = 4.dp)) {
            items(conversations, key = { it.person.clientId }) { c -> ConversationRow(c, Modifier.animateItem()) { onOpenChat(c.person.clientId) } }
        }
    }
}

@Composable
private fun ConversationRow(c: Conversation, modifier: Modifier, onClick: () -> Unit) {
    val p = c.person
    val last = p.last
    val bold = c.unread > 0
    Row(
        modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        PersonAvatar(p, 54.dp)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    p.displayName, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground,
                    maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false),
                )
                if (c.muted) {
                    Spacer(Modifier.width(6.dp))
                    Icon(Icons.Rounded.NotificationsOff, null, Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(Modifier.weight(1f))
                Text(
                    shortTime(last?.ts ?: 0), style = MaterialTheme.typography.labelMedium,
                    color = if (bold) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.height(2.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (c.typing) {
                    Text(stringResource(R.string.typing), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary, modifier = Modifier.weight(1f))
                } else {
                    if (last?.mine == true) {
                        Icon(
                            Icons.Rounded.DoneAll, null, Modifier.size(16.dp),
                            tint = if (last.seen) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.width(4.dp))
                    }
                    Text(
                        last?.preview.orEmpty(),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (bold) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (bold) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
                    )
                }
                if (c.unread > 0) {
                    Spacer(Modifier.width(8.dp))
                    Box(
                        Modifier.widthIn(min = 22.dp).height(22.dp).clip(CircleShape)
                            .background(if (c.muted) androidx.compose.ui.graphics.SolidColor(MaterialTheme.colorScheme.onSurfaceVariant) else BrandGradient)
                            .padding(horizontal = 6.dp),
                        contentAlignment = Alignment.Center,
                    ) { Text(if (c.unread > 99) "99+" else c.unread.toString(), color = Color.White, style = MaterialTheme.typography.labelMedium) }
                }
            }
        }
    }
}
