package app.talklive.ui.social

import androidx.compose.runtime.LaunchedEffect

import androidx.compose.foundation.clickable
import androidx.compose.animation.togetherWith
import android.content.Intent
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.sp
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
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.NotificationsOff
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.NotificationsNone
import androidx.compose.material.icons.rounded.NotificationsActive
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
fun FriendsScreen(vm: SocialViewModel, onOpenChat: (String) -> Unit, onStartTalking: () -> Unit, onPlus: () -> Unit = {}) {
    var profileOf by remember { mutableStateOf<Person?>(null) }
    profileOf?.let { p ->
        val friendsNow by vm.friends.collectAsStateWithLifecycle()
        val sentNow by vm.sent.collectAsStateWithLifecycle()
        val friend = friendsNow.any { it.clientId == p.clientId }
        PersonSheet(
            p, isFriend = friend, onCall = { vm.call(p) }, onMessage = { onOpenChat(p.clientId) },
            requested = p.clientId in sentNow, onAddFriend = { vm.sendRequest(p.clientId) },
            canCall = friend || p.mode == "talk",
        ) { profileOf = null }
    }
    val friends by vm.friends.collectAsStateWithLifecycle()
    val requests by vm.requests.collectAsStateWithLifecycle()
    val history by vm.history.collectAsStateWithLifecycle()
    val historyHidden by vm.historyHidden.collectAsStateWithLifecycle()
    val sent by vm.sent.collectAsStateWithLifecycle()
    var adding by rememberSaveable { mutableStateOf(false) }
    var showActivity by rememberSaveable { mutableStateOf(false) }
    val activity by vm.activity.collectAsStateWithLifecycle()
    var actionsFor by remember { mutableStateOf<Person?>(null) }
    val haptics = LocalHapticFeedback.current
    var bellToast by remember { mutableStateOf<Pair<String, Boolean>?>(null) }
    bellToast?.let { (name, on) ->
        val ctx = LocalContext.current
        LaunchedEffect(bellToast) {
            android.widget.Toast.makeText(ctx, ctx.getString(if (on) R.string.bell_on else R.string.bell_off, name), android.widget.Toast.LENGTH_SHORT).show()
            bellToast = null
        }
    }

    val friendIds = friends.map { it.clientId }.toSet()
    val met = history.filter { it.clientId !in friendIds }
    val sorted = friends.sortedWith(compareByDescending<Person> { it.pinned }.thenByDescending { it.online }.thenBy { it.displayName.lowercase() })

    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(start = 24.dp, end = 12.dp, top = 16.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.tab_friends), style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.weight(1f))
            IconButton(onClick = { showActivity = true; vm.markActivitySeen() }) {
                androidx.compose.material3.BadgedBox(badge = {
                    if (activity.isNotEmpty()) androidx.compose.material3.Badge(containerColor = MaterialTheme.colorScheme.primary) { Text(activity.size.toString()) }
                }) { Icon(Icons.Rounded.Notifications, stringResource(R.string.activity)) }
            }
            FilledTonalIconButton(onClick = { adding = true }) { Icon(Icons.Rounded.PersonAdd, stringResource(R.string.add_friend)) }
        }

        if (friends.isEmpty() && requests.isEmpty() && met.isEmpty()) {
            Box(Modifier.weight(1f)) { EmptyTab(MainTab.Friends, onStart = onStartTalking, showTitle = false) }
            return@Column
        }

        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(bottom = 16.dp)) {
            item(key = "notify") { NotificationsBanner() }
            if (requests.isNotEmpty()) {
                item { SectionLabel(stringResource(R.string.friend_requests, requests.size)) }
                items(requests, key = { "r" + it.clientId }) { p ->
                    RequestCard(p, onAccept = { vm.respond(p.clientId, true) }, onDecline = { vm.respond(p.clientId, false) })
                }
            }
            // Who you met at random, split by how: voice calls (call them back)
            // and text chats, so each is easy to find again.
            val talked = met.filter { it.mode == "talk" }.take(10)
            val chatted = met.filter { it.mode != "talk" }
            if (talked.isNotEmpty()) {
                item(key = "h-talked") { SectionLabel(stringResource(R.string.talked_on_call, talked.size)) }
                item(key = "row-talked") {
                    LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(talked, key = { "t" + it.clientId }) { p ->
                            MetCard(
                                p, pending = p.clientId in sent,
                                onAdd = { if (p.clientId in sent) vm.cancelRequest(p.clientId) else vm.sendRequest(p.clientId) },
                                onRemove = { vm.removeFromHistory(p.clientId) },
                                onOpen = { profileOf = p },
                                onCall = { vm.call(p) },
                                isFriend = friends.any { it.clientId == p.clientId },
                            )
                        }
                    }
                }
            }
            if (chatted.isNotEmpty()) {
                item(key = "h-chatted") { SectionLabel(stringResource(R.string.chatted_by_text)) }
                item(key = "row-chatted") {
                    LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(chatted, key = { "m" + it.clientId }) { p ->
                            MetCard(
                                p, pending = p.clientId in sent,
                                onAdd = { if (p.clientId in sent) vm.cancelRequest(p.clientId) else vm.sendRequest(p.clientId) },
                                onRemove = { vm.removeFromHistory(p.clientId) },
                                onOpen = { onOpenChat(p.clientId) },
                                isFriend = friends.any { it.clientId == p.clientId },
                            )
                        }
                    }
                }
            }
            // Free profiles list their last 3 people; the rest wait for Plus.
            if (historyHidden > 0) item(key = "h-locked") {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(app.talklive.ui.components.PlusGold.copy(alpha = 0.10f))
                        .border(1.dp, app.talklive.ui.components.PlusGold.copy(alpha = 0.45f), RoundedCornerShape(16.dp))
                        .clickable(onClick = onPlus).padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("🔒", fontSize = 18.sp)
                    Spacer(Modifier.width(12.dp))
                    Text(
                        stringResource(R.string.history_locked, historyHidden),
                        style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f),
                    )
                    Text("Plus", color = app.talklive.ui.components.PlusGold, style = MaterialTheme.typography.labelLarge)
                }
            }
            // Online first, then offline, each under its own heading.
            listOf(
                R.string.friends_online to sorted.filter { it.online },
                R.string.friends_offline to sorted.filter { !it.online },
            ).filter { it.second.isNotEmpty() }.forEach { (label, group) ->
                item(key = "h$label") { SectionLabel(stringResource(label, group.size)) }
                items(group, key = { "f" + it.clientId }) { p ->
                    FriendRow(
                        p,
                        modifier = Modifier.animateItem().combinedClickable(
                            onClick = { onOpenChat(p.clientId) },
                            onLongClick = { haptics.performHapticFeedback(HapticFeedbackType.LongPress); actionsFor = p },
                        ),
                        onCall = { vm.call(p) },
                        onChat = { onOpenChat(p.clientId) },
                        onProfile = { profileOf = p },
                        onBell = { vm.setOnlineAlert(p.clientId, !p.alert); bellToast = if (!p.alert) p.displayName to true else p.displayName to false },
                    )
                }
            }
        }
    }

    if (showActivity) ActivitySheet(vm, friends, onDismiss = { showActivity = false }, onOpenChat = { showActivity = false; onOpenChat(it) })
    if (adding) AddFriendSheet(vm, onDismiss = { adding = false }, onOpenChat = { adding = false; onOpenChat(it) })
    actionsFor?.let { p -> FriendActionsSheet(vm, p, onDismiss = { actionsFor = null }, onOpenChat = { actionsFor = null; onOpenChat(p.clientId) }) }
}

