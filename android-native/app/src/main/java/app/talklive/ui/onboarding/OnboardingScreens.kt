package app.talklive.ui.onboarding

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.shadow
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.offset
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.luminance
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

enum class AuthRoute { Welcome, Choose, Age, Methods, Signup, Login, Reset, Blocked }

/** Welcome slides, then sign-in choices, then email sign-up or log-in. */
@Composable
fun OnboardingFlow(vm: AuthViewModel, start: AuthRoute = AuthRoute.Choose, onClose: (() -> Unit)? = null) {
    val ctx = LocalContext.current
    val introPrefs = remember { ctx.getSharedPreferences("ui", android.content.Context.MODE_PRIVATE) }
    val inApp = onClose != null
    // Under 18 on this phone: nothing else is reachable. Otherwise the intro
    // swipes once on a fresh install; signing in from inside the app goes
    // straight to the ways in.
    val first = when {
        app.talklive.data.AgeGate.blocked(ctx) -> AuthRoute.Blocked
        inApp -> AuthRoute.Methods
        start == AuthRoute.Choose && !introPrefs.getBoolean("intro_seen", false) -> AuthRoute.Welcome
        else -> start
    }
    var route by androidx.compose.runtime.saveable.rememberSaveable { androidx.compose.runtime.mutableStateOf(first) }
    // Where to go once the date of birth (and the rules) are done.
    var afterAge by androidx.compose.runtime.saveable.rememberSaveable { androidx.compose.runtime.mutableStateOf(AuthRoute.Methods) }
    var showTerms by remember { mutableStateOf(false) }

    fun go(r: AuthRoute) { vm.clearError(); route = r }
    var guestAfterGate by remember { mutableStateOf(false) }
    // All checks done: carry on to where the person was going.
    fun passGate(target: AuthRoute) {
        if (guestAfterGate) { guestAfterGate = false; vm.continueAsGuest() } else go(target)
    }
    // Date of birth (once per phone), then the rules (once), then on. Only for
    // making an account or using the app as a guest: signing in to an existing
    // account never asks.
    fun gated(target: AuthRoute) {
        afterAge = target
        when {
            app.talklive.data.AgeGate.dob(ctx) == null -> go(AuthRoute.Age)
            !ctx.getSharedPreferences("consent", android.content.Context.MODE_PRIVATE).getBoolean("read_terms", false) -> showTerms = true
            else -> passGate(target)
        }
    }
    // A guest uses the app straight away, so the age check and rules come first.
    fun gatedGuest() {
        if (app.talklive.data.AgeGate.dob(ctx) != null &&
            ctx.getSharedPreferences("consent", android.content.Context.MODE_PRIVATE).getBoolean("read_terms", false)) vm.continueAsGuest()
        else { guestAfterGate = true; gated(AuthRoute.Methods) }
    }
    // Google answered "new account": ask the date of birth, then finish it.
    LaunchedEffect(vm.needDob) { if (vm.needDob) go(AuthRoute.Age) }
    LaunchedEffect(vm.underage) { if (vm.underage) { app.talklive.data.AgeGate.block(ctx); go(AuthRoute.Blocked) } }
    if (showTerms) {
        TermsReader(
            onDismiss = { showTerms = false },
            onAgree = {
                ctx.getSharedPreferences("consent", android.content.Context.MODE_PRIVATE).edit().putBoolean("read_terms", true).putBoolean("adult_terms", true).apply()
                showTerms = false
                passGate(afterAge)
            },
        )
    }

    BackHandler(enabled = route != AuthRoute.Blocked && ((route != first && route != AuthRoute.Welcome) || inApp)) {
        when (route) {
            AuthRoute.Signup -> if (!vm.back()) go(AuthRoute.Methods)
            AuthRoute.Login -> go(if (inApp) AuthRoute.Methods else AuthRoute.Choose)
            AuthRoute.Reset -> if (!vm.resetBack()) go(AuthRoute.Login)
            AuthRoute.Age -> go(AuthRoute.Choose)
            AuthRoute.Methods -> if (inApp) onClose?.invoke() else go(AuthRoute.Choose)
            AuthRoute.Choose -> if (inApp) onClose?.invoke() else go(AuthRoute.Welcome)
            AuthRoute.Welcome -> onClose?.invoke()
            AuthRoute.Blocked -> Unit
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
            AuthRoute.Welcome -> WelcomeScreen(
                // Straight to the ways in: the old "Get started" screen between was one more tap for nothing.
                onDone = { introPrefs.edit().putBoolean("intro_seen", true).apply(); go(AuthRoute.Methods) },
                // "Get Plus" on the intro: carry on, and open Plus on arriving home.
                onPlus = { introPrefs.edit().putBoolean("intro_seen", true).putBoolean("plus_after_intro", true).apply(); go(AuthRoute.Methods) },
            )
            AuthRoute.Choose -> StartScreen(onStart = { go(AuthRoute.Methods) }, onLogin = { go(AuthRoute.Login) })
            AuthRoute.Age -> AgeScreen(onBack = { vm.cancelGoogle(); guestAfterGate = false; go(AuthRoute.Methods) }) { adult ->
                when {
                    !adult -> go(AuthRoute.Blocked)
                    vm.hasPendingGoogle -> { go(AuthRoute.Methods); vm.retryGoogle() }
                    else -> gated(afterAge)
                }
            }
            AuthRoute.Methods -> MethodsScreen(
                vm, onBack = if (inApp) onClose else ({ go(AuthRoute.Choose) }),
                onEmail = { gated(AuthRoute.Signup) }, onLogin = { go(AuthRoute.Login) }, allowGuest = !inApp,
                onGuest = { gatedGuest() },
            )
            AuthRoute.Blocked -> BlockedScreen()
            AuthRoute.Signup -> SignupScreen(vm, onExit = { go(AuthRoute.Methods) }, onLogin = { go(AuthRoute.Login) })
            AuthRoute.Login -> LoginScreen(
                vm,
                onBack = { go(if (inApp) AuthRoute.Methods else AuthRoute.Choose) },
                onSignup = { go(AuthRoute.Signup) },
                onForgot = { vm.startReset(); go(AuthRoute.Reset) },
            )
            AuthRoute.Reset -> ResetScreen(vm, onExit = { go(AuthRoute.Login) })
        }
    }
}

