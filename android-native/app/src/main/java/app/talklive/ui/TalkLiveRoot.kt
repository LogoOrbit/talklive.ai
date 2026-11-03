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
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.talklive.R
import app.talklive.call.CallNotice
import app.talklive.call.CallPhase
import app.talklive.call.CallService
import app.talklive.ui.onboarding.AuthRoute
import app.talklive.ui.onboarding.AuthViewModel
import app.talklive.ui.onboarding.OnboardingFlow

@Composable
fun TalkLiveRoot(vm: TalkViewModel = hiltViewModel()) {
    val onboarded by vm.onboarded.collectAsStateWithLifecycle()
    val account by vm.account.collectAsStateWithLifecycle()
    var signingIn by remember { mutableStateOf(false) }
    LaunchedEffect(account) { if (account != null) signingIn = false }

    AnimatedContent(
        targetState = when {
            !onboarded -> 0
            signingIn -> 1
            else -> 2
        },
        transitionSpec = { fadeIn() togetherWith fadeOut() },
        label = "root",
    ) { screen ->
        when (screen) {
            0 -> OnboardingFlow(hiltViewModel<AuthViewModel>())
            1 -> OnboardingFlow(hiltViewModel<AuthViewModel>(), start = AuthRoute.Choose, onClose = { signingIn = false })
            else -> MainScreen(vm, accountName = account?.nickname, onSignIn = { signingIn = true })
        }
    }
}

@Composable
private fun MainScreen(vm: TalkViewModel, accountName: String?, onSignIn: () -> Unit) {
    val context = LocalContext.current
    val state by vm.state.collectAsStateWithLifecycle()
    val connected by vm.connected.collectAsStateWithLifecycle()
    val online by vm.onlineCount.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    var micDenied by remember { mutableStateOf(false) }

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

    val leftMsg = state.notice?.let { n ->
        when (n) {
            is CallNotice.PartnerLeft -> stringResource(if (n.dropped) R.string.partner_dropped else R.string.partner_left, n.name)
            CallNotice.Banned -> stringResource(R.string.banned)
            is CallNotice.Refused -> n.reason
        }
    }
    LaunchedEffect(state.notice) {
        if (leftMsg != null) {
            snackbar.showSnackbar(leftMsg)
            vm.dismissNotice()
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snackbar) },
    ) { pad ->
        Box(Modifier.fillMaxSize().padding(pad)) {
            AnimatedContent(
                targetState = state.phase is CallPhase.Idle,
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                label = "screen",
            ) { idle ->
                if (idle) {
                    HomeScreen(
                        connected = connected,
                        online = online,
                        accountName = accountName,
                        onStart = onStart,
                        onSignIn = onSignIn,
                        onSignOut = vm::signOut,
                    )
                } else {
                    CallScreen(
                        state = state,
                        onNext = vm::next,
                        onEnd = vm::end,
                        onMute = vm::toggleMute,
                        onSpeaker = vm::toggleSpeaker,
                        onReport = vm::report,
                    )
                }
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
