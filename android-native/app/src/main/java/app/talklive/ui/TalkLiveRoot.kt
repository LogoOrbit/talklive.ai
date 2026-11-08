package app.talklive.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material.icons.rounded.Call
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.height
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.talklive.R
import app.talklive.call.CallNotice
import app.talklive.call.CallPhase
import app.talklive.call.CallMode
import app.talklive.call.CallService
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.ui.Alignment
import app.talklive.ui.animals.AnimalSetupScreen
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import app.talklive.ui.social.ChatScreen
import app.talklive.ui.social.ChatsScreen
import app.talklive.ui.social.FriendsScreen
import app.talklive.ui.social.IncomingCallScreen
import app.talklive.ui.social.OutgoingCallScreen
import app.talklive.ui.social.SocialViewModel
import app.talklive.ui.main.MainTab
import app.talklive.ui.main.TabBar
import app.talklive.ui.onboarding.AuthRoute
import app.talklive.ui.onboarding.AuthViewModel
import app.talklive.ui.onboarding.OnboardingFlow
import app.talklive.ui.profile.ProfileScreen

private enum class RootScreen { Onboarding, SignIn, Animal, Main }

@Composable
fun TalkLiveRoot(vm: TalkViewModel = hiltViewModel()) {
    val onboarded by vm.onboarded.collectAsStateWithLifecycle()
    val account by vm.account.collectAsStateWithLifecycle()
    val animal by vm.animal.collectAsStateWithLifecycle()
    var signingIn by remember { mutableStateOf(false) }
    LaunchedEffect(account) { if (account != null) signingIn = false }

    AnimatedContent(
        targetState = when {
            !onboarded -> RootScreen.Onboarding
            signingIn -> RootScreen.SignIn
            // Only a new guest picks an avatar here: a signed-in account
            // already has its own (restored from the server).
            animal == null && account == null -> RootScreen.Animal
            else -> RootScreen.Main
        },
        transitionSpec = { (fadeIn(tween(300)) + scaleIn(initialScale = 0.96f)) togetherWith fadeOut(tween(200)) },
        label = "root",
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
    ) { screen ->
        when (screen) {
            RootScreen.Onboarding -> OnboardingFlow(hiltViewModel<AuthViewModel>())
            RootScreen.SignIn -> OnboardingFlow(hiltViewModel<AuthViewModel>(), start = AuthRoute.Choose, onClose = { signingIn = false })
            RootScreen.Animal -> {
                val engageVm: app.talklive.ui.engage.EngageViewModel = hiltViewModel()
                app.talklive.ui.onboarding.FirstRunSetup(onBack = { signingIn = true }) { a, g, age ->
                    engageVm.setMyGender(g)
                    engageVm.setAgeGroup(age)
                    vm.setAnimal(a)
                }
            }
            RootScreen.Main -> MainScreen(vm, onSignIn = { signingIn = true })
        }
    }
}