private data class Slide(val icon: ImageVector, val title: Int, val body: Int, val faces: List<String>)

@Composable
internal fun WelcomeScreen(onDone: () -> Unit, onPlus: () -> Unit = onDone) {
    val slides = remember {
        val all = app.talklive.ui.animals.Animals.map { it.id }.shuffled()
        listOf(
            // Page 0 is the welcome page (WelcomeHero); its slide is a placeholder.
            Slide(Icons.Rounded.Mic, R.string.welcome_hero_title, R.string.welcome_hero_body, all.take(2)),
            // Last page: TalkLive Plus (PlusIntroPage); its slide is a placeholder.
            Slide(Icons.Rounded.Public, R.string.intro_plus_title, R.string.intro_plus_title, emptyList()),
        )
    }
    val pager = rememberPagerState { slides.size }
    val scope = rememberCoroutineScope()
    val last = pager.currentPage == slides.lastIndex

    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(24.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(36.dp)) { if (pager.currentPage > 0) Image(painterResource(R.drawable.logo), null, Modifier.size(36.dp)) }
            if (!last) TextButton(onClick = onDone) { Text(stringResource(R.string.skip)) }
        }
        HorizontalPager(pager, Modifier.weight(1f)) { page ->
            val offset = (pager.currentPage - page + pager.currentPageOffsetFraction).absoluteValue
            val s = slides[page]
            if (page == 0) { WelcomeHero(s.faces, Modifier.graphicsLayer { alpha = 1f - offset.coerceIn(0f, 1f) * 0.6f }); return@HorizontalPager }
            if (page == slides.lastIndex) { PlusIntroPage(Modifier.graphicsLayer { alpha = 1f - offset.coerceIn(0f, 1f) * 0.6f }); return@HorizontalPager }
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
        if (last) {
            app.talklive.ui.engage.GoldButton(stringResource(R.string.intro_plus_cta), busy = false, onClick = onPlus)
            TextButton(onClick = onDone, modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) { Text(stringResource(R.string.not_now)) }
        } else PrimaryButton(
            text = stringResource(R.string.continue_),
            onClick = { scope.launch { pager.animateScrollToPage(pager.currentPage + 1) } },
        )
    }
}

/**
 * The intro's last page: what Plus adds, side by side with free, and the price
 * in the person's own money. Shown once, on the first launch.
 */
