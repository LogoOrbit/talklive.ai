package app.talklive.ui.social

import android.content.Intent
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Chat
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.NotificationsOff
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material.icons.rounded.PersonRemove
import androidx.compose.material.icons.rounded.PushPin
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.talklive.R
import app.talklive.social.FoundUser
import app.talklive.social.Person
import app.talklive.ui.animals.AnimalAvatar
import app.talklive.ui.components.BrandGradient
import app.talklive.ui.components.ErrorBanner
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.components.TalkTextField
import app.talklive.ui.main.EmptyTab
import app.talklive.ui.main.MainTab
import app.talklive.ui.theme.Danger
import kotlinx.coroutines.launch

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun FriendsScreen(vm: SocialViewModel, onOpenChat: (String) -> Unit, onStartTalking: () -> Unit) {
    val friends by vm.friends.collectAsStateWithLifecycle()
    val requests by vm.requests.collectAsStateWithLifecycle()
    val history by vm.history.collectAsStateWithLifecycle()
    val sent by vm.sent.collectAsStateWithLifecycle()
    var adding by rememberSaveable { mutableStateOf(false) }
    var actionsFor by remember { mutableStateOf<Person?>(null) }
    val haptics = LocalHapticFeedback.current

    val friendIds = friends.map { it.clientId }.toSet()
    val met = history.filter { it.clientId !in friendIds }
    val sorted = friends.sortedWith(compareByDescending<Person> { it.pinned }.thenByDescending { it.online }.thenBy { it.displayName.lowercase() })

    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(start = 24.dp, end = 12.dp, top = 16.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.tab_friends), style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.weight(1f))
            FilledTonalIconButton(onClick = { adding = true }) { Icon(Icons.Rounded.PersonAdd, stringResource(R.string.add_friend)) }
        }

        if (friends.isEmpty() && requests.isEmpty() && met.isEmpty()) {
            Box(Modifier.weight(1f)) { EmptyTab(MainTab.Friends, onStart = onStartTalking, showTitle = false) }
            return@Column
        }

        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(bottom = 16.dp)) {
            if (requests.isNotEmpty()) {
                item { SectionLabel(stringResource(R.string.friend_requests, requests.size)) }
                items(requests, key = { "r" + it.clientId }) { p ->
                    RequestCard(p, onAccept = { vm.respond(p.clientId, true) }, onDecline = { vm.respond(p.clientId, false) })
                }
            }
            if (met.isNotEmpty()) {
                item { SectionLabel(stringResource(R.string.met_today)) }
                item {
                    LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(met, key = { "m" + it.clientId }) { p ->
                            MetCard(p, pending = p.clientId in sent, onAdd = { vm.sendRequest(p.clientId) }, onOpen = { onOpenChat(p.clientId) })
                        }
                    }
                }
            }
            if (sorted.isNotEmpty()) {
                item { SectionLabel(stringResource(R.string.your_friends, sorted.size)) }
                items(sorted, key = { "f" + it.clientId }) { p ->
                    FriendRow(
                        p,
                        modifier = Modifier.animateItem().combinedClickable(
                            onClick = { onOpenChat(p.clientId) },
                            onLongClick = { haptics.performHapticFeedback(HapticFeedbackType.LongPress); actionsFor = p },
                        ),
                        onCall = { vm.call(p) },
                        onChat = { onOpenChat(p.clientId) },
                    )
                }
            }
        }
    }

    if (adding) AddFriendSheet(vm, onDismiss = { adding = false }, onOpenChat = { adding = false; onOpenChat(it) })
    actionsFor?.let { p -> FriendActionsSheet(vm, p, onDismiss = { actionsFor = null }, onOpenChat = { actionsFor = null; onOpenChat(p.clientId) }) }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text.uppercase(),
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(start = 24.dp, top = 20.dp, bottom = 10.dp),
    )
}

@Composable
private fun RequestCard(p: Person, onAccept: () -> Unit, onDecline: () -> Unit) {
    Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface, modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp)) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            PersonAvatar(p, 48.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(p.displayName, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    listOfNotNull(flag(p.countryCode), stringResource(R.string.wants_to_be_friends)).joinToString(" "),
                    style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1,
                )
            }
            Box(
                Modifier.size(44.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant).combinedClickableCompat(onDecline),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Rounded.Close, stringResource(R.string.decline), tint = MaterialTheme.colorScheme.onSurfaceVariant) }
            Spacer(Modifier.width(10.dp))
            Box(
                Modifier.size(44.dp).clip(CircleShape).background(BrandGradient).combinedClickableCompat(onAccept),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Rounded.Check, stringResource(R.string.accept), tint = Color.White) }
        }
    }
}

