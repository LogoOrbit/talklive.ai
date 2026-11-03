package app.talklive.ui.onboarding

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Mail
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material.icons.rounded.Public
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.ui.components.ErrorBanner
import app.talklive.ui.components.OtpField
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.components.ScreenTitle
import app.talklive.ui.components.SecondaryButton
import app.talklive.ui.components.TalkTextField
import app.talklive.ui.theme.BrandTeal
import app.talklive.ui.theme.BrandViolet
import kotlinx.coroutines.launch
import kotlin.math.absoluteValue

enum class AuthRoute { Welcome, Choose, Signup, Login, Reset }

/** Welcome slides, then sign-in choices, then email sign-up or log-in. */
@Composable
fun OnboardingFlow(vm: AuthViewModel, start: AuthRoute = AuthRoute.Welcome, onClose: (() -> Unit)? = null) {
    var route by androidx.compose.runtime.saveable.rememberSaveable { androidx.compose.runtime.mutableStateOf(start) }

    fun go(r: AuthRoute) { vm.clearError(); route = r }

    BackHandler(enabled = route != start || onClose != null) {
        when (route) {
            AuthRoute.Signup -> if (!vm.back()) go(AuthRoute.Choose)
            AuthRoute.Login -> go(AuthRoute.Choose)
            AuthRoute.Reset -> if (!vm.resetBack()) go(AuthRoute.Login)
            AuthRoute.Choose -> if (start == AuthRoute.Choose) onClose?.invoke() else go(AuthRoute.Welcome)
            AuthRoute.Welcome -> onClose?.invoke()
        }
    }

    AnimatedContent(
        targetState = route,
        transitionSpec = {
            val forward = targetState.ordinal > initialState.ordinal
            (slideInHorizontally(tween(320)) { if (forward) it / 3 else -it / 3 } + fadeIn(tween(320))) togetherWith
                (slideOutHorizontally(tween(320)) { if (forward) -it / 3 else it / 3 } + fadeOut(tween(200)))
        },
        label = "auth",
    ) { r ->
        when (r) {
            AuthRoute.Welcome -> WelcomeScreen(onDone = { go(AuthRoute.Choose) })
            AuthRoute.Choose -> ChooseScreen(
                vm = vm,
                onSignup = { go(AuthRoute.Signup) },
                onLogin = { go(AuthRoute.Login) },
                onClose = onClose,
            )
            AuthRoute.Signup -> SignupScreen(vm, onExit = { go(AuthRoute.Choose) })
            AuthRoute.Login -> LoginScreen(
                vm,
                onBack = { go(AuthRoute.Choose) },
                onSignup = { go(AuthRoute.Signup) },
                onForgot = { vm.startReset(); go(AuthRoute.Reset) },
            )
            AuthRoute.Reset -> ResetScreen(vm, onExit = { go(AuthRoute.Login) })
        }
    }
}

private data class Slide(val icon: ImageVector, val title: Int, val body: Int)

