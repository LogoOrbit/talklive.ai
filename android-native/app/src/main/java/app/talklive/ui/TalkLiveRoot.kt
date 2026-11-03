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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
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
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.talklive.R
import app.talklive.call.CallNotice
import app.talklive.call.CallPhase
import app.talklive.call.CallService
import app.talklive.ui.animals.AnimalSetupScreen
import app.talklive.ui.main.EmptyTab
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
            animal == null -> RootScreen.Animal
            else -> RootScreen.Main
        },
        transitionSpec = { (fadeIn(tween(300)) + scaleIn(initialScale = 0.96f)) togetherWith fadeOut(tween(200)) },
        label = "root",
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
    ) { screen ->
        when (screen) {
            RootScreen.Onboarding -> OnboardingFlow(hiltViewModel<AuthViewModel>())
            RootScreen.SignIn -> OnboardingFlow(hiltViewModel<AuthViewModel>(), start = AuthRoute.Choose, onClose = { signingIn = false })
            RootScreen.Animal -> AnimalSetupScreen(onDone = vm::setAnimal)
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
    var micDenied by remember { mutableStateOf(false) }
    var tab by rememberSaveable { mutableStateOf(MainTab.Talk) }

    fun begin() {
        CallService.start(context)
        vm.start()
    }

    val permissions = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        val mic = result[Manifest.permission.RECORD_AUDIO]
            ?: (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)
        if (mic) begin() else micDenied = true
    }

    val onStart = {
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
        if (needed.isEmpty()) begin() else permissions.launch(needed.toTypedArray())
    }

    val noticeText = state.notice?.let { n ->
        when (n) {
            is CallNotice.PartnerLeft -> stringResource(if (n.dropped) R.string.partner_dropped else R.string.partner_left, n.name)
            CallNotice.Banned -> stringResource(R.string.banned)
            is CallNotice.Refused -> n.reason
        }
    }
    LaunchedEffect(state.notice) {
        if (noticeText != null) {
            snackbar.showSnackbar(noticeText)
            vm.dismissNotice()
        }
    }

    val inCall = state.phase !is CallPhase.Idle

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            AnimatedVisibility(
                visible = !inCall,
                enter = slideInVertically { it } + fadeIn(),
                exit = slideOutVertically { it } + fadeOut(),
            ) { TabBar(selected = tab, onSelect = { tab = it }) }
        },
    ) { pad ->
        Box(Modifier.fillMaxSize().padding(bottom = if (inCall) 0.dp else pad.calculateBottomPadding())) {
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
                    )
                    MainTab.Chats -> EmptyTab(MainTab.Chats, onStart = { tab = MainTab.Talk })
                    MainTab.Friends -> EmptyTab(MainTab.Friends, onStart = { tab = MainTab.Talk })
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
            Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
                CallScreen(
                    state = state,
                    connected = connected,
                    myAnimal = animal,
                    remoteLevel = { level },
                    onNext = vm::next,
                    onEnd = vm::end,
                    onMute = vm::toggleMute,
                    onSpeaker = vm::toggleSpeaker,
                    onReport = vm::report,
                )
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
}

