package app.talklive.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material.icons.rounded.Notifications
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
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
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
    // Signing in (not opening the app already signed in) plays the welcome.
    var hadAccount by remember { mutableStateOf<Boolean?>(null) }
    var celebrate by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(account) {
        val now = account != null
        if (hadAccount == false && now) celebrate = account?.nickname
        hadAccount = now
    }

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
                val context = LocalContext.current
                val engageVm: app.talklive.ui.engage.EngageViewModel = hiltViewModel()
                app.talklive.ui.onboarding.FirstRunSetup(onBack = { signingIn = true }) { a, g, age ->
                    engageVm.setAgeGroup(app.talklive.data.AgeGate.ageGroup(context))
                    vm.setAnimal(a)
                }
            }
            RootScreen.Main -> MainScreen(vm, onSignIn = { signingIn = true })
        }
    }
    celebrate?.let { name -> app.talklive.ui.onboarding.SignedInWelcome(name, animal) { celebrate = null } }
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
    // While you were away: back after 10+ minutes, who wrote and who wanted to talk.
    var leftAt by remember { mutableStateOf(0L) }
    var awaySince by remember { mutableStateOf(0L) }
    var away by remember { mutableStateOf<List<Triple<app.talklive.social.Person, Int, Boolean>>?>(null) }
    val lifecycle = androidx.lifecycle.compose.LocalLifecycleOwner.current
    androidx.compose.runtime.DisposableEffect(lifecycle) {
        val obs = androidx.lifecycle.LifecycleEventObserver { _, e ->
            when (e) {
                androidx.lifecycle.Lifecycle.Event.ON_STOP -> leftAt = System.currentTimeMillis()
                androidx.lifecycle.Lifecycle.Event.ON_START -> if (leftAt > 0 && System.currentTimeMillis() - leftAt > 10 * 60_000) awaySince = leftAt
                else -> Unit
            }
        }
        lifecycle.lifecycle.addObserver(obs)
        onDispose { lifecycle.lifecycle.removeObserver(obs) }
    }
    LaunchedEffect(awaySince) {
        if (awaySince == 0L) return@LaunchedEffect
        kotlinx.coroutines.delay(2500) // let the fresh state arrive first
        val people = (social.friends.value + social.history.value).associateBy { it.clientId }
        val called = social.activity.value.filter { it.type == "call_back_request" && it.ts >= awaySince }.map { it.fromClientId }.toSet()
        val wrote = social.unread.value.filterValues { it > 0 }
        val ids = (called + wrote.keys).distinct()
        away = ids.mapNotNull { id -> people[id]?.let { Triple(it, wrote[id] ?: 0, id in called) } }.take(6).ifEmpty { null }
        awaySince = 0L
    }
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
    // Tapped "Get TalkLive Plus" on the first-launch intro: open Plus once home.
    LaunchedEffect(Unit) {
        val ui = context.getSharedPreferences("ui", android.content.Context.MODE_PRIVATE)
        if (ui.getBoolean("plus_after_intro", false)) {
            ui.edit().remove("plus_after_intro").apply()
            kotlinx.coroutines.delay(600)
            showPlus = "home"
        }
    }
    // Plus is only ever suggested gently, at most once a day, never mid-call
    // and never at launch: after a call that clearly went well (10+ minutes,
    // or both tapped the heart), and a guest's 3rd good call suggests an
    // account (accounts get a free Plus day from the server).
    var liveSince by remember { mutableStateOf<Long?>(null) }
    var hearted by remember { mutableStateOf(false) }
    LaunchedEffect(state.mutualHeart) { if (state.mutualHeart) hearted = true }
    LaunchedEffect(state.phase) {
        val p = state.phase
        if (p is CallPhase.Connected) { if (liveSince == null) liveSince = p.sinceMs; return@LaunchedEffect }
        val since = liveSince ?: return@LaunchedEffect
        liveSince = null
        val wasHearted = hearted; hearted = false
        val prefs = context.getSharedPreferences("ui", android.content.Context.MODE_PRIVATE)
        val seconds = (System.currentTimeMillis() - since) / 1000
        if (seconds >= 60) prefs.edit().putInt("good_calls", prefs.getInt("good_calls", 0) + 1).apply()
        if (premium.active) return@LaunchedEffect
        val now = System.currentTimeMillis()
        val quiet = now - prefs.getLong("plus_nudge_at", 0) < 24 * 3600_000L || now < prefs.getLong("plus_nudge_snooze", 0)
        if (quiet) return@LaunchedEffect
        kotlinx.coroutines.delay(1500) // let the call screen close first
        if (account == null && prefs.getInt("good_calls", 0) >= 3 && !prefs.getBoolean("trial_hint", false)) {
            prefs.edit().putBoolean("trial_hint", true).putLong("plus_nudge_at", now).apply()
            if (snackbar.say(context.getString(R.string.nudge_trial_guest), context.getString(R.string.sign_in)) == androidx.compose.material3.SnackbarResult.ActionPerformed) onSignIn()
            return@LaunchedEffect
        }
        if (seconds >= 600 || wasHearted) {
            prefs.edit().putLong("plus_nudge_at", now).apply()
            val r = snackbar.say(context.getString(if (wasHearted) R.string.nudge_after_heart else R.string.nudge_after_call), context.getString(R.string.nudge_see_plus))
            if (r == androidx.compose.material3.SnackbarResult.ActionPerformed) showPlus = "after_call"
            // Closed without a look: stay quiet for 3 days.
            else prefs.edit().putLong("plus_nudge_snooze", now + 3 * 24 * 3600_000L).apply()
        }
    }
    away?.let { list ->
        AlertDialog(
            onDismissRequest = { away = null },
            title = { Text(stringResource(R.string.away_title)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    list.forEach { (p, msgs, called) ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            app.talklive.ui.animals.AnimalAvatar(p.animal, p.displayName, 36.dp)
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(p.displayName, style = MaterialTheme.typography.titleSmall, maxLines = 1)
                                Text(
                                    if (called) stringResource(R.string.away_called) else stringResource(R.string.away_msgs, msgs),
                                    style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            TextButton(onClick = {
                                away = null
                                if (called) social.call(p) else openChat = p.clientId
                            }) { Text(stringResource(if (called) R.string.away_call_back else R.string.away_reply)) }
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { away = null }) { Text(stringResource(R.string.got_it)) } },
        )
    }
    // The free Plus day, when the server grants it.
    var trialUntil by remember { mutableStateOf<Long?>(null) }
    LaunchedEffect(Unit) { engageVm.trials.collect { trialUntil = it } }
    trialUntil?.let {
        AlertDialog(
            onDismissRequest = { trialUntil = null },
            icon = { Text("🎁", fontSize = 40.sp) },
            title = { Text(stringResource(R.string.trial_title)) },
            text = { Text(stringResource(R.string.trial_body)) },
            confirmButton = { TextButton(onClick = { trialUntil = null }) { Text(stringResource(R.string.trial_ok)) } },
        )
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

    // The first time someone reaches Home: a friendly ask to turn notifications
    // on (once), then the system prompt. Settings > Notifications has the rest.
    val notifPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (!granted) app.talklive.ui.profile.openSystemNotificationSettings(context)
    }
    var notifPrompt by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        val prefs = context.getSharedPreferences("ui", android.content.Context.MODE_PRIVATE)
        if (prefs.getBoolean("notif_prompted", false)) return@LaunchedEffect
        if (androidx.core.app.NotificationManagerCompat.from(context).areNotificationsEnabled()) return@LaunchedEffect
        kotlinx.coroutines.delay(1500)
        prefs.edit().putBoolean("notif_prompted", true).putBoolean("asked_notifications", true).apply()
        notifPrompt = true
    }
    if (notifPrompt) {
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { notifPrompt = false },
            icon = { androidx.compose.material3.Icon(androidx.compose.material.icons.Icons.Rounded.Notifications, null, tint = MaterialTheme.colorScheme.primary) },
            title = { Text(stringResource(R.string.notif_prompt_title), textAlign = androidx.compose.ui.text.style.TextAlign.Center) },
            text = { Text(stringResource(R.string.notif_prompt_body), textAlign = androidx.compose.ui.text.style.TextAlign.Center) },
            confirmButton = {
                androidx.compose.material3.Button(onClick = {
                    notifPrompt = false
                    if (Build.VERSION.SDK_INT >= 33) notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
                    else app.talklive.ui.profile.openSystemNotificationSettings(context)
                }) { Text(stringResource(R.string.notif_prompt_yes)) }
            },
            dismissButton = { androidx.compose.material3.TextButton(onClick = { notifPrompt = false }) { Text(stringResource(R.string.notif_prompt_no)) } },
        )
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
    // Back on a live voice call shrinks it to a bar at the top, so the rest of
    // the app can be used while talking; tapping the bar brings it back.
    var callMinimized by remember { mutableStateOf(false) }
    val liveVoice = state.phase is CallPhase.Connected && state.mode == CallMode.Talk
    LaunchedEffect(liveVoice) { if (!liveVoice) callMinimized = false }
    val showFullCall = inCall && !callMinimized
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
    androidx.activity.compose.BackHandler(enabled = !showFullCall && openChat == null) {
        val now = System.currentTimeMillis()
        if (tab != MainTab.Talk) tab = MainTab.Talk
        else if (now - lastBackAt < 2000) activity?.finish()
        else { lastBackAt = now; backScope.launch { snackbar.say(context.getString(R.string.press_back_exit)) } }
    }
    androidx.activity.compose.BackHandler(enabled = showFullCall) {
        if (liveVoice) {
            callMinimized = true
            val prefs = context.getSharedPreferences("ui", android.content.Context.MODE_PRIVATE)
            if (!prefs.getBoolean("minimize_hint", false)) {
                prefs.edit().putBoolean("minimize_hint", true).apply()
                backScope.launch { snackbar.say(context.getString(R.string.call_minimized_hint)) }
            }
        } else confirmLeave = true
    }
    if (confirmLeave && inCall) {
        val live = state.phase is CallPhase.Connected
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { confirmLeave = false },
            title = { Text(stringResource(if (live) (if (state.mode == CallMode.Chat) R.string.leave_chat_q else R.string.leave_call_q) else R.string.stop_search_q)) },
            confirmButton = { TextButton(onClick = { confirmLeave = false; vm.end() }) { Text(stringResource(if (live) R.string.leave else R.string.tap_to_stop), color = app.talklive.ui.theme.DangerText) } },
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
                visible = !showFullCall,
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
        Box(Modifier.fillMaxSize().padding(bottom = if (showFullCall) 0.dp else pad.calculateBottomPadding())) {
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
                        ring = premium.ring,
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
            visible = showFullCall,
            // Shrinks up into the top bar and grows back out of it.
            enter = scaleIn(tween(320), initialScale = 0.85f, transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 0f)) + fadeIn(tween(240)),
            exit = scaleOut(tween(280), targetScale = 0.85f, transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 0f)) + fadeOut(tween(200)),
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
                    premium = premium.active,
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
    if (showFullCall && showGames) {
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
        visible = openChat != null && !showFullCall,
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
            // Reached from a limit (locked filter, history, a free feature): lead with the 1-day pass.
            passFirst = from in setOf("locked", "history", "filters", "undo", "likes", "streak"),
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

    // The minimised call, floating at the top over whatever else is open.
    AnimatedVisibility(
        visible = inCall && callMinimized,
        enter = slideInVertically(tween(320)) { -it } + fadeIn(tween(240)),
        exit = slideOutVertically(tween(260)) { -it } + fadeOut(tween(200)),
        modifier = Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 12.dp, vertical = 6.dp),
    ) {
        (state.phase as? CallPhase.Connected)?.let { live ->
            app.talklive.ui.call.MiniCallBar(
                partner = live.partner, sinceMs = live.sinceMs, muted = state.muted,
                onOpen = { callMinimized = false }, onMute = vm::toggleMute, onEnd = vm::end,
            )
        }
    }
    // Messages show at the top of every screen, clear of the buttons below.
    androidx.compose.foundation.layout.Box(
        androidx.compose.ui.Modifier.fillMaxSize().statusBarsPadding().padding(top = 8.dp, start = 16.dp, end = 16.dp),
        contentAlignment = androidx.compose.ui.Alignment.TopCenter,
    ) {
        SnackbarHost(snackbar) { data ->
            // Swipe it away sideways or up, like a phone notification.
            val dx = remember(data) { androidx.compose.animation.core.Animatable(0f) }
            val dy = remember(data) { androidx.compose.animation.core.Animatable(0f) }
            val swipeScope = rememberCoroutineScope()
            androidx.compose.material3.Surface(
                shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
                contentColor = MaterialTheme.colorScheme.onSurface,
                shadowElevation = 6.dp,
                modifier = androidx.compose.ui.Modifier
                    .graphicsLayer {
                        translationX = dx.value; translationY = dy.value
                        alpha = (1f - (kotlin.math.abs(dx.value) / (size.width * 0.8f)) - (-dy.value / 160f)).coerceIn(0f, 1f)
                    }
                    .pointerInput(data) {
                        detectDragGestures(
                            onDragEnd = {
                                swipeScope.launch {
                                    if (kotlin.math.abs(dx.value) > size.width * 0.3f || dy.value < -48f) data.dismiss()
                                    else { launch { dx.animateTo(0f) }; dy.animateTo(0f) }
                                }
                            },
                            onDragCancel = { swipeScope.launch { launch { dx.animateTo(0f) }; dy.animateTo(0f) } },
                        ) { change, drag ->
                            change.consume()
                            swipeScope.launch { dx.snapTo(dx.value + drag.x); dy.snapTo((dy.value + drag.y).coerceAtMost(0f)) }
                        }
                    }
                    .clickable { data.dismiss() },
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