@Composable
internal fun WelcomeScreen(onDone: () -> Unit) {
    val slides = remember {
        listOf(
            Slide(Icons.Rounded.Mic, R.string.welcome_1_title, R.string.welcome_1_body),
            Slide(Icons.Rounded.Public, R.string.welcome_2_title, R.string.welcome_2_body),
            Slide(Icons.Rounded.Shield, R.string.welcome_3_title, R.string.welcome_3_body),
        )
    }
    val pager = rememberPagerState { slides.size }
    val scope = rememberCoroutineScope()
    val last = pager.currentPage == slides.lastIndex

    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(24.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Image(painterResource(R.drawable.logo), null, Modifier.size(36.dp))
            TextButton(onClick = onDone) { Text(stringResource(R.string.skip)) }
        }
        HorizontalPager(pager, Modifier.weight(1f)) { page ->
            val offset = (pager.currentPage - page + pager.currentPageOffsetFraction).absoluteValue
            val s = slides[page]
            Column(
                Modifier.fillMaxSize().graphicsLayer {
                    alpha = 1f - offset.coerceIn(0f, 1f) * 0.6f
                    val scale = 1f - offset.coerceIn(0f, 1f) * 0.1f
                    scaleX = scale; scaleY = scale
                },
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Box(
                    Modifier.size(200.dp).clip(CircleShape)
                        .background(Brush.linearGradient(listOf(BrandViolet.copy(alpha = 0.14f), BrandTeal.copy(alpha = 0.14f)))),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(
                        Modifier.size(120.dp).clip(CircleShape).background(Brush.linearGradient(listOf(BrandViolet, BrandTeal))),
                        contentAlignment = Alignment.Center,
                    ) { Icon(s.icon, null, tint = Color.White, modifier = Modifier.size(56.dp)) }
                }
                Spacer(Modifier.height(40.dp))
                Text(
                    stringResource(s.title), style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onBackground, textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    stringResource(s.body), style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 12.dp),
                )
            }
        }
        Row(Modifier.fillMaxWidth().padding(vertical = 24.dp), horizontalArrangement = Arrangement.Center) {
            repeat(slides.size) { i ->
                val w by animateDpAsState(if (i == pager.currentPage) 24.dp else 8.dp, spring(stiffness = 600f), label = "dot")
                Box(
                    Modifier.padding(horizontal = 4.dp).height(8.dp).width(w).clip(CircleShape)
                        .background(if (i == pager.currentPage) BrandViolet else MaterialTheme.colorScheme.outline),
                )
            }
        }
        PrimaryButton(
            text = stringResource(if (last) R.string.get_started else R.string.continue_),
            onClick = { if (last) onDone() else scope.launch { pager.animateScrollToPage(pager.currentPage + 1) } },
        )
    }
}

@Composable
internal fun ChooseScreen(vm: AuthViewModel, onSignup: () -> Unit, onLogin: () -> Unit, onClose: (() -> Unit)?) {
    val context = LocalContext.current
    Column(
        Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (onClose != null) {
            Row(Modifier.fillMaxWidth()) {
                IconButton(onClick = onClose) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, null) }
            }
        }
        Spacer(Modifier.weight(1f))
        Image(painterResource(R.drawable.logo), null, Modifier.size(96.dp))
        Spacer(Modifier.height(24.dp))
        Text(stringResource(R.string.choose_title), style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground)
        Spacer(Modifier.height(8.dp))
        Text(
            stringResource(R.string.choose_body), style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center,
        )
        Spacer(Modifier.weight(1f))
        SecondaryButton(
            text = stringResource(R.string.continue_google),
            onClick = { vm.google(context) },
            loading = vm.googleBusy,
            leading = { Image(painterResource(R.drawable.ic_google), null, Modifier.size(20.dp)) },
        )
        Spacer(Modifier.height(12.dp))
        PrimaryButton(text = stringResource(R.string.signup_email), onClick = onSignup, icon = Icons.Rounded.Mail)
        ErrorBanner(vm.error)
        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.have_account), color = MaterialTheme.colorScheme.onSurfaceVariant)
            TextButton(onClick = onLogin) { Text(stringResource(R.string.log_in)) }
        }
        if (onClose == null) {
            TextButton(onClick = vm::continueAsGuest) {
                Text(stringResource(R.string.continue_guest), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(
            stringResource(R.string.terms_note), style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun FormScaffold(
    onBack: () -> Unit,
    progress: Float? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().imePadding()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, null) }
            if (progress != null) {
                val p by animateFloatAsState(progress, spring(stiffness = 300f), label = "progress")
                LinearProgressIndicator(
                    progress = { p },
                    modifier = Modifier.weight(1f).padding(end = 24.dp).height(6.dp).clip(CircleShape),
                    color = BrandViolet,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant,
                    drawStopIndicator = {},
                )
            }
        }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 24.dp, vertical = 16.dp)) {
            content()
        }
    }
}

@Composable
internal fun SignupScreen(vm: AuthViewModel, onExit: () -> Unit) {
    FormScaffold(
        onBack = { if (!vm.back()) onExit() },
        progress = (vm.step.ordinal + 1) / 3f,
    ) {
        AnimatedContent(
            targetState = vm.step,
            transitionSpec = {
                val forward = targetState.ordinal > initialState.ordinal
                (slideInHorizontally(tween(300)) { if (forward) it else -it } + fadeIn()) togetherWith
                    (slideOutHorizontally(tween(300)) { if (forward) -it else it } + fadeOut())
            },
            label = "step",
        ) { step ->
            Column {
                when (step) {
                    SignupStep.Email -> EmailStep(vm)
                    SignupStep.Account -> AccountStep(vm)
                    SignupStep.Code -> CodeStep(vm)
                }
            }
        }
    }
}

