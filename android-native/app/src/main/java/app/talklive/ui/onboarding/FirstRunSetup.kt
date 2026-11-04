package app.talklive.ui.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.talklive.R
import app.talklive.ui.animals.AnimalAvatar
import app.talklive.ui.animals.AnimalCaption
import app.talklive.ui.animals.AnimalGrid
import app.talklive.ui.animals.Animals
import app.talklive.ui.animals.animalById
import app.talklive.ui.components.BrandGradient
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.components.ScreenTitle
import kotlin.math.cos
import kotlin.math.sin

/**
 * The first time someone opens the app: pick a face, say who you are (both
 * optional), and you're in. Nothing is saved until the last step.
 */
@Composable
fun FirstRunSetup(onDone: (animal: String, gender: String, age: String) -> Unit) {
    var step by rememberSaveable { mutableIntStateOf(0) }
    var animal by rememberSaveable { mutableStateOf<String?>(null) }
    var gender by rememberSaveable { mutableStateOf("unspecified") }
    var age by rememberSaveable { mutableStateOf("unspecified") }
    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 24.dp)) {
        Spacer(Modifier.height(16.dp))
        // Progress: three dots, the current one long.
        Row(Modifier.align(Alignment.CenterHorizontally), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            repeat(3) { i ->
                val w by animateDpAsState(if (i == step) 26.dp else 8.dp, spring(dampingRatio = 0.6f), label = "dot")
                Box(Modifier.width(w).height(8.dp).clip(CircleShape).background(if (i <= step) BrandGradient else androidx.compose.ui.graphics.SolidColor(MaterialTheme.colorScheme.surfaceVariant)))
            }
        }
        AnimatedContent(
            targetState = step,
            transitionSpec = { (slideInHorizontally { it / 3 } + fadeIn(tween(250))) togetherWith (slideOutHorizontally { -it / 3 } + fadeOut(tween(150))) },
            label = "step",
            modifier = Modifier.weight(1f),
        ) { s ->
            when (s) {
                0 -> Column(Modifier.fillMaxSize()) {
                    Spacer(Modifier.height(20.dp))
                    ScreenTitle(stringResource(R.string.animal_title), stringResource(R.string.animal_body))
                    Spacer(Modifier.height(12.dp))
                    AnimalGrid(selected = animal, onSelect = { animal = it }, modifier = Modifier.weight(1f).fillMaxWidth(), contentPadding = PaddingValues(vertical = 8.dp))
                    AnimalCaption(animal, Modifier.padding(vertical = 10.dp))
                    PrimaryButton(stringResource(R.string.continue_), onClick = { step = 1 }, enabled = animal != null)
                    TextButton(onClick = { animal = Animals.random().id }, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text("🎲  " + stringResource(R.string.surprise_me)) }
                }
                1 -> AboutYou(gender, age, onGender = { gender = it }, onAge = { age = it }, onNext = { step = 2 })
                else -> AllSet(animal) { onDone(animal ?: Animals.first().id, gender, age) }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AboutYou(gender: String, age: String, onGender: (String) -> Unit, onAge: (String) -> Unit, onNext: () -> Unit) {
    Column(Modifier.fillMaxSize()) {
        Spacer(Modifier.height(20.dp))
        ScreenTitle(stringResource(R.string.setup_about_title), stringResource(R.string.setup_about_body))
        Spacer(Modifier.height(24.dp))
        Text(stringResource(R.string.i_am), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            listOf(Triple("male", "👨", R.string.gender_male), Triple("female", "👩", R.string.gender_female), Triple("unspecified", "🙂", R.string.gender_unspecified)).forEach { (g, e, label) ->
                BigChoice(e, stringResource(label), gender == g, Modifier.weight(1f)) { onGender(g) }
            }
        }
        Spacer(Modifier.height(24.dp))
        Text(stringResource(R.string.age_group), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
        Spacer(Modifier.height(10.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            (listOf("18-24", "25-34", "35-44", "45-54", "55+").map { it to it } + ("unspecified" to stringResource(R.string.gender_unspecified))).forEach { (a, label) ->
                val on = age == a
                val border by animateColorAsState(if (on) Color.Transparent else MaterialTheme.colorScheme.outline, label = "b")
                Text(
                    label, style = MaterialTheme.typography.labelLarge,
                    color = if (on) Color.White else MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.clip(CircleShape).background(if (on) BrandGradient else androidx.compose.ui.graphics.SolidColor(MaterialTheme.colorScheme.surface))
                        .border(1.dp, border, CircleShape).clickable { onAge(a) }.padding(horizontal = 18.dp, vertical = 11.dp),
                )
            }
        }
        Spacer(Modifier.weight(1f))
        Text(stringResource(R.string.setup_about_privacy), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp))
        PrimaryButton(stringResource(R.string.continue_), onClick = onNext)
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun BigChoice(emoji: String, label: String, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val scale by androidx.compose.animation.core.animateFloatAsState(if (selected) 1.04f else 1f, spring(dampingRatio = 0.5f), label = "s")
    Column(
        modifier.graphicsLayer { scaleX = scale; scaleY = scale }.clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(2.dp, if (selected) MaterialTheme.colorScheme.primary else Color.Transparent, RoundedCornerShape(20.dp))
            .clickable(onClick = onClick).padding(vertical = 16.dp, horizontal = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(emoji, fontSize = 32.sp)
        Spacer(Modifier.height(6.dp))
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.Center, maxLines = 2)
    }
}

/** The "boom, done" moment: your avatar pops in with a burst of sparks. */
@Composable
private fun AllSet(animal: String?, onGo: () -> Unit) {
    val pop = remember { Animatable(0f) }
    val burst = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        pop.animateTo(1f, spring(dampingRatio = 0.45f, stiffness = 260f))
    }
    LaunchedEffect(Unit) { burst.animateTo(1f, tween(900)) }
    Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.size(240.dp)) {
            val colors = listOf(Color(0xFF6C5CE7), Color(0xFF00D4FF), Color(0xFFF2C14E), Color(0xFFEC4899), Color(0xFF22C55E))
            repeat(14) { i ->
                val a = i * (2 * Math.PI / 14)
                val r = 110f * burst.value
                Box(
                    Modifier.graphicsLayer { translationX = (cos(a) * r).toFloat() * density; translationY = (sin(a) * r).toFloat() * density; alpha = 1f - burst.value }
                        .size(10.dp).clip(CircleShape).background(colors[i % colors.size]),
                )
            }
            Box(Modifier.graphicsLayer { scaleX = pop.value; scaleY = pop.value }) { AnimalAvatar(animal, null, 150.dp) }
        }
        Spacer(Modifier.height(20.dp))
        Text(stringResource(R.string.setup_done_title), style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground, textAlign = TextAlign.Center)
        Text(
            stringResource(R.string.setup_done_body, animalById(animal)?.name ?: ""),
            style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 6.dp, start = 12.dp, end = 12.dp),
        )
        Spacer(Modifier.height(36.dp))
        PrimaryButton(stringResource(R.string.setup_go), onClick = onGo)
    }
}
