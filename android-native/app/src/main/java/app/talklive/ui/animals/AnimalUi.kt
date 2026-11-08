package app.talklive.ui.animals

import androidx.compose.foundation.layout.Row
import androidx.compose.runtime.setValue
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
fun AnimalAvatar(animalId: String?, name: String?, size: Dp, modifier: Modifier = Modifier) {
    val animal = animalById(animalId)
    AnimatedContent(
        targetState = animal,
        transitionSpec = { (scaleIn(spring(dampingRatio = 0.55f)) + fadeIn()) togetherWith fadeOut() },
        label = "avatar",
        modifier = modifier,
    ) { a ->
        if (a != null) {
            Box(
                Modifier.size(size).clip(CircleShape).background(a.color.copy(alpha = 0.22f)),
                contentAlignment = Alignment.Center,
            ) {
                Image(painterResource(a.icon), contentDescription = a.name, modifier = Modifier.size(size * 0.82f))
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

/** Legendary faces only Plus members can wear (server/index.js PLUS_FACES, as a: / c: ids). */
val PLUS_FACES = setOf("unicorn", "dragon", "eagle", "shark", "c:king", "c:queen", "c:knight", "c:astronaut")

/** Grid of every animal; the chosen one lifts and gets its colour ring. */
@Composable
fun AnimalGrid(
    selected: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(0.dp),
    premium: Boolean = false,
    onLocked: () -> Unit = {},
) {
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
            val list = (if (tab == 0) Animals else Characters).sortedByDescending { it.id in PLUS_FACES }
            items(list, key = { it.id }) { a ->
            val on = a.id == selected
            val scale by animateFloatAsState(if (on) 1.06f else 1f, spring(dampingRatio = 0.5f, stiffness = 500f), label = "s")
            val ring by animateColorAsState(if (on) a.color else Color.Transparent, label = "ring")
            Column(
                Modifier.scale(scale).clip(RoundedCornerShape(20.dp))
                    .background(if (on) a.color.copy(alpha = 0.14f) else MaterialTheme.colorScheme.surface)
                    .border(2.dp, ring, RoundedCornerShape(20.dp))
                    .then(if (a.id in PLUS_FACES) Modifier.border(1.5.dp, app.talklive.ui.components.PlusGold.copy(alpha = 0.7f), RoundedCornerShape(20.dp)) else Modifier)
                    .clickable(remember { MutableInteractionSource() }, indication = null) {
                        haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        if (a.id in PLUS_FACES && !premium) onLocked() else onSelect(a.id)
                    }
                    .padding(vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box {
                    Image(painterResource(a.icon), a.name, Modifier.fillMaxWidth(0.72f).aspectRatio(1f))
                    if (a.id in PLUS_FACES) Text(if (premium) "💎" else "🔒", fontSize = 13.sp, modifier = Modifier.align(Alignment.TopEnd))
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