@Composable
private fun EmailStep(vm: AuthViewModel) {
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) { focus.requestFocus() }
    ScreenTitle(stringResource(R.string.signup_email_title), stringResource(R.string.signup_email_body))
    Spacer(Modifier.height(28.dp))
    TalkTextField(
        value = vm.email, onValueChange = { vm.email = it }, label = stringResource(R.string.email),
        keyboardType = KeyboardType.Email, imeAction = ImeAction.Next, onIme = vm::next, focusRequester = focus,
    )
    ErrorBanner(vm.error)
    Spacer(Modifier.height(24.dp))
    PrimaryButton(stringResource(R.string.continue_), onClick = vm::next, enabled = vm.emailValid)
}

@Composable
private fun AccountStep(vm: AuthViewModel) {
    val focus = remember { FocusRequester() }
    val passFocus = remember { FocusRequester() }
    LaunchedEffect(Unit) { focus.requestFocus() }
    ScreenTitle(stringResource(R.string.signup_account_title), stringResource(R.string.signup_account_body))
    Spacer(Modifier.height(28.dp))
    TalkTextField(
        value = vm.username, onValueChange = { vm.username = it.take(24) }, label = stringResource(R.string.username),
        supporting = stringResource(R.string.username_hint), focusRequester = focus, onIme = { passFocus.requestFocus() },
    )
    Spacer(Modifier.height(8.dp))
    TalkTextField(
        value = vm.password, onValueChange = { vm.password = it }, label = stringResource(R.string.password),
        password = true, imeAction = ImeAction.Done, onIme = vm::next,
        supporting = stringResource(R.string.password_hint), focusRequester = passFocus,
    )
    ErrorBanner(vm.error)
    Spacer(Modifier.height(24.dp))
    PrimaryButton(
        stringResource(R.string.send_code), onClick = vm::next,
        enabled = vm.usernameValid && vm.passwordValid, loading = vm.busy,
    )
}

@Composable
private fun ColumnScope.CodeStep(vm: AuthViewModel) {
    ScreenTitle(stringResource(R.string.signup_code_title), stringResource(R.string.signup_code_body, vm.email.trim()))
    Spacer(Modifier.height(28.dp))
    OtpField(value = vm.code, onValueChange = { vm.code = it; vm.clearError() }, onComplete = vm::verify, error = vm.error != null)
    ErrorBanner(vm.error)
    Spacer(Modifier.height(24.dp))
    PrimaryButton(stringResource(R.string.create_account), onClick = vm::next, enabled = vm.code.length == 6, loading = vm.busy)
    Spacer(Modifier.height(8.dp))
    TextButton(onClick = vm::sendCode, enabled = vm.resendIn == 0 && !vm.busy, modifier = Modifier.align(Alignment.CenterHorizontally)) {
        Text(if (vm.resendIn > 0) stringResource(R.string.resend_in, vm.resendIn) else stringResource(R.string.resend))
    }
}

@Composable
internal fun LoginScreen(vm: AuthViewModel, onBack: () -> Unit, onSignup: () -> Unit, onForgot: () -> Unit = {}) {
    val context = LocalContext.current
    val focus = remember { FocusRequester() }
    val passFocus = remember { FocusRequester() }
    LaunchedEffect(Unit) { focus.requestFocus() }
    FormScaffold(onBack = onBack) {
        ScreenTitle(stringResource(R.string.login_title), stringResource(R.string.login_body))
        Spacer(Modifier.height(28.dp))
        TalkTextField(
            value = vm.loginUser, onValueChange = { vm.loginUser = it }, label = stringResource(R.string.username_or_email),
            keyboardType = KeyboardType.Email, focusRequester = focus, onIme = { passFocus.requestFocus() },
        )
        Spacer(Modifier.height(12.dp))
        TalkTextField(
            value = vm.loginPassword, onValueChange = { vm.loginPassword = it }, label = stringResource(R.string.password),
            password = true, imeAction = ImeAction.Done, onIme = vm::login, focusRequester = passFocus,
        )
        TextButton(onClick = onForgot, modifier = Modifier.align(Alignment.End)) { Text(stringResource(R.string.forgot_password)) }
        ErrorBanner(vm.error)
        Spacer(Modifier.height(24.dp))
        PrimaryButton(
            stringResource(R.string.log_in), onClick = vm::login,
            enabled = vm.loginUser.isNotBlank() && vm.loginPassword.isNotEmpty(), loading = vm.busy,
        )
        Spacer(Modifier.height(16.dp))
        Text(
            stringResource(R.string.or), style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.align(Alignment.CenterHorizontally),
        )
        Spacer(Modifier.height(16.dp))
        SecondaryButton(
            text = stringResource(R.string.continue_google), onClick = { vm.google(context) }, loading = vm.googleBusy,
            leading = { Image(painterResource(R.drawable.ic_google), null, Modifier.size(20.dp)) },
        )
        Spacer(Modifier.height(12.dp))
        TextButton(onClick = onSignup, modifier = Modifier.align(Alignment.CenterHorizontally)) {
            Text(stringResource(R.string.no_account))
        }
    }
}

