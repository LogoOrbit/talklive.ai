package app.talklive.ui.onboarding

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Mail
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.graphicsLayer
import kotlinx.coroutines.launch
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.ui.components.ErrorBanner
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.components.SecondaryButton
import app.talklive.ui.components.WheelPicker
import app.talklive.ui.theme.BrandTeal
import app.talklive.ui.theme.BrandViolet
import java.text.DateFormatSymbols
import java.util.Calendar

/** Card radius, and the radius of anything inside it (outer minus padding): corners stay concentric. */
private val CardRadius = 28.dp
private val CardPad = 8.dp
private val InnerRadius = CardRadius - CardPad

/** Slow, soft colour drifting behind the start screens. */
@Composable
fun AuroraBackground(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val still = app.talklive.ui.theme.LocalReduceMotion.current
    var a = 0.3f
    var b = 0.6f
    if (!still) {
        val t = rememberInfiniteTransition(label = "aurora")
        a = t.animateFloat(0f, 1f, infiniteRepeatable(tween(18000, easing = LinearEasing), RepeatMode.Reverse), label = "a").value
        b = t.animateFloat(0f, 1f, infiniteRepeatable(tween(23000, easing = LinearEasing), RepeatMode.Reverse), label = "b").value
    }
    val bg = MaterialTheme.colorScheme.background
    val dark = bg.luminance() < 0.5f
    Box(modifier.fillMaxSize().background(bg)) {
        // No blur layer (a full-screen blur redrawn every frame is costly): the glows
        // fade to transparent on their own, so their edges stay soft.
        Canvas(Modifier.fillMaxSize()) {
            val w = size.width; val h = size.height
            val pa = if (still) 0.3f else a
            val pb = if (still) 0.6f else b
            fun glow(color: Color, radius: Float, center: Offset) =
                drawCircle(Brush.radialGradient(listOf(color, Color.Transparent), center = center, radius = radius), radius = radius, center = center)
            glow(Color(0xFF2A6FE8).copy(alpha = if (dark) 0.30f else 0.20f), w * 0.62f, Offset(w * (0.15f + 0.35f * pa), h * (0.18f + 0.12f * pb)))
            glow(BrandTeal.copy(alpha = if (dark) 0.26f else 0.18f), w * 0.55f, Offset(w * (0.9f - 0.3f * pb), h * (0.42f + 0.1f * pa)))
            glow(BrandTeal.copy(alpha = if (dark) 0.12f else 0.10f), w * 0.4f, Offset(w * (0.4f + 0.2f * pb), h * (0.62f - 0.08f * pa)))
        }
        content()
    }
}

/** A card whose shadow is a darker shade of the page, not grey. */
@Composable
fun StartCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val bg = MaterialTheme.colorScheme.background
    val shade = Color.Black.copy(alpha = 0.45f).compositeOver(bg)
    Column(
        modifier.fillMaxWidth()
            .shadow(24.dp, RoundedCornerShape(CardRadius), ambientColor = shade, spotColor = shade)
            .clip(RoundedCornerShape(CardRadius))
            .background(MaterialTheme.colorScheme.surface)
            .padding(CardPad),
        verticalArrangement = Arrangement.spacedBy(CardPad),
        content = content,
    )
}

/** The first screen after the intro: one title, one button. */
@Composable
internal fun StartScreen(onStart: () -> Unit, onLogin: () -> Unit) {
    val context = LocalContext.current
    AuroraBackground {
        Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Spacer(Modifier.weight(1f))
            Image(painterResource(R.drawable.logo), null, Modifier.size(64.dp))
            Spacer(Modifier.height(20.dp))
            Text(
                stringResource(R.string.start_title), style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground, textAlign = TextAlign.Center,
            )
            Spacer(Modifier.weight(1.2f))
            StartCard {
                PrimaryButton(stringResource(R.string.get_started), onClick = onStart, shape = RoundedCornerShape(InnerRadius))
            }
            TextButton(onClick = onLogin, modifier = Modifier.padding(top = 10.dp)) {
                Text(stringResource(R.string.have_account_login), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            LegalLine(context)
        }
    }
}

@Composable
private fun LegalLine(context: android.content.Context) {
    Row(horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
        listOf(R.string.terms to "terms", R.string.privacy_policy to "privacy").forEach { (label, page) ->
            Text(
                stringResource(label), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.clip(RoundedCornerShape(8.dp))
                    .clickable { runCatching { context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("${app.talklive.net.ServerConfig.url}/$page"))) } }
                    .padding(horizontal = 8.dp, vertical = 6.dp),
            )
        }
    }
}

