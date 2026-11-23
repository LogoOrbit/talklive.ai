package app.talklive.ui.animals

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
    // Nobody shows as a bare letter: without a chosen animal, one is picked from
    // their name, so the same person always gets the same face.
    val animal = animalById(animalId) ?: fallbackAnimal(name)
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
            val bare = if (scene && !a.premium) CharacterBare[a.id] else null
            val face = if (bare != null) remember(a.id) { a.copy(icon = bare) } else a
            // A Plus portrait brings its own lit tile, so it fills the circle.
            val fill = if (bare != null || a.premium) 1f else 0.82f
            Box(
                Modifier.size(size).clip(CircleShape).background(if (a.premium) Color.Transparent else a.color.copy(alpha = 0.22f))
                    .then(if (bare != null) Modifier.characterScene(a.id, animate = !reduce && size >= 56.dp) else Modifier),
                contentAlignment = Alignment.Center,
            ) {
                if (a.special) SpecialFaceArt(a.id, Modifier.size(size * fill), animate = size >= 32.dp)
                // A Plus portrait moves only where it is big (profile, previews): in lists it is a
                // still, drawn once and cached, so scrolling stays smooth and memory stays low.
                else if (a.premium) {
                    if (!reduce && size >= 72.dp && !lowEndDevice()) LivingFace(face.icon, a.name, Modifier.size(size))
                    else FaceImage(face.icon, a.name, Modifier.size(size))
                }
                else if (LocalPlusAvatar.current && !reduce) LiveFace(face, size, fill)
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

/** A steady stand-in face for someone who has not picked an animal. */
fun fallbackAnimal(name: String?): Animal {
    val key = name?.trim()?.lowercase().orEmpty()
    // From the free faces, like the server's default: a stand-in is never a Plus portrait.
    val pool = Animals.filter { it.id in FREE_FACES }.ifEmpty { Animals }
    return pool[Math.floorMod(key.hashCode(), pool.size)]
}

/**
 * Phones that report themselves as low on memory (Android Go and similar): Plus
 * portraits stay still in lists there, and the picker animates only the chosen face.
 */
@Composable
fun lowEndDevice(): Boolean {
    val ctx = androidx.compose.ui.platform.LocalContext.current
    return remember {
        val am = ctx.getSystemService(android.content.Context.ACTIVITY_SERVICE) as? android.app.ActivityManager
        am?.isLowRamDevice == true || Runtime.getRuntime().maxMemory() < 160L * 1024 * 1024
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
    // A band of gold light passes over a Plus face now and then; the face's own
    // motion (ears, eyes, breathing, sparkles) is its living drawable.
    val shine = remember { androidx.compose.animation.core.Animatable(-1f) }
    LaunchedEffect(a.id) {
        while (true) {
            kotlinx.coroutines.delay(4200L + (0..2600).random())
            shine.snapTo(-1f); shine.animateTo(2f, androidx.compose.animation.core.tween(900))
        }
    }
    Box(
        Modifier.size(size).drawWithContent {
            drawContent()
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
    ) { LivingFace(a.icon, a.name, Modifier.size(size * fill)) }
}

/**
 * A face, alive: its own AnimatedVectorDrawable (tools/gen-live-motion.js), which
 * Android plays on the render thread. It stops when the face leaves the screen,
 * and the still drawing stands in under reduced motion or where there is none.
 */
@Composable
fun LivingFace(icon: Int, description: String?, modifier: Modifier = Modifier) {
    val live = LiveAvatars[icon] ?: PremiumLive[icon]
    if (live == null || app.talklive.ui.theme.LocalReduceMotion.current || androidx.compose.ui.platform.LocalInspectionMode.current) {
        Image(painterResource(icon), description, modifier)
        return
    }
    androidx.compose.ui.viewinterop.AndroidView(
        factory = { ctx -> android.widget.ImageView(ctx).apply { scaleType = android.widget.ImageView.ScaleType.FIT_CENTER } },
        update = { v ->
            v.contentDescription = description
            if (v.tag != live) {
                (v.drawable as? android.graphics.drawable.Animatable)?.stop()
                v.tag = live
                v.setImageResource(live)
                (v.drawable as? android.graphics.drawable.Animatable)?.start()
            }
        },
        onRelease = { v -> (v.drawable as? android.graphics.drawable.Animatable)?.stop() },
        modifier = modifier,
    )
}

/**
 * Faces a free account cannot pick: everything outside FREE_FACES (generated from
 * the website's isFree, and mirrored by the server). Only a CHANGE to one is
 * refused: whoever already wears it keeps it.
 */
fun isPlusFace(id: String?): Boolean = id != null && id !in FREE_FACES && !isSpecialFace(id) && animalById(id) != null

/**
 * Your own face as drawn: once Plus has ended a Plus face is not shown (spec 5); the server
 * swaps it for a free one too, and the picked face comes back if Plus does.
 */
fun ownFace(id: String?, plusEnded: Boolean, look: Boolean): String? =
    if (id != null && plusEnded && !look && isPlusFace(id)) freeFaceFor(id) else id

/** The free face a Plus face falls back to: a character becomes the chef, an animal the penguin (server FREE_*_FALLBACK). */
fun freeFaceFor(id: String?): String = if (id != null && id.startsWith("c:")) "c:chef" else "penguin"

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
    // The account's level tier (none, silver, gold, diamond): special faces open with it, never with Plus.
    tier: String = "none",
    onSpecialLocked: (String) -> Unit = {},
    // Edit profile: locked faces can still be picked to preview; saving is what asks for Plus or a level.
    previewLocked: Boolean = false,
) {
    // The face worn when the grid opened stays pickable: nobody loses the avatar they had.
    val held = remember { selected }
    fun unlocked(id: String) = premium || id == held || (look && (lookFace == null || lookFace.removePrefix("a:") == id))
    val haptics = LocalHapticFeedback.current
    val lowEnd = lowEndDevice()
    var previewing by remember { mutableStateOf<Animal?>(null) }
    previewing?.let { p -> LockedFacePreview(p, onUnlock = { previewing = null; onLocked() }, onDismiss = { previewing = null }) }
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
            // Only the faces on offer (spec 8): 5 free + 5 Plus in each family, then the 3 level faces.
            val list = if (tab == 0) PICKER_ANIMALS.mapNotNull { animalById(it) } else PICKER_CHARACTERS.mapNotNull { animalById(it) } + SpecialFaces
            items(list, key = { it.id }) { a ->
            val specialLocked = a.special && !(specialUnlocked(a.id, tier) || a.id == held)
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
                        if (previewLocked) onSelect(a.id)
                        else if (specialLocked) onSpecialLocked(a.id)
                        // A locked Plus face opens a big live preview first, with the way to unlock it.
                        else if (isPlusFace(a.id) && !unlocked(a.id)) previewing = a else onSelect(a.id)
                    }
                    .padding(vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box {
                    if (a.special) SpecialFaceArt(a.id, Modifier.fillMaxWidth(0.72f).aspectRatio(1f).graphicsLayer { alpha = if (specialLocked) 0.45f else 1f }, animate = !specialLocked)
                    // Stills in the grid (drawn once, cached), and only the chosen face moves: a grid
                    // of live vector animations re-drew every face each frame and made scrolling lag.
                    // Tapping a locked face opens its live preview.
                    else if (!on || lowEnd) {
                        if (a.premium) FaceImage(a.icon, a.name, Modifier.fillMaxWidth(0.86f).aspectRatio(1f).clip(CircleShape))
                        else Image(painterResource(a.icon), a.name, Modifier.fillMaxWidth(0.72f).aspectRatio(1f).clip(CircleShape))
                    }
                    else LivingFace(a.icon, a.name, Modifier.fillMaxWidth(if (a.premium) 0.86f else 0.72f).aspectRatio(1f).clip(CircleShape))
                    if (specialLocked) androidx.compose.material3.Icon(androidx.compose.material.icons.Icons.Rounded.Lock, null, tint = app.talklive.ui.theme.GoldText, modifier = Modifier.align(Alignment.TopEnd).size(14.dp))
                    if (isPlusFace(a.id)) Box(Modifier.align(Alignment.TopEnd)) {
                        if (unlocked(a.id)) app.talklive.ui.components.PlusGem(14.dp)
                        else androidx.compose.material3.Icon(androidx.compose.material.icons.Icons.Rounded.Lock, null, tint = app.talklive.ui.theme.GoldText, modifier = Modifier.size(14.dp))
                    }
                }
                Text(
                    if (specialLocked) stringResource(when (SPECIAL_TIER[a.id]) { "silver" -> R.string.reach_silver; "gold" -> R.string.reach_gold; else -> R.string.reach_diamond }) else a.name,
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


/** A Plus face a free account tapped: shown big and alive, with what it is and how to get it. */
@Composable
private fun LockedFacePreview(a: Animal, onUnlock: () -> Unit, onDismiss: () -> Unit) {
    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Box(Modifier.size(168.dp).clip(CircleShape), contentAlignment = Alignment.Center) {
                LivingFace(a.icon, a.name, Modifier.size(168.dp))
            }
        },
        title = { Text(a.name, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) },
        text = {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                if (a.trait.isNotBlank()) Text(a.trait, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                Spacer(Modifier.size(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    app.talklive.ui.components.PlusGem(16.dp)
                    Spacer(Modifier.size(6.dp))
                    Text(stringResource(R.string.plus_face_preview), style = MaterialTheme.typography.labelLarge, color = app.talklive.ui.theme.GoldText)
                }
            }
        },
        confirmButton = { androidx.compose.material3.Button(onClick = onUnlock) { Text(stringResource(R.string.plus_face_unlock)) } },
        dismissButton = { androidx.compose.material3.TextButton(onClick = onDismiss) { Text(stringResource(R.string.close)) } },
    )
}