@Composable
internal fun ResetScreen(vm: AuthViewModel, onExit: () -> Unit) {
    FormScaffold(onBack = { if (!vm.resetBack()) onExit() }, progress = (vm.resetStep.ordinal + 1) / 3f) {
        AnimatedContent(
            targetState = vm.resetStep,
            transitionSpec = {
                val forward = targetState.ordinal > initialState.ordinal
                (slideInHorizontally(tween(300)) { if (forward) it else -it } + fadeIn()) togetherWith
                    (slideOutHorizontally(tween(300)) { if (forward) -it else it } + fadeOut())
            },
            label = "reset",
        ) { step ->
            Column {
                when (step) {
                    ResetStep.Email -> {
                        val focus = remember { FocusRequester() }
                        LaunchedEffect(Unit) { focus.requestFocus() }
                        ScreenTitle(stringResource(R.string.reset_title), stringResource(R.string.reset_body))
                        Spacer(Modifier.height(28.dp))
                        TalkTextField(
                            vm.resetEmail, { vm.resetEmail = it }, stringResource(R.string.email),
                            keyboardType = KeyboardType.Email, imeAction = ImeAction.Done, onIme = vm::sendResetCode, focusRequester = focus,
                        )
                        ErrorBanner(vm.error)
                        Spacer(Modifier.height(24.dp))
                        PrimaryButton(stringResource(R.string.send_code), onClick = vm::sendResetCode, enabled = vm.resetEmail.contains('@'), loading = vm.busy)
                    }
                    ResetStep.Code -> {
                        ScreenTitle(stringResource(R.string.reset_code_title), stringResource(R.string.signup_code_body, vm.resetEmail.trim()))
                        Spacer(Modifier.height(28.dp))
                        OtpField(vm.resetCode, { vm.resetCode = it; vm.clearError() }, onComplete = vm::verifyReset, error = vm.error != null)
                        ErrorBanner(vm.error)
                        Spacer(Modifier.height(24.dp))
                        PrimaryButton(stringResource(R.string.continue_), onClick = { vm.verifyReset(vm.resetCode) }, enabled = vm.resetCode.length == 6, loading = vm.busy)
                        TextButton(
                            onClick = vm::sendResetCode, enabled = vm.resendIn == 0 && !vm.busy,
                            modifier = Modifier.align(Alignment.CenterHorizontally),
                        ) { Text(if (vm.resendIn > 0) stringResource(R.string.resend_in, vm.resendIn) else stringResource(R.string.resend)) }
                    }
                    ResetStep.Password -> {
                        val focus = remember { FocusRequester() }
                        LaunchedEffect(Unit) { focus.requestFocus() }
                        ScreenTitle(stringResource(R.string.reset_new_title), stringResource(R.string.reset_new_body))
                        Spacer(Modifier.height(28.dp))
                        TalkTextField(
                            vm.resetPassword, { vm.resetPassword = it }, stringResource(R.string.new_password),
                            password = true, imeAction = ImeAction.Done, onIme = vm::finishReset, focusRequester = focus,
                            supporting = stringResource(R.string.password_hint),
                        )
                        ErrorBanner(vm.error)
                        Spacer(Modifier.height(24.dp))
                        PrimaryButton(stringResource(R.string.set_password), onClick = vm::finishReset, enabled = vm.resetPassword.length >= 8, loading = vm.busy)
                    }
                }
            }
        }
    }
}