/** Date of birth on three wheels. Under 18 cannot go on. */
@Composable
internal fun AgeScreen(onBack: () -> Unit, onDone: (adult: Boolean) -> Unit) {
    val context = LocalContext.current
    val now = Calendar.getInstance()
    val thisYear = now.get(Calendar.YEAR)
    val years = remember { (thisYear downTo thisYear - 100).toList() }
    val months = remember { DateFormatSymbols.getInstance().months.take(12) }
    var month by rememberSaveable { mutableIntStateOf(0) }
    var dayIdx by rememberSaveable { mutableIntStateOf(0) }
    var yearIdx by rememberSaveable { mutableIntStateOf(25) }
    val daysIn = remember(month, yearIdx) {
        Calendar.getInstance().apply { set(years[yearIdx], month, 1) }.getActualMaximum(Calendar.DAY_OF_MONTH)
    }
    if (dayIdx >= daysIn) dayIdx = daysIn - 1
    AuroraBackground {
        Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 24.dp)) {
            IconButton(onClick = onBack, modifier = Modifier.padding(top = 4.dp)) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, null) }
            Spacer(Modifier.height(12.dp))
            Text(stringResource(R.string.age_title), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.height(8.dp))
            Text(stringResource(R.string.age_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.weight(1f))
            StartCard {
                Box(contentAlignment = Alignment.Center) {
                    // The selection band, with the same inner radius as everything else in the card.
                    Box(Modifier.fillMaxWidth().height(46.dp).clip(RoundedCornerShape(InnerRadius)).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)))
                    Row(Modifier.fillMaxWidth()) {
                        WheelPicker(months, month, { month = it }, Modifier.weight(1.5f))
                        WheelPicker((1..daysIn).map { it.toString() }, dayIdx, { dayIdx = it }, Modifier.weight(0.8f))
                        WheelPicker(years.map { it.toString() }, yearIdx, { yearIdx = it }, Modifier.weight(1f))
                    }
                }
                PrimaryButton(
                    stringResource(R.string.continue_),
                    onClick = { onDone(app.talklive.data.AgeGate.submit(context, years[yearIdx], month + 1, dayIdx + 1)) },
                    shape = RoundedCornerShape(InnerRadius),
                )
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

