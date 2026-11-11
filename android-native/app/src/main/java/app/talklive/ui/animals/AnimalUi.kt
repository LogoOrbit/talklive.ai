package app.talklive.ui.animals

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.foundation.layout.Row
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Brush
import kotlinx.coroutines.launch
import androidx.compose.animation.graphics.res.animatedVectorResource
import androidx.compose.animation.graphics.res.rememberAnimatedVectorPainter
import androidx.compose.animation.graphics.vector.AnimatedImageVector
import androidx.compose.runtime.mutableStateOf
import app.talklive.R
import androidx.compose.ui.res.stringResource
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.aspectRatio

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.talklive.ui.components.BrandGradient

/**
 * A person's face in the app: their spirit animal on a soft tint of its own
 * colour, or their initial on the brand gradient when they have none.
 */
@Composable
fun AnimalAvatar(animalId: String?, name: String?, size: Dp, modifier: Modifier = Modifier, scene: Boolean = LocalPlusAvatar.current) {
    val animal = animalById(animalId)
    val reduce = app.talklive.ui.theme.LocalReduceMotion.current
    AnimatedContent(
        targetState = animal,
        transitionSpec = { (scaleIn(spring(dampingRatio = 0.55f)) + fadeIn()) togetherWith fadeOut() },
        label = "avatar",
        modifier = modifier,
    ) { a ->
        if (a != null) {
            // Plus members' characters stand in a themed scene (AvatarScenes.kt), drawn
            // behind the art without its round tile; still under 56dp or with reduced motion.
            val bare = if (scene) CharacterBare[a.id] else null
            val face = if (bare != null) remember(a.id) { a.copy(icon = bare) } else a
            val fill = if (bare != null) 1f else 0.82f
            Box(
                Modifier.size(size).clip(CircleShape).background(a.color.copy(alpha = 0.22f))
                    .then(if (bare != null) Modifier.characterScene(a.id, animate = !reduce && size >= 56.dp) else Modifier),
                contentAlignment = Alignment.Center,
            ) {
                if (LocalPlusAvatar.current && !reduce) LiveFace(face, size, fill)
                else Image(painterResource(face.icon), contentDescription = a.name, modifier = Modifier.size(size * fill))
            }
        } else {
            Box(Modifier.size(size).clip(CircleShape).background(BrandGradient), contentAlignment = Alignment.Center) {
                Text(
                    name?.firstOrNull()?.uppercase() ?: "?",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = (size.value * 0.4f).sp,
                )
            }
        }
    }
}

/** True inside a Plus member's gold ring: their face comes alive (see LiveFace). */
val LocalPlusAvatar = androidx.compose.runtime.staticCompositionLocalOf { false }

/**
 * A Plus member's face: every few seconds it blinks, tilts its head or
 * chatters as if talking, and a gold shine sweeps across it. All motion is
 * read in draw/layer lambdas, so it never recomposes the screen around it.
 */
@OptIn(androidx.compose.animation.graphics.ExperimentalAnimationGraphicsApi::class)
@Composable
private fun LiveFace(a: Animal, size: Dp, fill: Float = 0.82f) {
    val live = LiveAvatars[a.icon]
    var blink by remember { mutableStateOf(false) }
    val tilt = remember { androidx.compose.animation.core.Animatable(0f) }
    val bob = remember { androidx.compose.animation.core.Animatable(0f) }
    val shine = remember { androidx.compose.animation.core.Animatable(-1f) }
    LaunchedEffect(a.id) {
        var turn = 0
        while (true) {
            kotlinx.coroutines.delay(2200L + (0..2600).random())
            kotlinx.coroutines.coroutineScope {
                launch { shine.snapTo(-1f); shine.animateTo(2f, androidx.compose.animation.core.tween(900)) }
                when (turn++ % 3) {
                    0 -> { blink = !blink; kotlinx.coroutines.delay(260); if (turn % 2 == 0) blink = !blink }
                    1 -> launch {
                        for (r in listOf(-7f, 5f, -2f, 0f)) tilt.animateTo(r, androidx.compose.animation.core.tween(220))
                    }
                    else -> launch {
                        // Chatter: quick little bobs, like someone talking.
                        repeat(3) {
                            bob.animateTo(1f, androidx.compose.animation.core.tween(90))
                            bob.animateTo(0f, androidx.compose.animation.core.tween(110))
                        }
                    }
                }
            }
        }
    }
    val painter = if (live != null) {
        rememberAnimatedVectorPainter(AnimatedImageVector.animatedVectorResource(live), blink)
    } else painterResource(a.icon)
    Box(
        Modifier.size(size).drawWithContent {
            drawContent()
            // A band of gold light passing over the face.
            val x = shine.value * this.size.width
            drawRect(
                Brush.linearGradient(
                    listOf(Color.Transparent, Color(0x66FFF3C4), Color(0x88FFFFFF), Color(0x66F5C451), Color.Transparent),
                    start = androidx.compose.ui.geometry.Offset(x - this.size.width * 0.35f, 0f),
                    end = androidx.compose.ui.geometry.Offset(x + this.size.width * 0.15f, this.size.height),
                ),
            )
        },
        contentAlignment = Alignment.Center,
    ) {
        Image(
            painter, contentDescription = a.name,
            modifier = Modifier.size(size * fill).graphicsLayer {
                rotationZ = tilt.value
                translationY = -bob.value * size.toPx() * 0.04f
                scaleY = 1f - bob.value * 0.04f
                transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 1f)
            },
        )
    }
}