@Composable
private fun MainScreen(vm: TalkViewModel, onSignIn: () -> Unit) {
    val context = LocalContext.current
    val state by vm.state.collectAsStateWithLifecycle()
    val connected by vm.connected.collectAsStateWithLifecycle()
    val visitors by vm.visitorCount.collectAsStateWithLifecycle()
    val dark by vm.dark.collectAsStateWithLifecycle()
    val animal by vm.animal.collectAsStateWithLifecycle()
    val account by vm.account.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    var filmMatch by remember { mutableStateOf<String?>(null) }
    var micDenied by remember { mutableStateOf(false) }
    var tab by rememberSaveable { mutableStateOf(MainTab.Talk) }
    val social: SocialViewModel = hiltViewModel()
    var openChat by rememberSaveable { mutableStateOf<String?>(null) }
    val incoming by social.incoming.collectAsStateWithLifecycle()
    val outgoing by social.outgoing.collectAsStateWithLifecycle()
    val totalUnread by social.totalUnread.collectAsStateWithLifecycle()
    val requests by social.requests.collectAsStateWithLifecycle()
    val friends by social.friends.collectAsStateWithLifecycle()
    val sent by social.sent.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { social.toasts.collect { t -> launch { snackbar.say(t.get(context)) } } }
    val engageVm: app.talklive.ui.engage.EngageViewModel = hiltViewModel()
    val engage by engageVm.engage.collectAsStateWithLifecycle()
    val filters by engageVm.filters.collectAsStateWithLifecycle()
    val premium by engageVm.premium.collectAsStateWithLifecycle()
    var showStreak by remember { mutableStateOf(false) }
    var showFilters by remember { mutableStateOf(false) }
    // The Plus page; from a free feature it offers to carry on free.
    var showPlus by remember { mutableStateOf<String?>(null) }
    // Plus is offered once, after someone's 3rd good conversation (a minute or
    // more), when they are back on Home: they already know they like it, and
    // nobody is interrupted mid-call.
    var liveSince by remember { mutableStateOf<Long?>(null) }
    LaunchedEffect(state.phase) {
        val p = state.phase
        if (p is CallPhase.Connected) { if (liveSince == null) liveSince = p.sinceMs; return@LaunchedEffect }
        val prefs = context.getSharedPreferences("ui", android.content.Context.MODE_PRIVATE)
        liveSince?.let { since ->
            liveSince = null
            if (System.currentTimeMillis() - since >= 60_000) prefs.edit().putInt("good_calls", prefs.getInt("good_calls", 0) + 1).apply()
        }
        if (p is CallPhase.Idle && !premium.active && prefs.getInt("good_calls", 0) >= 3 && !prefs.getBoolean("plus_offered", false)) {
            prefs.edit().putBoolean("plus_offered", true).apply()
            kotlinx.coroutines.delay(1200) // let the call screen close first
            showPlus = "good_calls"
        }
    }
    LaunchedEffect(Unit) {
        engageVm.moments.collect { m ->
            snackbar.say(
                when (m) {
                    is app.talklive.engage.EngageMoment.StreakUp -> context.getString(R.string.moment_streak, m.days)
                    is app.talklive.engage.EngageMoment.NewStamp ->
                        context.getString(R.string.moment_stamp, app.talklive.ui.social.flag(m.countryCode) ?: "", app.talklive.ui.engage.countryName(m.countryCode))
                },
            )
        }
    }

    // Ask once for notifications, so friends' messages and calls can reach this phone.
    val notifPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    LaunchedEffect(Unit) {
        val prefs = context.getSharedPreferences("ui", android.content.Context.MODE_PRIVATE)
        if (Build.VERSION.SDK_INT >= 33 && !prefs.getBoolean("asked_notifications", false) &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            prefs.edit().putBoolean("asked_notifications", true).apply()
            notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    fun begin() {
        CallService.start(context)
        vm.start()
    }

    // Whatever needs the microphone runs once it is allowed.
    var afterMic by remember { mutableStateOf<(() -> Unit)?>(null) }
    val permissions = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        val mic = result[Manifest.permission.RECORD_AUDIO]
            ?: (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)
        if (mic) afterMic?.invoke() else micDenied = true
        afterMic = null
    }

    fun withMic(action: () -> Unit) {
        val needed = buildList {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                add(Manifest.permission.RECORD_AUDIO)
            }
            if (Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) add(Manifest.permission.POST_NOTIFICATIONS)
            if (Build.VERSION.SDK_INT >= 31 &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED
            ) add(Manifest.permission.BLUETOOTH_CONNECT)
        }
        if (needed.isEmpty()) action() else { afterMic = action; permissions.launch(needed.toTypedArray()) }
    }
    val mode by vm.mode.collectAsStateWithLifecycle()
    // A text chat needs no microphone and no call service.
    val onStart: () -> Unit = { if (mode == CallMode.Chat) { vm.start() } else withMic(::begin) }

    // A home-screen shortcut asked for a call or chat.
    val launch by app.talklive.data.LaunchActions.pending.collectAsStateWithLifecycle()
    LaunchedEffect(launch, connected) {
        val a = launch ?: return@LaunchedEffect
        if (!connected || state.phase !is CallPhase.Idle) return@LaunchedEffect
        app.talklive.data.LaunchActions.pending.value = null
        tab = MainTab.Talk
        if (a == app.talklive.data.LaunchActions.Action.Chat) { vm.setMode(CallMode.Chat); vm.start() }
        else { vm.setMode(CallMode.Talk); withMic(::begin) }
    }

    val noticeText = state.notice?.let { n ->
        when (n) {
            is CallNotice.PartnerLeft -> stringResource(if (n.dropped) R.string.partner_dropped else R.string.partner_left, n.name)
            CallNotice.Banned -> stringResource(R.string.banned)
            is CallNotice.Refused -> n.reason
            is CallNotice.CallEnded -> stringResource(R.string.call_ended, n.name)
        }
    }
    LaunchedEffect(state.notice) {
        if (noticeText != null) {
            snackbar.say(noticeText)
            vm.dismissNotice()
        }
    }

    val inCall = state.phase !is CallPhase.Idle
    val onlinePeople by vm.onlinePeople.collectAsStateWithLifecycle()
    var filtersBeforeFindIn by remember { mutableStateOf<app.talklive.engage.Filters?>(null) }
    LaunchedEffect(inCall) {
        if (!inCall) filtersBeforeFindIn?.let { engageVm.setFilters(it); filtersBeforeFindIn = null }
    }
    val game by vm.game.collectAsStateWithLifecycle()
    var showGames by remember { mutableStateOf(false) }
    // A game that starts opens the board on both phones.
    LaunchedEffect(game.stage) {
        if (game.stage == app.talklive.game.Stage.Playing || game.stage == app.talklive.game.Stage.Waiting) showGames = true
        if (game.stage == app.talklive.game.Stage.Idle && !game.declined) showGames = false
    }
    LaunchedEffect(inCall) { if (!inCall) showGames = false }
    // Back: a call or search asks first; the home tabs need two presses to exit.
    var confirmLeave by remember { mutableStateOf(false) }
    var lastBackAt by remember { mutableStateOf(0L) }
    val activity = context as? android.app.Activity
    val backScope = androidx.compose.runtime.rememberCoroutineScope()
    androidx.activity.compose.BackHandler(enabled = !inCall && openChat == null) {
        val now = System.currentTimeMillis()
        if (tab != MainTab.Talk) tab = MainTab.Talk
        else if (now - lastBackAt < 2000) activity?.finish()
        else { lastBackAt = now; backScope.launch { snackbar.say(context.getString(R.string.press_back_exit)) } }
    }
    androidx.activity.compose.BackHandler(enabled = inCall) { confirmLeave = true }
    if (confirmLeave && inCall) {
        val live = state.phase is CallPhase.Connected
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { confirmLeave = false },
            title = { Text(stringResource(if (live) (if (state.mode == CallMode.Chat) R.string.leave_chat_q else R.string.leave_call_q) else R.string.stop_search_q)) },
            confirmButton = { TextButton(onClick = { confirmLeave = false; vm.end() }) { Text(stringResource(if (live) R.string.leave else R.string.tap_to_stop), color = MaterialTheme.colorScheme.error) } },
            dismissButton = { TextButton(onClick = { confirmLeave = false }) { Text(stringResource(R.string.stay)) } },
        )
    }
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    // Next, with Undo for Plus members (the server keeps the skipped person for 15 s).
    val onNext: () -> Unit = {
        val skipped = (state.phase as? CallPhase.Connected)?.partner?.username
        vm.next()
        if (premium.active && skipped != null) scope.launch {
            val r = snackbar.say(
                context.getString(R.string.skipped_name, skipped), actionLabel = context.getString(R.string.undo),
                duration = androidx.compose.material3.SnackbarDuration.Long,
            )
            if (r == androidx.compose.material3.SnackbarResult.ActionPerformed) {
                vm.undoSkip()?.let { why ->
                    snackbar.say(context.getString(if (why == "busy") R.string.undo_busy else R.string.undo_gone))
                }
            }
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            AnimatedVisibility(
                visible = !inCall,
                enter = slideInVertically { it } + fadeIn(),
                exit = slideOutVertically { it } + fadeOut(),
            ) {
                TabBar(
                    selected = tab,
                    onSelect = { tab = it },
                    badges = mapOf(MainTab.Chats to totalUnread, MainTab.Friends to requests.size),
                )
            }
        },
    ) { pad ->
        Box(Modifier.fillMaxSize().padding(bottom = if (inCall) 0.dp else pad.calculateBottomPadding())) {
            val homeAutoConnect by vm.autoConnect.collectAsStateWithLifecycle()
            AnimatedContent(
                targetState = tab,
                transitionSpec = { fadeIn(tween(220)) togetherWith fadeOut(tween(120)) },
                label = "tab",
            ) { t ->
                when (t) {
                    MainTab.Talk -> HomeScreen(
                        connected = connected,
                        visitors = visitors,
                        animal = animal,
                        name = account?.nickname,
                        dark = dark,
                        onStart = onStart,
                        onToggleTheme = vm::toggleTheme,
                        onProfile = { tab = MainTab.Profile },
                        mode = mode,
                        onMode = vm::setMode,
                        engage = engage,
                        filtersActive = filters.activeCount,
                        onStreak = { showStreak = true },
                        // Everyone can filter by interests and 2 countries (as on the website);
                        // gender and more countries open Plus from inside the sheet.
                        onFilters = { showFilters = true },
                        premium = premium.active,
                        onPlus = { showPlus = "home" },
                        online = onlinePeople,
                        autoConnect = homeAutoConnect,
                        onAutoConnect = vm::setAutoConnect,
                        onFindIn = { code ->
                            // Look for someone in that country for this search only;
                            // the person's own filters come back when it ends (it
                            // used to be saved as a filter, which looked automatic).
                            if (filtersBeforeFindIn == null) filtersBeforeFindIn = filters
                            engageVm.setFilters(filters.copy(includeCountries = listOf(code), excludeCountries = filters.excludeCountries - code))
                            scope.launch { snackbar.say(context.getString(R.string.finding_in, app.talklive.ui.engage.countryName(code))) }
                            onStart()
                        },
                    )
                    MainTab.Chats -> ChatsScreen(social, onOpenChat = { openChat = it }, onStartTalking = { tab = MainTab.Talk })
                    MainTab.Friends -> FriendsScreen(social, onOpenChat = { openChat = it }, onStartTalking = { tab = MainTab.Talk }, onPlus = { showPlus = "history" })
                    MainTab.Profile -> ProfileScreen(onSignIn = onSignIn)
                }
            }
        }
        AnimatedVisibility(
            visible = inCall,
            enter = slideInVertically(tween(380)) { it / 4 } + fadeIn(tween(300)),
            exit = slideOutVertically(tween(300)) { it / 4 } + fadeOut(tween(220)),
        ) {
            val level by vm.remoteLevel.collectAsStateWithLifecycle()
            val chatMessages by vm.chat.collectAsStateWithLifecycle()
            Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
                val partnerId = (state.phase as? CallPhase.Connected)?.partner?.clientId
                    ?: (state.phase as? CallPhase.Connecting)?.partner?.clientId
                val friendStatus = when {
                    partnerId == null -> FriendStatus.None
                    friends.any { it.clientId == partnerId } -> FriendStatus.Friends
                    partnerId in sent -> FriendStatus.Requested
                    else -> FriendStatus.None
                }
                val autoConnect by vm.autoConnect.collectAsStateWithLifecycle()
                val voiceBands by vm.voiceBands.collectAsStateWithLifecycle()
                if (state.mode == CallMode.Chat) TextChatScreen(
                    state = state,
                    messages = chatMessages,
                    myAnimal = animal,
                    friendStatus = friendStatus,
                    icebreakers = vm::icebreakers,
                    onSend = vm::sendChat,
                    onSendGif = vm::sendGif,
                    onTyping = vm::typing,
                    onReact = vm::reactToMessage,
                    onAddFriend = { partnerId?.let { social.sendRequest(it) } },
                    onRequestPending = { scope.launch { snackbar.say(context.getString(R.string.waiting_accept, (state.phase as? CallPhase.Connected)?.partner?.username ?: "")) } },
                    onReport = vm::report,
                    onNext = onNext,
                    // The X asks first, like Back (a stray tap or key press used to end the chat).
                    onEnd = { if (state.phase is CallPhase.Connected) confirmLeave = true else vm.end() },
                    onGames = { showGames = true },
                    onSwitchToVoice = { withMic { vm.inviteVoice() } },
                ) else CallScreen(
                    state = state,
                    connected = connected,
                    myAnimal = animal,
                    remoteLevel = { level },
                    friendStatus = when {
                        partnerId == null -> FriendStatus.None
                        friends.any { it.clientId == partnerId } -> FriendStatus.Friends
                        partnerId in sent -> FriendStatus.Requested
                        else -> FriendStatus.None
                    },
                    onAddFriend = { partnerId?.let { social.sendRequest(it) } },
                    reactions = vm.reactions,
                    onReact = vm::react,
                    chat = chatMessages,
                    onSendChat = { vm.sendChat(it) },
                    onSendGif = vm::sendGif,
                    onTyping = vm::typing,
                    icebreaker = { vm.icebreakers(1).firstOrNull() },
                    onGames = { showGames = true },
                    onNext = onNext,
                    onEnd = vm::end,
                    onMute = vm::toggleMute,
                    onSpeaker = vm::toggleSpeaker,
                    onReport = vm::report,
                    autoConnect = autoConnect,
                    onAutoConnect = vm::setAutoConnect,
                    bands = { voiceBands },
                )
                val connectedPartner = (state.phase as? CallPhase.Connected)?.partner
                app.talklive.ui.components.PlusEntrance(connectedPartner?.clientId, connectedPartner?.premium == true)
                app.talklive.ui.call.FilmMatchBanner(filmMatch, Modifier.align(Alignment.TopCenter))
            }
        }
    }

    // Switching a text chat to voice.
    state.voiceInviteFrom?.let { who ->
        AlertDialog(
            onDismissRequest = { vm.answerVoiceInvite(false) },
            icon = { Icon(androidx.compose.material.icons.Icons.Rounded.Call, null, tint = MaterialTheme.colorScheme.primary) },
            title = { Text(stringResource(R.string.voice_invite_title, who)) },
            text = { Text(stringResource(R.string.voice_invite_body)) },
            confirmButton = { TextButton(onClick = { withMic { vm.answerVoiceInvite(true) } }) { Text(stringResource(R.string.accept)) } },
            dismissButton = { TextButton(onClick = { vm.answerVoiceInvite(false) }) { Text(stringResource(R.string.not_now)) } },
        )
    }
    LaunchedEffect(state.voiceInviteDeclined) {
        if (state.voiceInviteDeclined) { snackbar.say(context.getString(R.string.voice_invite_declined)); vm.clearVoiceInviteDeclined() }
    }

    // Mini-games with the person on the call or chat.
    val partnerName = (state.phase as? CallPhase.Connected)?.partner?.username ?: ""
    if (inCall && showGames) {
        app.talklive.ui.game.GameSheet(
            ui = game, partnerName = partnerName,
            onInvite = vm::inviteGame, onCell = vm::tapCell, onEdge = vm::drawEdge, onRematch = vm::rematch,
            onClose = { vm.leaveGame(); showGames = false },
        )
    } else if (inCall && game.stage == app.talklive.game.Stage.Invited) {
        app.talklive.ui.game.GameInviteDialog(game.kind, partnerName, onAccept = { vm.acceptGame(); showGames = true }, onDecline = vm::declineGame)
    }

    // After a call: how was it?
    androidx.compose.animation.AnimatedVisibility(
        visible = state.ratePrompt != null && state.phase !is CallPhase.Connected,
        enter = slideInVertically { it } + fadeIn(),
        exit = slideOutVertically { it } + fadeOut(),
        modifier = Modifier.fillMaxSize().wrapContentHeight(Alignment.Bottom),
    ) {
        var shown by remember { mutableStateOf(state.ratePrompt) }
        LaunchedEffect(state.ratePrompt) { if (state.ratePrompt != null) shown = state.ratePrompt }
        shown?.let {
            RateCard(
                it.name, onRate = vm::rate, onDismiss = vm::dismissRating,
                modifier = Modifier.navigationBarsPadding().padding(start = 16.dp, end = 16.dp, bottom = if (inCall) 150.dp else 96.dp),
            )
        }
    }

    // Both hearted each other.
    if (state.mutualHeart) {
        val p = (state.phase as? CallPhase.Connected)?.partner
        MutualHeartOverlay(
            name = p?.username ?: "them",
            canAddFriend = p != null && friends.none { it.clientId == p.clientId } && p.clientId !in sent,
            onAddFriend = { p?.let { social.sendRequest(it.clientId) } },
            onDismiss = vm::dismissMutualHeart,
        )
    }

    // A conversation slides in over the tabs.
    AnimatedVisibility(
        visible = openChat != null && !inCall,
        enter = slideInHorizontally(tween(320)) { it } + fadeIn(tween(200)),
        exit = slideOutHorizontally(tween(260)) { it } + fadeOut(tween(200)),
    ) {
        var shown by remember { mutableStateOf(openChat) }
        LaunchedEffect(openChat) { if (openChat != null) shown = openChat }
        shown?.let { ChatScreen(social, it, onBack = { openChat = null }) }
    }

    // Friend calls ringing in or out cover everything.
    AnimatedVisibility(
        visible = (incoming != null || outgoing != null) && !inCall,
        enter = fadeIn() + scaleIn(initialScale = 0.94f),
        exit = fadeOut(),
    ) {
        val inc = incoming
        val out = outgoing
        when {
            inc != null -> IncomingCallScreen(
                inc,
                animal = social.person(inc.fromClientId)?.animal,
                onAccept = { withMic { social.answer(true) } },
                onDecline = { social.answer(false) },
            )
            out != null -> OutgoingCallScreen(out, onCancel = social::cancelCall)
        }
    }

    if (showStreak) engage?.let {
        app.talklive.ui.engage.StreakSheet(
            it, onDismiss = { showStreak = false }, premium = premium.active, restoring = engageVm.restoring,
            onRestore = engageVm::restoreStreak, onPlus = { showStreak = false; showPlus = "streak" },
        )
    }
    if (showFilters) app.talklive.ui.engage.FiltersSheet(filters, premium.active, onApply = engageVm::setFilters, onDismiss = { showFilters = false }, onPlus = { showFilters = false; showPlus = "locked" }, loadCounts = engageVm::countryCounts)
    // Same favourite film or show as the person who just connected: say so.
    val myFilms by engageVm.films.collectAsStateWithLifecycle()
    val livePartner = (state.phase as? CallPhase.Connected)?.partner
    LaunchedEffect(livePartner?.clientId) {
        filmMatch = null
        val p = livePartner ?: return@LaunchedEffect
        fun key(f: app.talklive.engage.Film) = f.title.lowercase().filter { it.isLetterOrDigit() } + f.year
        val shared = p.films.firstOrNull { f -> myFilms.any { (it.type == f.type && it.id == f.id) || key(it) == key(f) } } ?: return@LaunchedEffect
        kotlinx.coroutines.delay(1200)
        filmMatch = shared.title
        kotlinx.coroutines.delay(7000)
        filmMatch = null
    }
    // Replies from the team to this person's feedback.
    val replies by engageVm.replies.collectAsStateWithLifecycle()
    replies.firstOrNull()?.let { r ->
        AlertDialog(
            onDismissRequest = {},
            icon = { Text("💬", fontSize = 32.sp) },
            title = { Text(stringResource(R.string.feedback_reply_title)) },
            text = {
                androidx.compose.foundation.layout.Column {
                    if (r.feedback.isNotBlank()) Text("“${r.feedback.take(200)}”", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    androidx.compose.foundation.layout.Spacer(androidx.compose.ui.Modifier.height(12.dp))
                    Text(r.message, style = MaterialTheme.typography.bodyLarge)
                }
            },
            confirmButton = { TextButton(onClick = { engageVm.ackReply(r.id) }) { Text(stringResource(R.string.got_it)) } },
        )
    }
    showPlus?.let { from ->
        app.talklive.ui.engage.PlusSheet(
            premium, signedIn = account != null,
            onSignIn = { showPlus = null; onSignIn() },
            onDismiss = { showPlus = null },
            onFreeOption = if (from == "filters") stringResource(R.string.plus_free_filters) to { showPlus = null; showFilters = true } else null,
        )
    }

    // A moderator's warning must be read and acknowledged.
    val warnings by vm.warnings.collectAsStateWithLifecycle()
    warnings.firstOrNull()?.let { w ->
        AlertDialog(
            onDismissRequest = {},
            icon = { Icon(androidx.compose.material.icons.Icons.Rounded.Shield, null, tint = MaterialTheme.colorScheme.error) },
            title = { Text(stringResource(R.string.warning_title)) },
            text = { Text(w.message.ifBlank { stringResource(R.string.warning_default) }) },
            confirmButton = { TextButton(onClick = { vm.acknowledgeWarning(w.id) }) { Text(stringResource(R.string.warning_ack)) } },
            properties = androidx.compose.ui.window.DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false),
        )
    }

    // Maintenance mode: say so instead of searching forever.
    val maintenance by vm.maintenance.collectAsStateWithLifecycle()
    maintenance?.let { msg ->
        Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(32.dp), contentAlignment = Alignment.Center) {
            androidx.compose.foundation.layout.Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("🛠️", style = MaterialTheme.typography.displaySmall)
                androidx.compose.foundation.layout.Spacer(Modifier.padding(8.dp))
                Text(stringResource(R.string.maintenance_title), style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground)
                Text(msg, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            }
        }
    }

    if (micDenied) {
        AlertDialog(
            onDismissRequest = { micDenied = false },
            text = { Text(stringResource(R.string.mic_needed)) },
            confirmButton = {
                TextButton(onClick = {
                    micDenied = false
                    context.startActivity(
                        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null)),
                    )
                }) { Text(stringResource(R.string.open_settings)) }
            },
            dismissButton = { TextButton(onClick = { micDenied = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }

    // Mid-call: another friend calling or messaging shows for two seconds, quietly.
    var miniNote by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        social.messageEvents.collect { (id, who, text) ->
            // Like a messenger: a quick note unless that chat is already open (or muted).
            if (openChat != id && id !in social.muted.value) { miniNote = "💬 $who: $text"; kotlinx.coroutines.delay(2000); miniNote = null }
        }
    }
    LaunchedEffect(incoming, inCall) {
        val inc = incoming
        if (inCall && inc != null) { miniNote = "📞 " + context.getString(R.string.is_calling, inc.username); kotlinx.coroutines.delay(2000); miniNote = null }
    }
    androidx.compose.foundation.layout.Box(
        androidx.compose.ui.Modifier.fillMaxSize().statusBarsPadding().padding(top = 6.dp),
        contentAlignment = androidx.compose.ui.Alignment.TopCenter,
    ) { app.talklive.ui.call.MiniNote(miniNote) }

    // This account is open on another device and this phone stepped aside.
    val elsewhere by vm.elsewhere.collectAsStateWithLifecycle()
    if (elsewhere) androidx.compose.foundation.layout.Box(
        androidx.compose.ui.Modifier.fillMaxSize().statusBarsPadding().padding(top = 8.dp, start = 16.dp, end = 16.dp),
        contentAlignment = androidx.compose.ui.Alignment.TopCenter,
    ) {
        androidx.compose.material3.Surface(shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surfaceVariant, shadowElevation = 6.dp) {
            androidx.compose.foundation.layout.Row(androidx.compose.ui.Modifier.padding(start = 16.dp, end = 8.dp, top = 6.dp, bottom = 6.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Text(stringResource(R.string.open_elsewhere), style = MaterialTheme.typography.bodyMedium, modifier = androidx.compose.ui.Modifier.weight(1f, fill = false).padding(end = 8.dp))
                androidx.compose.material3.Button(onClick = vm::useHere) { Text(stringResource(R.string.use_here)) }
            }
        }
    }

    // Messages show at the top of every screen, clear of the buttons below.
    androidx.compose.foundation.layout.Box(
        androidx.compose.ui.Modifier.fillMaxSize().statusBarsPadding().padding(top = 8.dp, start = 16.dp, end = 16.dp),
        contentAlignment = androidx.compose.ui.Alignment.TopCenter,
    ) {
        SnackbarHost(snackbar) { data ->
            androidx.compose.material3.Surface(
                shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
                contentColor = MaterialTheme.colorScheme.onSurface,
                shadowElevation = 6.dp,
                modifier = androidx.compose.ui.Modifier.clickable { data.dismiss() },
            ) {
                androidx.compose.foundation.layout.Row(
                    androidx.compose.ui.Modifier.padding(start = 16.dp, end = 8.dp, top = 6.dp, bottom = 6.dp).heightIn(min = 40.dp),
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                ) {
                    Text(data.visuals.message, style = MaterialTheme.typography.bodyMedium, modifier = androidx.compose.ui.Modifier.weight(1f, fill = false).padding(end = 8.dp))
                    data.visuals.actionLabel?.let { label ->
                        TextButton(onClick = { data.performAction() }) { Text(label) }
                    }
                }
            }
        }
    }
}

/**
 * Shows one message at a time: a repeat of the one on screen is ignored, and a
 * new one replaces it instead of queueing behind it.
 */
suspend fun SnackbarHostState.say(
    message: String,
    actionLabel: String? = null,
    duration: androidx.compose.material3.SnackbarDuration = if (actionLabel == null) androidx.compose.material3.SnackbarDuration.Short else androidx.compose.material3.SnackbarDuration.Long,
): androidx.compose.material3.SnackbarResult {
    if (currentSnackbarData?.visuals?.message == message) return androidx.compose.material3.SnackbarResult.Dismissed
    currentSnackbarData?.dismiss()
    return showSnackbar(message, actionLabel, withDismissAction = false, duration = duration)
}
