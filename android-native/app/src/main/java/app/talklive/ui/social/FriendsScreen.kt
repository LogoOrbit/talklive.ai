package app.talklive.ui.social

import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Archive
import androidx.compose.foundation.verticalScroll
import app.talklive.ui.components.tapOnce
import androidx.compose.material.icons.rounded.Lock
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
import app.talklive.ui.components.verticalScrollbar
import app.talklive.ui.main.EmptyTab
import app.talklive.ui.main.MainTab
import app.talklive.ui.theme.Danger
import kotlinx.coroutines.launch

/** The Friends tab shows friends and requests; the History tab shows the people met at random. */
enum class FriendsPane { Friends, History }

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class)
@Composable
fun FriendsScreen(
    vm: SocialViewModel, onOpenChat: (String) -> Unit, onStartTalking: () -> Unit, onPlus: () -> Unit = {},
    pane: FriendsPane = FriendsPane.Friends,
    /** The friend call log button; off in screenshot tests (it needs Hilt). */
    callLogEnabled: Boolean = false,
) {
    val inFriends = pane == FriendsPane.Friends
    var profileOf by remember { mutableStateOf<Person?>(null) }
    profileOf?.let { p ->
        val friendsNow by vm.friends.collectAsStateWithLifecycle()
        val sentNow by vm.sent.collectAsStateWithLifecycle()
        val friend = friendsNow.any { it.clientId == p.clientId }
        val incomingNow by vm.requests.collectAsStateWithLifecycle()
        val likedNow by vm.liked.collectAsStateWithLifecycle()
        PersonSheet(
            p, isFriend = friend, onCall = { vm.call(p) }, onMessage = { onOpenChat(p.clientId) },
            requested = p.clientId in sentNow, onAddFriend = { vm.sendRequest(p.clientId) },
            incomingRequest = incomingNow.any { it.clientId == p.clientId }, onAccept = { vm.respond(p.clientId, true) },
            canCall = friend || p.mode == "talk",
            onLike = if (!friend) ({ vm.likePartner(p.clientId) }) else null, liked = p.clientId in likedNow,
        ) { profileOf = null }
    }
    val friends by vm.friends.collectAsStateWithLifecycle()
    val requests by vm.requests.collectAsStateWithLifecycle()
    val history by vm.history.collectAsStateWithLifecycle()
    val historyHidden by vm.historyHidden.collectAsStateWithLifecycle()
    val sent by vm.sent.collectAsStateWithLifecycle()
    var adding by rememberSaveable { mutableStateOf(false) }
    var showActivity by rememberSaveable { mutableStateOf(false) }
    var showCallLog by rememberSaveable { mutableStateOf(false) }
    val activity by vm.activity.collectAsStateWithLifecycle()
    var actionsFor by remember { mutableStateOf<Person?>(null) }
    val haptics = LocalHapticFeedback.current
    var bellToast by remember { mutableStateOf<Pair<String, Boolean>?>(null) }
    // Calling someone who is offline: say so, and what to do instead.
    var offlineTap by remember { mutableStateOf<String?>(null) }
    offlineTap?.let { name ->
        val ctx = LocalContext.current
        LaunchedEffect(name) {
            android.widget.Toast.makeText(ctx, ctx.getString(R.string.friend_offline_call, name), android.widget.Toast.LENGTH_LONG).show()
            offlineTap = null
        }
    }
    bellToast?.let { (name, on) ->
        val ctx = LocalContext.current
        LaunchedEffect(bellToast) {
            android.widget.Toast.makeText(ctx, ctx.getString(if (on) R.string.bell_on else R.string.bell_off, name), android.widget.Toast.LENGTH_SHORT).show()
            bellToast = null
        }
    }

    // Friends is the inbox now (like Messenger or Instagram): search, requests, who is online,
    // then every chat, newest first, then friends you have not written to yet.
    val conversations by vm.conversations.collectAsStateWithLifecycle()
    val archivedIds by vm.archived.collectAsStateWithLifecycle()
    var query by rememberSaveable { mutableStateOf("") }
    var showArchived by rememberSaveable { mutableStateOf(false) }
    var chatMenu by remember { mutableStateOf<Conversation?>(null) }
    if (showArchived) androidx.activity.compose.BackHandler { showArchived = false }
    val q = query.trim().lowercase()
    fun matches(p: Person) = q.isEmpty() || p.displayName.lowercase().contains(q) || (p.friendId?.lowercase()?.contains(q) == true)

    val friendIds = friends.map { it.clientId }.toSet()
    val met = history.filter { it.clientId !in friendIds }
    val likes by vm.likes.collectAsStateWithLifecycle()
    val stories by vm.stories.collectAsStateWithLifecycle()
    var composingStory by rememberSaveable { mutableStateOf(false) }
    var viewingStory by remember { mutableStateOf<Int?>(null) }
    LaunchedEffect(Unit) { vm.refreshStories() }
    val sorted = friends.sortedWith(compareByDescending<Person> { it.pinned }.thenByDescending { it.online }.thenBy { it.displayName.lowercase() })

    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(start = if (showArchived) 8.dp else 24.dp, end = 12.dp, top = 16.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            if (inFriends && showArchived) IconButton(onClick = { showArchived = false }) {
                Icon(androidx.compose.material.icons.Icons.AutoMirrored.Rounded.ArrowBack, stringResource(R.string.back))
            }
            Text(
                stringResource(if (inFriends && showArchived) R.string.archived else if (inFriends) R.string.tab_friends else R.string.tab_history),
                style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground,
            )
            Spacer(Modifier.weight(1f))
            if (inFriends && callLogEnabled) CallLogButton(onClick = { showCallLog = true })
            IconButton(onClick = { showActivity = true; vm.markActivitySeen() }) {
                androidx.compose.material3.BadgedBox(badge = {
                    if (activity.isNotEmpty()) androidx.compose.material3.Badge(containerColor = MaterialTheme.colorScheme.primary) { Text(activity.size.toString()) }
                }) { Icon(Icons.Rounded.Notifications, stringResource(R.string.activity)) }
            }
            FilledTonalIconButton(onClick = { adding = true }) { Icon(Icons.Rounded.PersonAdd, stringResource(R.string.add_friend)) }
        }

        if (inFriends && (friends.isNotEmpty() || conversations.isNotEmpty())) {
            androidx.compose.material3.OutlinedTextField(
                value = query, onValueChange = { query = it.take(40) },
                placeholder = { Text(stringResource(R.string.search_chats)) },
                leadingIcon = { Icon(androidx.compose.material.icons.Icons.Rounded.Search, null) },
                trailingIcon = { if (query.isNotEmpty()) IconButton(onClick = { query = "" }) { Icon(androidx.compose.material.icons.Icons.Rounded.Close, stringResource(R.string.close)) } },
                singleLine = true, shape = RoundedCornerShape(50),
                colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface, focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedBorderColor = Color.Transparent,
                ),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(bottom = 6.dp),
            )
        }
        if (if (inFriends) friends.isEmpty() && requests.isEmpty() && conversations.isEmpty() else met.isEmpty() && historyHidden == 0) {
            Box(Modifier.weight(1f)) { EmptyTab(if (inFriends) MainTab.Friends else MainTab.History, onStart = onStartTalking, showTitle = false) }
            return@Column
        }

        var refreshing by remember { mutableStateOf(false) }
        val refreshScope = rememberCoroutineScope()
        app.talklive.ui.components.SlidePullToRefresh(
            refreshing = refreshing,
            onRefresh = { refreshing = true; vm.refreshStories(); refreshScope.launch { vm.refresh(); refreshing = false } },
            modifier = Modifier.weight(1f),
        ) {
        // No stretch overscroll here: on some phones it blanked the whole list while scrolling.
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 16.dp), overscrollEffect = null) {
            val top = inFriends && !showArchived && q.isEmpty()
            if (top) item(key = "notify") { NotificationsBanner() }
            if (top && requests.isNotEmpty()) {
                item { SectionLabel(stringResource(R.string.friend_requests, requests.size)) }
                items(requests, key = { "r" + it.clientId }) { p ->
                    RequestCard(p, onAccept = { vm.respond(p.clientId, true) }, onDecline = { vm.respond(p.clientId, false) })
                }
            }
            // Online now: a strip of round avatars, like the top of Messenger.
            val onlineNow = sorted.filter { it.online }
            val hasLikes = likes.count > 0 || likes.people.isNotEmpty()
            if (top) item(key = "online-strip") {
                LazyRow(contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    // Stories first, like Messenger and Instagram: yours, then friends with new ones.
                    item(key = "my-story") {
                        val me = stories.firstOrNull { it.mine }
                        MyStoryBubble(me, onAdd = { composingStory = true }, onOpen = { viewingStory = stories.indexOf(me) })
                    }
                    stories.forEachIndexed { i, p ->
                        if (!p.mine && p.stories.isNotEmpty()) item(key = "st" + p.clientId) { FriendStoryBubble(p) { viewingStory = i } }
                    }
                    // Likes: one compact bubble at the start of the strip, not a big card.
                    if (hasLikes) item(key = "likes") { LikesBubble(likes, onPerson = { profileOf = it }, onPlus = onPlus) }
                    items(onlineNow, key = { "o" + it.clientId }) { p ->
                        Column(
                            Modifier.width(64.dp).combinedClickable(
                                onClick = { onOpenChat(p.clientId) },
                                onLongClick = { haptics.performHapticFeedback(HapticFeedbackType.LongPress); actionsFor = p },
                            ),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            PersonAvatar(p, 56.dp)
                            Spacer(Modifier.height(4.dp))
                            Text(p.displayName, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                        }
                    }
                }
            }
            if (inFriends) {
                val storedChats = conversations.filter { it.person.clientId in archivedIds }
                val chats = (if (showArchived) storedChats else conversations.filter { it.person.clientId !in archivedIds }).filter { matches(it.person) }
                if (!showArchived && q.isEmpty() && storedChats.isNotEmpty()) item(key = "archived-row") {
                    Row(
                        Modifier.fillMaxWidth().clickable { app.talklive.sound.Tap.soft(); showArchived = true }.padding(horizontal = 20.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(Modifier.size(54.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                            Icon(androidx.compose.material.icons.Icons.Rounded.Archive, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(Modifier.width(14.dp))
                        Text(stringResource(R.string.archived), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                        Text(storedChats.size.toString(), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                if (chats.isNotEmpty() && !showArchived) item(key = "h-chats") { SectionLabel(stringResource(R.string.tab_chats)) }
                items(chats, key = { "c" + it.person.clientId }) { c ->
                    ConversationRow(
                        c, Modifier,
                        onLongClick = { haptics.performHapticFeedback(HapticFeedbackType.LongPress); chatMenu = c },
                    ) { onOpenChat(c.person.clientId) }
                }
                if (q.isNotEmpty() && chats.isEmpty() && sorted.none { matches(it) && conversations.none { c -> c.person.clientId == it.clientId } }) item(key = "no-results") {
                    Text(
                        stringResource(R.string.no_results), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.fillMaxWidth().padding(24.dp),
                    )
                }
            }
            // Who you met at random, split by how: voice calls (call them back)
            // and text chats, so each is easy to find again.
            if (!inFriends && met.isNotEmpty()) item(key = "kept30") {
                Text(
                    stringResource(R.string.history_kept_30),
                    style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                    modifier = Modifier.padding(start = 24.dp, top = 12.dp),
                )
            }
            val talked = met.filter { it.mode == "talk" }.take(10)
            val chatted = met.filter { it.mode != "talk" }
            if (!inFriends && talked.isNotEmpty()) {
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
            if (!inFriends && chatted.isNotEmpty()) {
                item(key = "h-chatted") { SectionLabel(stringResource(R.string.chatted_by_text)) }
                items(chatted, key = { "m" + it.clientId }) { p ->
                    MetRow(
                        p, pending = p.clientId in sent,
                        onAdd = { if (p.clientId in sent) vm.cancelRequest(p.clientId) else vm.sendRequest(p.clientId) },
                        onRemove = { vm.removeFromHistory(p.clientId) },
                        onOpen = { onOpenChat(p.clientId) },
                        isFriend = friends.any { it.clientId == p.clientId },
                    )
                }
            }
            // Free profiles list their last 3 people; the rest wait for Plus.
            if (!inFriends && historyHidden > 0) item(key = "h-locked") {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(app.talklive.ui.components.PlusGold.copy(alpha = 0.10f))
                        .border(1.dp, app.talklive.ui.components.PlusGold.copy(alpha = 0.45f), RoundedCornerShape(16.dp))
                        .tapOnce(windowMs = 700, onClick = onPlus).padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(androidx.compose.material.icons.Icons.Rounded.Lock, null, tint = app.talklive.ui.theme.GoldText, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(12.dp))
                    Text(
                        stringResource(R.string.history_locked, historyHidden),
                        style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f),
                    )
                    Text("Plus", color = app.talklive.ui.theme.GoldText, style = MaterialTheme.typography.labelLarge)
                }
            }
            // Friends with no chat yet: online first, then offline, each under its own heading.
            val chatIds = conversations.map { it.person.clientId }.toSet()
            val noChat = sorted.filter { it.clientId !in chatIds && matches(it) }
            listOf(
                R.string.friends_online to noChat.filter { it.online },
                R.string.friends_offline to noChat.filter { !it.online },
            ).filter { inFriends && !showArchived && it.second.isNotEmpty() }.forEach { (label, group) ->
                item(key = "h$label") { SectionLabel(stringResource(label, group.size)) }
                items(group, key = { "f" + it.clientId }) { p ->
                    FriendRow(
                        p,
                        modifier = Modifier.combinedClickable(
                            onClick = { onOpenChat(p.clientId) },
                            onLongClick = { haptics.performHapticFeedback(HapticFeedbackType.LongPress); actionsFor = p },
                        ),
                        onCall = { if (p.online) vm.call(p) else offlineTap = p.displayName },
                        onChat = { onOpenChat(p.clientId) },
                        onProfile = { profileOf = p },
                        onBell = { vm.setOnlineAlert(p.clientId, !p.alert); bellToast = if (!p.alert) p.displayName to true else p.displayName to false },
                    )
                }
            }
        }
        }
    }

    if (inFriends) ChatActions(vm, chatMenu) { chatMenu = null }
    if (composingStory) StoryComposer(onPost = { t, b, g -> vm.postStory(t, b, g) }, onDismiss = { composingStory = false })
    viewingStory?.let { i ->
        StoryViewer(
            stories, i,
            onSeen = { p, st -> vm.markStorySeen(p.clientId, st.id) },
            onDelete = { st -> vm.deleteStory(st.id) },
            onAdd = { composingStory = true },
            onDismiss = { viewingStory = null },
        )
    }
    if (showCallLog) CallLogSheet(
        onDismiss = { showCallLog = false },
        onCallBack = { id ->
            val p = friends.firstOrNull { it.clientId == id } ?: history.firstOrNull { it.clientId == id }
            when {
                p == null -> Unit
                p.online || p.mode == "talk" -> { showCallLog = false; vm.call(p) }
                else -> offlineTap = p.displayName
            }
        },
    )
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

/** A text chat met at random, as a list row: tap opens the chat, long-press removes it. */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MetRow(p: Person, pending: Boolean, onAdd: () -> Unit, onOpen: () -> Unit, onRemove: () -> Unit, isFriend: Boolean) {
    var menu by remember { mutableStateOf(false) }
    Box {
        androidx.compose.material3.DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
            androidx.compose.material3.DropdownMenuItem(text = { Text(stringResource(R.string.remove_from_list)) }, onClick = { menu = false; onRemove() })
        }
        Row(
            Modifier.fillMaxWidth().combinedClickable(onClick = onOpen, onLongClick = { menu = true }).padding(horizontal = 20.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            PersonAvatar(p, 48.dp)
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                app.talklive.ui.components.PlusName(p.displayName, p.premium, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    listOfNotNull(flag(p.countryCode), shortTime(p.ts).ifBlank { null }).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1,
                )
            }
            if (!isFriend) {
                Box(
                    Modifier.height(32.dp).clip(CircleShape)
                        .background(if (pending) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.primaryContainer)
                        .clickable(onClick = onAdd)
                        .padding(horizontal = 14.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        stringResource(if (pending) R.string.requested else R.string.add),
                        style = MaterialTheme.typography.labelMedium, maxLines = 1,
                        color = if (pending) MaterialTheme.colorScheme.onSurfaceVariant else app.talklive.ui.theme.AccentText,
                    )
                }
            }
        }
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
                            color = if (pending) MaterialTheme.colorScheme.onSurfaceVariant else app.talklive.ui.theme.AccentText,
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
        Box(Modifier.clickable(interactionSource = null, indication = null, onClick = onProfile)) { PersonAvatar(p, 52.dp) }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                app.talklive.ui.components.PlusName(p.displayName, p.premium, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
                app.talklive.ui.badges.TopBadge(p.badges, 16.dp, Modifier.padding(start = 6.dp))
                if (p.pinned) {
                    Spacer(Modifier.width(6.dp))
                    Icon(Icons.Rounded.PushPin, null, Modifier.size(14.dp), tint = MaterialTheme.colorScheme.primary)
                }
            }
            Text(
                listOfNotNull(flag(p.countryCode), presence(p)).joinToString(" "),
                style = MaterialTheme.typography.bodyMedium,
                color = if (p.online) app.talklive.ui.theme.SuccessText else MaterialTheme.colorScheme.onSurfaceVariant,
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
        FilledTonalIconButton(onClick = onCall) {
            Icon(Icons.Rounded.Call, stringResource(R.string.call), tint = if (p.online) MaterialTheme.colorScheme.onSecondaryContainer else MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddFriendSheet(vm: SocialViewModel, onDismiss: () -> Unit, onOpenChat: (String) -> Unit) {
    val myId by vm.myFriendId.collectAsStateWithLifecycle()
    val sent by vm.sent.collectAsStateWithLifecycle()
    val incoming by vm.requests.collectAsStateWithLifecycle()
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
            vm.find(query).onSuccess { found = it }.onFailure { error = app.talklive.ui.components.friendlyError(it.message) }
            busy = false
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().imePadding().verticalScroll(androidx.compose.foundation.rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 24.dp).animateContentSize()) {
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
            Row(verticalAlignment = Alignment.CenterVertically) {
                TalkTextField(query, { query = it; error = null }, stringResource(R.string.friend_id_hint), modifier = Modifier.weight(1f), imeAction = ImeAction.Search, onIme = ::search)
                Spacer(Modifier.width(8.dp))
                FilledTonalIconButton(onClick = ::search, enabled = query.isNotBlank() && !busy, modifier = Modifier.size(52.dp)) {
                    Icon(Icons.Rounded.Search, stringResource(R.string.find))
                }
            }
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
                            incoming.any { it.clientId == u.clientId } -> TextButton(onClick = { vm.respond(u.clientId, true) }) { Text(stringResource(R.string.accept)) }
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
        val actionsScroll = androidx.compose.foundation.rememberScrollState()
        Column(Modifier.fillMaxWidth().verticalScrollbar(actionsScroll).verticalScroll(actionsScroll).navigationBarsPadding().padding(bottom = 16.dp)) {
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
    val reportCtx = LocalContext.current
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
                    when (what) { "block" -> vm.block(p.clientId); "report" -> { vm.report(p.clientId, "profile"); android.widget.Toast.makeText(reportCtx, reportCtx.getString(R.string.report_sent), android.widget.Toast.LENGTH_SHORT).show() }; else -> vm.remove(p.clientId) }
                    confirm = null; onDismiss()
                }) {
                    Text(
                        stringResource(when (what) { "block" -> R.string.block; "report" -> R.string.report; else -> R.string.remove_friend }),
                        color = app.talklive.ui.theme.DangerText,
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
private fun Modifier.combinedClickableCompat(onClick: () -> Unit) = this.tapOnce(onClick = onClick)

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