/**
 * Faces a free account cannot pick: everything outside FREE_FACES (generated from
 * the website's isFree, and mirrored by the server). Only a CHANGE to one is
 * refused: whoever already wears it keeps it.
 */
fun isPlusFace(id: String?): Boolean = id != null && id !in FREE_FACES && animalById(id) != null

/** A free animal at random: "Surprise me" and the automatic first pick never deal a Plus face. */
fun randomFreeAnimal(): Animal = Animals.filter { it.id in FREE_FACES }.random()

/** Grid of every animal; the chosen one lifts and gets its colour ring. */
@Composable
fun AnimalGrid(
    selected: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(0.dp),
    premium: Boolean = false,
    onLocked: () -> Unit = {},
    // The invite reward: one legendary face, the first one picked (null = not picked yet).
    look: Boolean = false,
    lookFace: String? = null,
) {
    // The face worn when the grid opened stays pickable: nobody loses the avatar they had.
    val held = remember { selected }
    fun unlocked(id: String) = premium || id == held || (look && (lookFace == null || lookFace.removePrefix("a:") == id))
    val haptics = LocalHapticFeedback.current
    // Two families, two tabs, so the characters are never hidden below the animals.
    var tab by androidx.compose.runtime.saveable.rememberSaveable { mutableStateOf(if (selected?.startsWith("c:") == true) 1 else 0) }
    Column(modifier) {
    Row(
        Modifier.fillMaxWidth().padding(contentPadding).padding(bottom = 4.dp).clip(RoundedCornerShape(50)).background(MaterialTheme.colorScheme.surface).padding(4.dp),
    ) {
        listOf(R.string.avatars_animals, R.string.avatars_characters).forEachIndexed { i, label ->
            val on = tab == i
            Box(
                Modifier.weight(1f).clip(RoundedCornerShape(50))
                    .background(if (on) app.talklive.ui.components.BrandGradient else androidx.compose.ui.graphics.SolidColor(Color.Transparent))
                    .clickable { tab = i }.padding(vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) { Text(stringResource(label), style = MaterialTheme.typography.labelLarge, color = if (on) Color.White else MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
    LazyVerticalGrid(
        columns = GridCells.Adaptive(76.dp),
        modifier = Modifier.weight(1f, fill = false),
        contentPadding = contentPadding,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        // Spirit animals, then the website's movie characters.
        run {
            val list = (if (tab == 0) Animals else Characters).sortedBy { isPlusFace(it.id) }
            items(list, key = { it.id }) { a ->
            val on = a.id == selected
            val scale by animateFloatAsState(if (on) 1.06f else 1f, spring(dampingRatio = 0.5f, stiffness = 500f), label = "s")
            val ring by animateColorAsState(if (on) a.color else Color.Transparent, label = "ring")
            Column(
                Modifier.scale(scale).clip(RoundedCornerShape(20.dp))
                    .background(if (on) a.color.copy(alpha = 0.14f) else MaterialTheme.colorScheme.surface)
                    .border(2.dp, ring, RoundedCornerShape(20.dp))
                    .then(if (isPlusFace(a.id)) Modifier.border(1.5.dp, app.talklive.ui.components.PlusGold.copy(alpha = 0.7f), RoundedCornerShape(20.dp)) else Modifier)
                    .clickable(remember { MutableInteractionSource() }, indication = null) {
                        haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        if (isPlusFace(a.id) && !unlocked(a.id)) onLocked() else onSelect(a.id)
                    }
                    .padding(vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box {
                    Image(painterResource(a.icon), a.name, Modifier.fillMaxWidth(0.72f).aspectRatio(1f))
                    if (isPlusFace(a.id)) Box(Modifier.align(Alignment.TopEnd)) {
                        if (unlocked(a.id)) app.talklive.ui.components.PlusGem(14.dp)
                        else androidx.compose.material3.Icon(androidx.compose.material.icons.Icons.Rounded.Lock, null, tint = app.talklive.ui.theme.GoldText, modifier = Modifier.size(14.dp))
                    }
                }
                Text(
                    a.name,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                )
            }
        }
        }
    }
}
    }

/** Selected animal's name and trait, animating as the choice changes. */
@Composable
fun AnimalCaption(selected: String?, modifier: Modifier = Modifier) {
    AnimatedContent(targetState = animalById(selected), label = "caption", modifier = modifier) { a ->
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                a?.name ?: " ",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Text(
                a?.trait ?: " ",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

