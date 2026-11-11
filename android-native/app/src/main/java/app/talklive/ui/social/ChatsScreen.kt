package app.talklive.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.runtime.setValue
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Archive
import androidx.compose.material.icons.rounded.Unarchive
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material.icons.rounded.Edit
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
import androidx.compose.material.icons.rounded.Done
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

@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class, androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun ChatsScreen(vm: SocialViewModel, onOpenChat: (String) -> Unit, onStartTalking: () -> Unit) {
    val conversations by vm.conversations.collectAsStateWithLifecycle()
    val archived by vm.archived.collectAsStateWithLifecycle()
    var showArchived by androidx.compose.runtime.saveable.rememberSaveable { androidx.compose.runtime.mutableStateOf(false) }
    var menuFor by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf<Conversation?>(null) }
    var confirm by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf<Pair<String, Conversation>?>(null) }
    var renaming by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf<Conversation?>(null) }
    val haptics = androidx.compose.ui.platform.LocalHapticFeedback.current
    val active = conversations.filter { it.person.clientId !in archived }
    val stored = conversations.filter { it.person.clientId in archived }
    val shown = if (showArchived) stored else active
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Row(Modifier.padding(start = if (showArchived) 8.dp else 24.dp, top = 20.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            if (showArchived) androidx.compose.material3.IconButton(onClick = { showArchived = false }) {
                Icon(Icons.AutoMirrored.Rounded.ArrowBack, stringResource(R.string.back))
            }
            Text(
                stringResource(if (showArchived) R.string.archived else R.string.tab_chats),
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground,
            )
        }
        if (showArchived) androidx.activity.compose.BackHandler { showArchived = false }
        if (conversations.isEmpty()) {
            Box(Modifier.weight(1f)) { EmptyTab(MainTab.Chats, onStart = onStartTalking, showTitle = false) }
            return@Column
        }
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(vertical = 4.dp)) {
            // Archived chats sit in one row at the top, like other messengers.
            if (!showArchived && stored.isNotEmpty()) item(key = "archived") {
                Row(
                    Modifier.fillMaxWidth().clickable { app.talklive.sound.Tap.soft(); showArchived = true }.padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.size(54.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                        Icon(Icons.Rounded.Archive, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Spacer(Modifier.width(14.dp))
                    Text(stringResource(R.string.archived), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                    Text(stored.size.toString(), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            items(shown, key = { it.person.clientId }) { c ->
                ConversationRow(
                    c,
                    Modifier.animateItem(),
                    onLongClick = { haptics.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress); menuFor = c },
                ) { onOpenChat(c.person.clientId) }
            }
        }
    }

    menuFor?.let { c ->
        val id = c.person.clientId
        val isArchived = id in archived
        androidx.compose.material3.ModalBottomSheet(onDismissRequest = { menuFor = null }, containerColor = MaterialTheme.colorScheme.background) {
            Column(Modifier.fillMaxWidth().padding(bottom = 24.dp)) {
                Row(Modifier.padding(horizontal = 24.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    PersonAvatar(c.person, 44.dp)
                    Spacer(Modifier.width(12.dp))
                    app.talklive.ui.components.PlusName(c.person.displayName, c.person.premium, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
                }
                @Composable
                fun item(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, color: Color = MaterialTheme.colorScheme.onSurface, onClick: () -> Unit) =
                    Row(
                        Modifier.fillMaxWidth().clickable { app.talklive.sound.Tap.soft(); onClick() }.padding(horizontal = 24.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(icon, null, tint = color)
                        Spacer(Modifier.width(16.dp))
                        Text(label, style = MaterialTheme.typography.bodyLarge, color = color)
                    }
                item(if (isArchived) Icons.Rounded.Unarchive else Icons.Rounded.Archive, stringResource(if (isArchived) R.string.unarchive else R.string.archive)) {
                    vm.setArchived(id, !isArchived); menuFor = null
                }
                if (c.isFriend) item(Icons.Rounded.Edit, stringResource(R.string.rename)) { renaming = c; menuFor = null }
                item(if (c.muted) Icons.Rounded.Notifications else Icons.Rounded.NotificationsOff, stringResource(if (c.muted) R.string.unmute_chat else R.string.mute_chat)) {
                    vm.setMuted(id, !c.muted); menuFor = null
                }
                item(Icons.Rounded.Delete, stringResource(R.string.delete_chat), app.talklive.ui.theme.Danger) { confirm = "delete" to c; menuFor = null }
                item(Icons.Rounded.Block, stringResource(R.string.block), app.talklive.ui.theme.Danger) { confirm = "block" to c; menuFor = null }
            }
        }
    }

    renaming?.let { c ->
        var name by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(c.person.displayName) }
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { renaming = null },
            title = { Text(stringResource(R.string.rename)) },
            text = { androidx.compose.material3.OutlinedTextField(name, { name = it.take(32) }, singleLine = true) },
            confirmButton = { androidx.compose.material3.TextButton(onClick = { vm.rename(c.person.clientId, name.trim()); renaming = null }) { Text(stringResource(R.string.save)) } },
            dismissButton = { androidx.compose.material3.TextButton(onClick = { renaming = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }

    confirm?.let { (what, c) ->
        val name = c.person.displayName
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { confirm = null },
            title = { Text(if (what == "block") stringResource(R.string.block_title, name) else stringResource(R.string.delete_chat_title)) },
            text = { Text(stringResource(if (what == "block") R.string.block_body else R.string.delete_chat_body)) },
            confirmButton = {
                androidx.compose.material3.TextButton(onClick = {
                    if (what == "block") vm.block(c.person.clientId) else { vm.clearChat(c.person.clientId); vm.setArchived(c.person.clientId, false) }
                    confirm = null
                }) { Text(stringResource(if (what == "block") R.string.block else R.string.delete), color = app.talklive.ui.theme.DangerText) }
            },
            dismissButton = { androidx.compose.material3.TextButton(onClick = { confirm = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
private fun ConversationRow(c: Conversation, modifier: Modifier, onLongClick: () -> Unit = {}, onClick: () -> Unit) {
    val p = c.person
    val last = p.last
    val bold = c.unread > 0
    Row(
        modifier.fillMaxWidth().combinedClickable(onClick = onClick, onLongClick = onLongClick).padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        PersonAvatar(p, 54.dp)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    p.displayName, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground,
                    maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
                )
                if (c.muted) {
                    Spacer(Modifier.width(6.dp))
                    Icon(Icons.Rounded.NotificationsOff, null, Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(Modifier.width(8.dp))
                Text(
                    shortTime(last?.ts ?: 0), style = MaterialTheme.typography.labelMedium,
                    color = if (bold) app.talklive.ui.theme.AccentText else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.height(2.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (c.typing) {
                    Text(stringResource(R.string.typing), style = MaterialTheme.typography.bodyMedium, color = app.talklive.ui.theme.AccentText, modifier = Modifier.weight(1f))
                } else {
                    if (last?.mine == true) {
                        Icon(
                            if (last.status == app.talklive.social.MsgStatus.Sent) Icons.Rounded.Done else Icons.Rounded.DoneAll, null, Modifier.size(16.dp),
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