@Composable
private fun PlusIntroPage(modifier: Modifier = Modifier) {
    val ctx = LocalContext.current
    val gold = Brush.linearGradient(listOf(Color(0xFFFFE08A), Color(0xFFF2C14E), Color(0xFFD97706)))
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Box(
            Modifier.size(84.dp).clip(RoundedCornerShape(26.dp)).background(gold),
            contentAlignment = Alignment.Center,
        ) { Text("+", style = MaterialTheme.typography.displaySmall, color = Color(0xFF2B1D00), fontWeight = androidx.compose.ui.text.font.FontWeight.Black) }
        Spacer(Modifier.height(20.dp))
        Text(stringResource(R.string.intro_plus_title), style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground, textAlign = TextAlign.Center)
        Spacer(Modifier.height(20.dp))
        // Free vs Plus, one row per perk.
        val rows = listOf(
            Triple(R.string.intro_plus_row_priority, null, null),
            Triple(R.string.intro_plus_row_countries, "2", stringResource(R.string.intro_plus_all)),
            Triple(R.string.intro_plus_row_gender, null, null),
            Triple(R.string.intro_plus_row_undo, null, null),
            Triple(R.string.intro_plus_row_gold, null, null),
        )
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(MaterialTheme.colorScheme.surface)) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                Spacer(Modifier.weight(1f))
                Text(stringResource(R.string.intro_plus_free), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(56.dp), textAlign = TextAlign.Center)
                Text("Plus", style = MaterialTheme.typography.labelLarge, color = app.talklive.ui.theme.GoldText, modifier = Modifier.width(56.dp), textAlign = TextAlign.Center)
            }
            rows.forEach { (label, free, plus) ->
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(label), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                    Box(Modifier.width(56.dp), contentAlignment = Alignment.Center) {
                        if (free != null) Text(free, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        else Icon(Icons.Rounded.Close, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                    }
                    Box(Modifier.width(56.dp), contentAlignment = Alignment.Center) {
                        if (plus != null) Text(plus, style = MaterialTheme.typography.titleMedium, color = app.talklive.ui.theme.GoldText)
                        else Box(Modifier.size(24.dp).clip(CircleShape).background(gold), contentAlignment = Alignment.Center) {
                            Icon(Icons.Rounded.Check, null, tint = Color(0xFF2B1D00), modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(14.dp))
        Text(
            stringResource(R.string.intro_plus_price, app.talklive.billing.LocalPrice.of(ctx, 10.0), app.talklive.billing.LocalPrice.of(ctx, 2.0)),
            style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center,
        )
    }
}

/**
 * The first page: a calm globe with a line of light joining two people across
 * it, the app's mark above, then a short welcome. Clean and quiet on purpose.
 */
@Composable
private fun WelcomeHero(faces: List<String>, modifier: Modifier = Modifier) {
    val still = app.talklive.ui.theme.LocalReduceMotion.current
    val t = androidx.compose.animation.core.rememberInfiniteTransition(label = "hero")
    val travel by t.animateFloat(
        0f, 1f,
        androidx.compose.animation.core.infiniteRepeatable(tween(2600, easing = androidx.compose.animation.core.FastOutSlowInEasing)),
        label = "travel",
    )
    val glow by t.animateFloat(
        0.55f, 1f,
        androidx.compose.animation.core.infiniteRepeatable(tween(1600), androidx.compose.animation.core.RepeatMode.Reverse),
        label = "glow",
    )
    val stars = remember { List(22) { androidx.compose.ui.geometry.Offset(Math.random().toFloat(), Math.random().toFloat() * 0.55f) to (0.3f + Math.random().toFloat() * 0.7f) } }
    val dark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    Column(modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
        androidx.compose.foundation.layout.BoxWithConstraints(Modifier.fillMaxWidth().weight(1f)) {
            val w = constraints.maxWidth.toFloat()
            val h = constraints.maxHeight.toFloat()
            // Globe geometry, shared by the drawing and the avatars on it.
            val r = w * 0.46f
            val cx = w / 2f
            val cy = h * 0.50f + r
            val a = androidx.compose.ui.geometry.Offset(cx - r * 0.62f, cy - r * 0.66f)
            val b = androidx.compose.ui.geometry.Offset(cx + r * 0.58f, cy - r * 0.74f)
            val ctrl = androidx.compose.ui.geometry.Offset(cx, cy - r * 1.32f)
            fun bez(f: Float) = androidx.compose.ui.geometry.Offset(
                (1 - f) * (1 - f) * a.x + 2 * (1 - f) * f * ctrl.x + f * f * b.x,
                (1 - f) * (1 - f) * a.y + 2 * (1 - f) * f * ctrl.y + f * f * b.y,
            )
            androidx.compose.foundation.Canvas(Modifier.fillMaxSize()) {
                // Soft light behind everything.
                drawCircle(Brush.radialGradient(listOf(BrandTeal.copy(alpha = if (dark) 0.26f else 0.16f), Color.Transparent), center = androidx.compose.ui.geometry.Offset(cx, h * 0.38f), radius = minOf(w, h) * 0.5f), radius = minOf(w, h) * 0.5f, center = androidx.compose.ui.geometry.Offset(cx, h * 0.38f))
                stars.forEach { (p, k) -> drawCircle(Color.White.copy(alpha = (if (dark) 0.5f else 0.25f) * k), radius = 1.6.dp.toPx() * k, center = androidx.compose.ui.geometry.Offset(p.x * w, p.y * h)) }
                // The globe, lit from above, fading into the page below.
                drawCircle(
                    Brush.verticalGradient(
                        listOf(Color.White.copy(alpha = if (dark) 0.20f else 0.65f), Color.White.copy(alpha = if (dark) 0.06f else 0.25f), Color.Transparent),
                        startY = cy - r, endY = cy + r * 0.2f,
                    ),
                    radius = r, center = androidx.compose.ui.geometry.Offset(cx, cy),
                )
                for (i in 1..3) drawOval(
                    Color.White.copy(alpha = if (dark) 0.06f else 0.18f),
                    topLeft = androidx.compose.ui.geometry.Offset(cx - r, cy - r * 0.92f + i * r * 0.22f),
                    size = androidx.compose.ui.geometry.Size(r * 2, r * 0.5f),
                    style = Stroke(1.dp.toPx()),
                )
                // The line of light between the two people.
                val path = androidx.compose.ui.graphics.Path().apply { moveTo(a.x, a.y); quadraticTo(ctrl.x, ctrl.y, b.x, b.y) }
                drawPath(path, Brush.linearGradient(listOf(BrandTeal, BrandTeal), start = a, end = b), style = Stroke(4.dp.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round))
                drawPath(path, Brush.linearGradient(listOf(BrandTeal.copy(alpha = 0.35f * glow), BrandTeal.copy(alpha = 0.35f * glow)), start = a, end = b), style = Stroke(12.dp.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round))
                if (!still) {
                    val p = bez(travel)
                    drawCircle(Color.White.copy(alpha = 0.9f), radius = 4.dp.toPx(), center = p)
                    drawCircle(BrandTeal.copy(alpha = 0.35f), radius = 11.dp.toPx(), center = p)
                }
                drawCircle(BrandTeal.copy(alpha = 0.22f * glow), radius = 40.dp.toPx(), center = b)
            }
            // The two people at either end.
            val density = androidx.compose.ui.platform.LocalDensity.current
            listOf(a to faces.getOrNull(0), b to faces.getOrNull(1)).forEach { (pt, id) ->
                with(density) {
                    app.talklive.ui.animals.AnimalAvatar(
                        id, null, 52.dp,
                        Modifier.offset(x = (pt.x).toDp() - 26.dp, y = (pt.y).toDp() - 26.dp)
                            .border(3.dp, Color.White, CircleShape),
                    )
                }
            }
            // The app's mark, on a white tile above the globe.
            with(density) {
                Box(
                    Modifier.offset(x = cx.toDp() - 40.dp, y = (cy - r * 1.01f).toDp() - 112.dp).size(80.dp)
                        .shadow(18.dp, RoundedCornerShape(22.dp)).clip(RoundedCornerShape(22.dp)).background(Color.White),
                    contentAlignment = Alignment.Center,
                ) { Image(painterResource(R.drawable.logo), null, Modifier.size(50.dp)) }
            }
        }
        Row(
            Modifier.clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surface).padding(horizontal = 14.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.Shield, null, tint = BrandTeal, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text(stringResource(R.string.welcome_hero_badge), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
        }
        Spacer(Modifier.height(20.dp))
        Text(
            stringResource(R.string.welcome_hero_title), style = MaterialTheme.typography.headlineLarge,
            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground, textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(10.dp))
        Text(
            stringResource(R.string.welcome_hero_body), style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 8.dp),
        )
        Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun AnimalAvatarAt(id: String, x: Float, y: Float) {
    app.talklive.ui.animals.AnimalAvatar(
        id, null, 46.dp,
        Modifier.graphicsLayer { translationX = x * density; translationY = y * density }
            .clip(CircleShape).background(MaterialTheme.colorScheme.surface).padding(3.dp),
    )
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
        Image(painterResource(R.drawable.logo), null, Modifier.size(72.dp))
        Spacer(Modifier.height(20.dp))
        Text(
            stringResource(if (onClose == null) R.string.tagline else R.string.choose_title),
            style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground, textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(24.dp))
        Spacer(Modifier.weight(1f))
        // 18+ and the rules, confirmed once on this device before anyone talks
        // to a stranger (adding an account later skips it: already agreed).
        val prefs = remember { context.getSharedPreferences("consent", android.content.Context.MODE_PRIVATE) }
        var agreed by remember { mutableStateOf(onClose != null || prefs.getBoolean("adult_terms", false)) }
        // The Terms and Privacy Policy are read in the app before any account
        // or guest profile is made; ticking the box opens them first.
        var read by remember { mutableStateOf(onClose != null || prefs.getBoolean("read_terms", false)) }
        var showTerms by remember { mutableStateOf(false) }
        var pending by remember { mutableStateOf<(() -> Unit)?>(null) }
        var nudge by remember { mutableStateOf(0) }
        fun gate(go: () -> Unit) {
            when {
                !read -> { pending = go; showTerms = true }
                agreed -> { prefs.edit().putBoolean("adult_terms", true).apply(); go() }
                else -> nudge++
            }
        }
        if (showTerms) {
            TermsReader(
                onDismiss = { showTerms = false; pending = null },
                onAgree = {
                    prefs.edit().putBoolean("read_terms", true).putBoolean("adult_terms", true).apply()
                    read = true; agreed = true; showTerms = false
                    pending?.invoke(); pending = null
                },
            )
        }
        if (onClose == null) {
            val shake = remember { androidx.compose.animation.core.Animatable(0f) }
            LaunchedEffect(nudge) {
                if (nudge == 0) return@LaunchedEffect
                for (x in listOf(12f, -10f, 8f, -6f, 3f, 0f)) shake.animateTo(x, androidx.compose.animation.core.tween(45))
            }
            val warn = nudge > 0 && !agreed
            Row(
                Modifier.fillMaxWidth().graphicsLayer { translationX = shake.value * density }
                    .clip(androidx.compose.foundation.shape.RoundedCornerShape(14.dp))
                    .background(if (warn) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surface)
                    .clickable { if (!read) showTerms = true else agreed = !agreed }
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                androidx.compose.runtime.CompositionLocalProvider(
                    androidx.compose.material3.LocalMinimumInteractiveComponentSize provides 0.dp,
                ) {
                    androidx.compose.material3.Checkbox(
                        checked = agreed,
                        onCheckedChange = { if (!read) showTerms = true else agreed = it },
                        modifier = Modifier.size(22.dp),
                    )
                }
                Spacer(Modifier.width(12.dp))
                Text(
                    stringResource(R.string.adult_consent),
                    style = MaterialTheme.typography.bodySmall,
                    color = if (warn) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
            }
            Spacer(Modifier.height(14.dp))
        }
        SecondaryButton(
            text = stringResource(R.string.continue_google),
            onClick = { gate { vm.google(context) } },
            loading = vm.googleBusy,
            leading = { Image(painterResource(R.drawable.ic_google), null, Modifier.size(20.dp)) },
        )
        Spacer(Modifier.height(12.dp))
        PrimaryButton(text = stringResource(R.string.signup_email), onClick = { gate(onSignup) }, icon = Icons.Rounded.Mail)
        ErrorBanner(vm.error)
        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.have_account), color = MaterialTheme.colorScheme.onSurfaceVariant)
            TextButton(onClick = { gate(onLogin) }) { Text(stringResource(R.string.log_in)) }
        }
        if (onClose == null) {
            TextButton(onClick = { gate(vm::continueAsGuest) }) {
                Text(stringResource(R.string.continue_guest), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Spacer(Modifier.height(4.dp))
        // The rules are one tap away before anyone talks to a stranger.
        @OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
        androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.Center) {
            listOf(R.string.terms to "terms", R.string.privacy_policy to "privacy", R.string.community_guidelines to "community-guidelines").forEach { (label, page) ->
                Text(
                    stringResource(label), style = MaterialTheme.typography.labelMedium, color = app.talklive.ui.theme.AccentText,
                    maxLines = 1, softWrap = false,
                    modifier = Modifier.clip(androidx.compose.foundation.shape.RoundedCornerShape(8.dp))
                        .clickable { runCatching { context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("${app.talklive.net.ServerConfig.url}/$page"))) } }
                        .padding(horizontal = 6.dp, vertical = 6.dp),
                )
            }
        }
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
internal fun SignupScreen(vm: AuthViewModel, onExit: () -> Unit, onLogin: () -> Unit = {}) {
    if (vm.step == SignupStep.Code) AuroraBackground {}
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
                // That email already has an account: it can only log in.
                if (vm.error?.contains("email is already", ignoreCase = true) == true) {
                    androidx.compose.material3.TextButton(onClick = onLogin, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                        Text(stringResource(R.string.log_in_instead))
                    }
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
    LaunchedEffect(Unit) { focus.requestFocus() }
    ScreenTitle(stringResource(R.string.signup_account_title), stringResource(R.string.signup_account_body))
    Spacer(Modifier.height(28.dp))
    // A name people will see and a password: the server makes the internal
    // username, and people find each other by Friend ID (made from the name).
    val passFocus = remember { FocusRequester() }
    TalkTextField(
        value = vm.nickname, onValueChange = { vm.nickname = it.take(20) }, label = stringResource(R.string.your_name),
        supporting = stringResource(R.string.your_name_hint), focusRequester = focus, onIme = { passFocus.requestFocus() },
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
        enabled = vm.nicknameValid && vm.passwordValid, loading = vm.busy,
    )
}

@Composable
private fun ColumnScope.CodeStep(vm: AuthViewModel) {
    Text(stringResource(R.string.code_title), style = MaterialTheme.typography.headlineMedium, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
    Spacer(Modifier.height(6.dp))
    Text(stringResource(R.string.code_sent_to, vm.email.trim()), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    Spacer(Modifier.height(28.dp))
    // Submits by itself on the sixth digit.
    OtpField(value = vm.code, onValueChange = { vm.code = it; vm.clearError() }, onComplete = vm::verify, error = vm.error != null, checking = vm.busy)
    Spacer(Modifier.height(12.dp))
    Box(Modifier.fillMaxWidth().height(24.dp), contentAlignment = Alignment.CenterStart) {
        androidx.compose.animation.AnimatedContent(
            targetState = when { vm.busy -> 1; vm.error != null -> 2; else -> 0 },
            transitionSpec = { fadeIn(tween(200)) togetherWith fadeOut(tween(150)) }, label = "otpState",
        ) { st ->
            when (st) {
                1 -> Text(stringResource(R.string.code_checking), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                2 -> Text(vm.error.orEmpty(), style = MaterialTheme.typography.bodySmall, color = app.talklive.ui.theme.DangerText)
                else -> PasteCode { vm.code = it; vm.verify(it) }
            }
        }
    }
    Spacer(Modifier.height(16.dp))
    TextButton(onClick = vm::sendCode, enabled = vm.resendIn == 0 && !vm.busy, modifier = Modifier.align(Alignment.CenterHorizontally)) {
        Text(if (vm.resendIn > 0) stringResource(R.string.resend_in, vm.resendIn) else stringResource(R.string.resend))
    }
}

/** A code copied from the email: offered as one tap. */
@Composable
private fun PasteCode(onPaste: (String) -> Unit) {
    val clipboard = androidx.compose.ui.platform.LocalClipboardManager.current
    var code by remember { mutableStateOf<String?>(null) }
    val owner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    androidx.compose.runtime.DisposableEffect(owner) {
        fun read() { code = clipboard.getText()?.text?.let { Regex("\\b(\\d{6})\\b").find(it)?.groupValues?.get(1) } }
        read()
        val obs = androidx.lifecycle.LifecycleEventObserver { _, e -> if (e == androidx.lifecycle.Lifecycle.Event.ON_RESUME) read() }
        owner.lifecycle.addObserver(obs)
        onDispose { owner.lifecycle.removeObserver(obs) }
    }
    code?.let { c ->
        Text(
            stringResource(R.string.code_paste, c), style = MaterialTheme.typography.labelLarge, color = app.talklive.ui.theme.AccentText,
            modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable { onPaste(c) }.padding(vertical = 2.dp),
        )
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