/** Under 18: a calm, final answer. */
@Composable
internal fun BlockedScreen() {
    AuroraBackground {
        Column(Modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
            Image(painterResource(R.drawable.logo), null, Modifier.size(56.dp))
            Spacer(Modifier.height(20.dp))
            Text(stringResource(R.string.underage_title), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground, textAlign = TextAlign.Center)
            Spacer(Modifier.height(10.dp))
            Text(stringResource(R.string.underage_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        }
    }
}

/** How to continue: Google, email, or as a guest. */
@Composable
internal fun MethodsScreen(vm: AuthViewModel, onBack: (() -> Unit)?, onEmail: () -> Unit, onLogin: () -> Unit, allowGuest: Boolean, onGuest: () -> Unit = { vm.continueAsGuest() }) {
    val context = LocalContext.current
    AuroraBackground {
        Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Row(Modifier.fillMaxWidth()) { if (onBack != null) IconButton(onClick = onBack, modifier = Modifier.padding(top = 4.dp)) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, null) } }
            Spacer(Modifier.weight(1f))
            Text(stringResource(R.string.methods_title), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground, textAlign = TextAlign.Center)
            Spacer(Modifier.weight(1f))
            // The account signed out last on this phone, back in one tap.
            vm.saved?.let { acc ->
                StartCard(Modifier.padding(bottom = 12.dp)) {
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(InnerRadius)).clickable { vm.useSaved(); onLogin() }.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        app.talklive.ui.animals.AnimalAvatar(null, acc.nickname, 44.dp)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(stringResource(R.string.continue_as, acc.nickname), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                            if (acc.email.isNotBlank()) Text(acc.email, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
            StartCard {
                PrimaryButton(
                    stringResource(R.string.continue_google), onClick = { vm.google(context) }, loading = vm.googleBusy,
                    shape = RoundedCornerShape(InnerRadius),
                    leading = { androidx.compose.foundation.Image(androidx.compose.ui.res.painterResource(R.drawable.ic_google), null, Modifier.size(18.dp)) },
                )
                SecondaryButton(
                    text = stringResource(R.string.signup_email), onClick = onEmail,
                    leading = { Icon(Icons.Rounded.Mail, null, Modifier.size(20.dp)) },
                    shape = RoundedCornerShape(InnerRadius),
                )
            }
            ErrorBanner(vm.error)
            TextButton(onClick = onLogin, modifier = Modifier.padding(top = 10.dp)) {
                Text(stringResource(R.string.have_account_login), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (allowGuest) TextButton(onClick = onGuest) {
                Text(stringResource(R.string.continue_guest), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(12.dp))
        }
    }
}

/**
 * Signed in: light opens out from the middle, the avatar springs in with
 * "Welcome, name", then the whole thing lifts away into the app.
 */
@Composable
fun SignedInWelcome(name: String, animal: String?, onDone: () -> Unit) {
    val burst = remember { androidx.compose.animation.core.Animatable(0f) }
    val face = remember { androidx.compose.animation.core.Animatable(0.4f) }
    val text = remember { androidx.compose.animation.core.Animatable(0f) }
    val out = remember { androidx.compose.animation.core.Animatable(1f) }
    androidx.compose.runtime.LaunchedEffect(Unit) {
        kotlinx.coroutines.coroutineScope {
            launch { burst.animateTo(1f, tween(900, easing = androidx.compose.animation.core.FastOutSlowInEasing)) }
            launch { face.animateTo(1f, androidx.compose.animation.core.spring(dampingRatio = 0.5f, stiffness = 260f)) }
            launch { kotlinx.coroutines.delay(220); text.animateTo(1f, tween(420)) }
        }
        kotlinx.coroutines.delay(650)
        out.animateTo(0f, tween(380))
        onDone()
    }
    val bg = MaterialTheme.colorScheme.background
    Box(
        Modifier.fillMaxSize().graphicsLayerAlpha(out.value).background(bg).clickable(enabled = true) {},
        contentAlignment = Alignment.Center,
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val r = size.maxDimension * burst.value
            drawCircle(Brush.radialGradient(listOf(BrandTeal.copy(alpha = 0.55f * (1 - burst.value * 0.6f)), BrandTeal.copy(alpha = 0.25f), Color.Transparent), center = center, radius = r.coerceAtLeast(1f)), radius = r, center = center)
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.graphicsLayerScale(face.value)) { app.talklive.ui.animals.AnimalAvatar(animal, name, 112.dp) }
            Spacer(Modifier.height(20.dp))
            Text(
                stringResource(R.string.welcome_name, name), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground, textAlign = TextAlign.Center,
                modifier = Modifier.graphicsLayerSlide(text.value),
            )
        }
    }
}

private fun Modifier.graphicsLayerAlpha(a: Float) = this.then(Modifier.graphicsLayer { alpha = a; translationY = (1 - a) * -40f })
private fun Modifier.graphicsLayerScale(s: Float) = this.then(Modifier.graphicsLayer { scaleX = s; scaleY = s })
private fun Modifier.graphicsLayerSlide(f: Float) = this.then(Modifier.graphicsLayer { alpha = f; translationY = (1 - f) * 30f })