@Composable
private fun MetCard(p: Person, pending: Boolean, onAdd: () -> Unit, onOpen: () -> Unit) {
    Surface(onClick = onOpen, shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface, modifier = Modifier.width(112.dp)) {
        Column(Modifier.padding(vertical = 14.dp, horizontal = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            PersonAvatar(p, 56.dp)
            Spacer(Modifier.height(8.dp))
            Text(p.displayName, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(flag(p.countryCode) ?: " ", style = MaterialTheme.typography.labelMedium)
            Spacer(Modifier.height(8.dp))
            Box(
                Modifier.clip(CircleShape)
                    .background(if (pending) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.primaryContainer)
                    .combinedClickableCompat(if (pending) ({}) else onAdd)
                    .padding(horizontal = 14.dp, vertical = 6.dp),
            ) {
                Text(
                    stringResource(if (pending) R.string.requested else R.string.add),
                    style = MaterialTheme.typography.labelMedium,
                    color = if (pending) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.primary,
                )
            }
        }
    }
}

@Composable
private fun FriendRow(p: Person, modifier: Modifier, onCall: () -> Unit, onChat: () -> Unit) {
    Row(modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        PersonAvatar(p, 52.dp)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(p.displayName, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (p.pinned) {
                    Spacer(Modifier.width(6.dp))
                    Icon(Icons.Rounded.PushPin, null, Modifier.size(14.dp), tint = MaterialTheme.colorScheme.primary)
                }
            }
            Text(
                listOfNotNull(flag(p.countryCode), presence(p)).joinToString(" "),
                style = MaterialTheme.typography.bodyMedium,
                color = if (p.online) app.talklive.ui.theme.Success else MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
            )
        }
        IconButton(onClick = onChat) { Icon(Icons.AutoMirrored.Rounded.Chat, stringResource(R.string.message), tint = MaterialTheme.colorScheme.onSurfaceVariant) }
        FilledTonalIconButton(onClick = onCall, enabled = p.online) { Icon(Icons.Rounded.Call, stringResource(R.string.call)) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddFriendSheet(vm: SocialViewModel, onDismiss: () -> Unit, onOpenChat: (String) -> Unit) {
    val myId by vm.myFriendId.collectAsStateWithLifecycle()
    val sent by vm.sent.collectAsStateWithLifecycle()
    val clipboard = LocalClipboardManager.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var query by rememberSaveable { mutableStateOf("") }
    var found by remember { mutableStateOf<FoundUser?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    fun search() {
        if (query.isBlank() || busy) return
        busy = true; error = null; found = null
        scope.launch {
            vm.find(query).onSuccess { found = it }.onFailure { error = it.message }
            busy = false
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(horizontal = 20.dp).padding(bottom = 24.dp).animateContentSize()) {
            Text(stringResource(R.string.add_friend), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.height(16.dp))
            // Your own ID, to share.
            Box(Modifier.fillMaxWidth().clip(MaterialTheme.shapes.large).background(BrandGradient).padding(18.dp)) {
                Column {
                    Text(stringResource(R.string.your_friend_id), style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.8f))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(myId ?: "…", style = MaterialTheme.typography.headlineSmall, color = Color.White, modifier = Modifier.weight(1f))
                        IconButton(onClick = { myId?.let { clipboard.setText(AnnotatedString(it)) } }) { Icon(Icons.Rounded.ContentCopy, null, tint = Color.White) }
                        IconButton(onClick = {
                            myId?.let {
                                context.startActivity(
                                    Intent.createChooser(
                                        Intent(Intent.ACTION_SEND).setType("text/plain")
                                            .putExtra(Intent.EXTRA_TEXT, context.getString(R.string.share_id_text, it)),
                                        null,
                                    ),
                                )
                            }
                        }) { Icon(Icons.Rounded.Share, null, tint = Color.White) }
                    }
                }
            }
            Spacer(Modifier.height(20.dp))
            TalkTextField(query, { query = it; error = null }, stringResource(R.string.friend_id_hint), imeAction = ImeAction.Search, onIme = ::search)
            Spacer(Modifier.height(12.dp))
            PrimaryButton(stringResource(R.string.find), onClick = ::search, enabled = query.isNotBlank(), loading = busy, icon = Icons.Rounded.Search)
            ErrorBanner(error)
            found?.let { u ->
                Spacer(Modifier.height(16.dp))
                Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface) {
                    Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        AnimalAvatar(u.animal, u.username, 48.dp)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(u.username, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                            Text(listOfNotNull(flag(u.countryCode), u.friendId).joinToString(" "), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        when {
                            u.isFriend -> TextButton(onClick = { onOpenChat(u.clientId) }) { Text(stringResource(R.string.message)) }
                            u.pending || u.clientId in sent -> Text(stringResource(R.string.requested), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            else -> TextButton(onClick = { vm.sendRequest(u.clientId, u.friendId) }) { Text(stringResource(R.string.add)) }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FriendActionsSheet(vm: SocialViewModel, p: Person, onDismiss: () -> Unit, onOpenChat: () -> Unit) {
    val muted by vm.muted.collectAsStateWithLifecycle()
    var renaming by remember { mutableStateOf(false) }
    var confirm by remember { mutableStateOf<String?>(null) }
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(bottom = 16.dp)) {
            Row(Modifier.padding(horizontal = 20.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                PersonAvatar(p, 52.dp)
                Spacer(Modifier.width(14.dp))
                Column {
                    Text(p.displayName, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
                    Text(listOfNotNull(flag(p.countryCode), p.friendId).joinToString(" "), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Spacer(Modifier.height(8.dp))
            Action(Icons.AutoMirrored.Rounded.Chat, stringResource(R.string.message)) { onOpenChat() }
            if (p.online) Action(Icons.Rounded.Call, stringResource(R.string.call)) { vm.call(p); onDismiss() }
            Action(Icons.Rounded.PushPin, stringResource(if (p.pinned) R.string.unpin else R.string.pin)) { vm.setPinned(p.clientId, !p.pinned); onDismiss() }
            Action(Icons.Rounded.Edit, stringResource(R.string.rename)) { renaming = true }
            val isMuted = p.clientId in muted
            Action(if (isMuted) Icons.Rounded.Notifications else Icons.Rounded.NotificationsOff, stringResource(if (isMuted) R.string.unmute_chat else R.string.mute_chat)) {
                vm.setMuted(p.clientId, !isMuted); onDismiss()
            }
            Action(Icons.Rounded.PersonRemove, stringResource(R.string.remove_friend), Danger) { confirm = "remove" }
            Action(Icons.Rounded.Block, stringResource(R.string.block), Danger) { confirm = "block" }
        }
    }
    if (renaming) {
        var name by remember { mutableStateOf(p.nickname ?: p.username) }
        AlertDialog(
            onDismissRequest = { renaming = false },
            title = { Text(stringResource(R.string.rename)) },
            text = { TalkTextField(name, { name = it.take(24) }, stringResource(R.string.display_name), imeAction = ImeAction.Done) },
            confirmButton = { TextButton(onClick = { vm.rename(p.clientId, name); renaming = false; onDismiss() }) { Text(stringResource(R.string.save)) } },
            dismissButton = { TextButton(onClick = { renaming = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }
    confirm?.let { what ->
        AlertDialog(
            onDismissRequest = { confirm = null },
            title = { Text(stringResource(if (what == "block") R.string.block_title else R.string.remove_title, p.displayName)) },
            text = { Text(stringResource(if (what == "block") R.string.block_body else R.string.remove_body)) },
            confirmButton = {
                TextButton(onClick = {
                    if (what == "block") vm.block(p.clientId) else vm.remove(p.clientId)
                    confirm = null; onDismiss()
                }) { Text(stringResource(if (what == "block") R.string.block else R.string.remove_friend), color = Danger) }
            },
            dismissButton = { TextButton(onClick = { confirm = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

@Composable
private fun Action(icon: ImageVector, label: String, tint: Color = MaterialTheme.colorScheme.onBackground, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().combinedClickableCompat(onClick).padding(horizontal = 24.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = tint)
        Spacer(Modifier.width(18.dp))
        Text(label, style = MaterialTheme.typography.titleMedium, color = tint)
    }
}

@OptIn(ExperimentalFoundationApi::class)
private fun Modifier.combinedClickableCompat(onClick: () -> Unit) = this.combinedClickable(onClick = onClick)