/** Notifications switched off for TalkLive: say so, and one tap opens the setting. */
@Composable
private fun NotificationsBanner() {
    val ctx = LocalContext.current
    var enabled by remember { mutableStateOf(androidx.core.app.NotificationManagerCompat.from(ctx).areNotificationsEnabled()) }
    val owner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    androidx.compose.runtime.DisposableEffect(owner) {
        val obs = androidx.lifecycle.LifecycleEventObserver { _, e ->
            if (e == androidx.lifecycle.Lifecycle.Event.ON_RESUME) enabled = androidx.core.app.NotificationManagerCompat.from(ctx).areNotificationsEnabled()
        }
        owner.lifecycle.addObserver(obs)
        onDispose { owner.lifecycle.removeObserver(obs) }
    }
    if (enabled) return
    Row(
        Modifier.padding(horizontal = 20.dp, vertical = 6.dp).fillMaxWidth().clip(MaterialTheme.shapes.large)
            .background(MaterialTheme.colorScheme.primaryContainer).padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.NotificationsOff, null, tint = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.width(10.dp))
        Text(stringResource(R.string.ntf_off_title), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.weight(1f))
        TextButton(onClick = {
            runCatching {
                ctx.startActivity(android.content.Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, ctx.packageName).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK))
            }
        }) { Text(stringResource(R.string.ntf_turn_on)) }
    }
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
                app.talklive.ui.components.PlusName(p.displayName, p.premium, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
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
private fun MetCard(
    p: Person, pending: Boolean, onAdd: () -> Unit, onOpen: () -> Unit, onRemove: () -> Unit = {},
    /** People met on a call get a call-back button next to Add. */
    onCall: (() -> Unit)? = null,
    isFriend: Boolean = false,
) {
    var menu by remember { mutableStateOf(false) }
    androidx.compose.material3.DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
        androidx.compose.material3.DropdownMenuItem(text = { Text(stringResource(R.string.remove_from_list)) }, onClick = { menu = false; onRemove() })
    }
    // Tap opens the chat; long-press offers to remove them from the list.
    Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface, modifier = Modifier.width(124.dp).clip(MaterialTheme.shapes.large).combinedClickable(onClick = onOpen, onLongClick = { menu = true })) {
        Column(Modifier.padding(vertical = 14.dp, horizontal = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            PersonAvatar(p, 56.dp)
            Spacer(Modifier.height(8.dp))
            app.talklive.ui.components.PlusName(p.displayName, p.premium, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(flag(p.countryCode) ?: " ", style = MaterialTheme.typography.labelMedium)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                if (onCall != null) {
                    Box(
                        Modifier.size(32.dp).clip(CircleShape).background(BrandGradient).combinedClickableCompat(onCall),
                        contentAlignment = Alignment.Center,
                    ) { Icon(Icons.Rounded.Call, stringResource(R.string.call), tint = Color.White, modifier = Modifier.size(16.dp)) }
                }
                if (!isFriend) {
                    Box(
                        Modifier.height(32.dp).clip(CircleShape)
                            .background(if (pending) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.primaryContainer)
                            .combinedClickableCompat(onAdd)
                            .padding(horizontal = 12.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            stringResource(if (pending) R.string.requested else R.string.add),
                            style = MaterialTheme.typography.labelMedium, maxLines = 1,
                            color = if (pending) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FriendRow(p: Person, modifier: Modifier, onCall: () -> Unit, onChat: () -> Unit, onProfile: () -> Unit = {}, onBell: (() -> Unit)? = null) {
    Row(modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.clip(CircleShape).clickable(onClick = onProfile)) { PersonAvatar(p, 52.dp) }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                app.talklive.ui.components.PlusName(p.displayName, p.premium, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
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
            if (!p.online) usualOnline(p)?.let {
                Text(it, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f), maxLines = 1)
            }
        }
        // The bell: get a notification when they come online.
        if (onBell != null) IconButton(onClick = onBell) {
            Icon(
                if (p.alert) Icons.Rounded.NotificationsActive else Icons.Rounded.NotificationsNone,
                stringResource(R.string.bell_title),
                tint = if (p.alert) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
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
                var copied by remember { mutableStateOf(false) }
                LaunchedEffect(copied) { if (copied) { kotlinx.coroutines.delay(1600); copied = false } }
                Column(Modifier.clickable(enabled = myId != null) { myId?.let { clipboard.setText(AnnotatedString(it)); copied = true } }) {
                    Text(stringResource(R.string.your_friend_id), style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.8f))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        androidx.compose.animation.AnimatedContent(
                            targetState = copied, label = "copy", modifier = Modifier.weight(1f),
                            transitionSpec = { (androidx.compose.animation.fadeIn() + androidx.compose.animation.slideInVertically { it / 2 }) togetherWith (androidx.compose.animation.fadeOut() + androidx.compose.animation.slideOutVertically { -it / 2 }) },
                        ) { c -> Text(if (c) stringResource(R.string.copied) else myId ?: "…", style = MaterialTheme.typography.headlineSmall, color = Color.White) }
                        IconButton(onClick = { myId?.let { clipboard.setText(AnnotatedString(it)); copied = true } }) {
                            androidx.compose.animation.Crossfade(copied, label = "icon") { c -> Icon(if (c) Icons.Rounded.Check else Icons.Rounded.ContentCopy, null, tint = Color.White) }
                        }
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
                    app.talklive.ui.components.PlusName(p.displayName, p.premium, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
                    Text(listOfNotNull(flag(p.countryCode), p.friendId).joinToString(" "), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Spacer(Modifier.height(8.dp))
            Action(Icons.AutoMirrored.Rounded.Chat, stringResource(R.string.message)) { onOpenChat() }
            if (p.online) Action(Icons.Rounded.Call, stringResource(R.string.call)) { vm.call(p); onDismiss() }
            else Action(Icons.Rounded.Call, stringResource(R.string.call_later)) { vm.callLater(p.clientId); onDismiss() }
            Action(Icons.Rounded.PushPin, stringResource(if (p.pinned) R.string.unpin else R.string.pin)) { vm.setPinned(p.clientId, !p.pinned); onDismiss() }
            Action(Icons.Rounded.Edit, stringResource(R.string.rename)) { renaming = true }
            val isMuted = p.clientId in muted
            Action(if (isMuted) Icons.Rounded.Notifications else Icons.Rounded.NotificationsOff, stringResource(if (isMuted) R.string.unmute_chat else R.string.mute_chat)) {
                vm.setMuted(p.clientId, !isMuted); onDismiss()
            }
            Action(Icons.Rounded.PersonRemove, stringResource(R.string.remove_friend), Danger) { confirm = "remove" }
            Action(Icons.Rounded.Flag, stringResource(R.string.report), Danger) { confirm = "report" }
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
            title = {
                Text(
                    when (what) {
                        "block" -> stringResource(R.string.block_title, p.displayName)
                        "report" -> stringResource(R.string.report_title)
                        else -> stringResource(R.string.remove_title, p.displayName)
                    },
                )
            },
            text = {
                Text(
                    stringResource(
                        when (what) { "block" -> R.string.block_body; "report" -> R.string.report_body; else -> R.string.remove_body },
                    ),
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    when (what) { "block" -> vm.block(p.clientId); "report" -> vm.report(p.clientId, "profile"); else -> vm.remove(p.clientId) }
                    confirm = null; onDismiss()
                }) {
                    Text(
                        stringResource(when (what) { "block" -> R.string.block; "report" -> R.string.report; else -> R.string.remove_friend }),
                        color = Danger,
                    )
                }
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ActivitySheet(vm: SocialViewModel, friends: List<Person>, onDismiss: () -> Unit, onOpenChat: (String) -> Unit) {
    val activity by vm.activity.collectAsStateWithLifecycle()
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(bottom = 16.dp)) {
            Text(stringResource(R.string.activity), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp))
            if (activity.isEmpty()) {
                Text(stringResource(R.string.activity_empty), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(24.dp))
            }
            activity.forEach { a ->
                val friend = friends.firstOrNull { it.clientId == a.fromClientId }
                Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (friend != null) PersonAvatar(friend, 44.dp) else AnimalAvatar(null, a.username, 44.dp)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            stringResource(if (a.type == "call_back_request") R.string.activity_missed_call else R.string.activity_accepted, a.username),
                            style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground,
                        )
                        Text(shortTime(a.ts), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (friend != null) {
                        if (a.type == "call_back_request" && friend.online) {
                            FilledTonalIconButton(onClick = { vm.call(friend); vm.clearActivity(a.id); onDismiss() }) { Icon(Icons.Rounded.Call, stringResource(R.string.call)) }
                        } else {
                            IconButton(onClick = { vm.clearActivity(a.id); onOpenChat(friend.clientId) }) { Icon(Icons.AutoMirrored.Rounded.Chat, stringResource(R.string.message)) }
                        }
                    }
                    IconButton(onClick = { vm.clearActivity(a.id) }) { Icon(Icons.Rounded.Close, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
        }
    }
}
