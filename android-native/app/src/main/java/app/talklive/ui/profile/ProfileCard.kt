package app.talklive.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.progress.Progress
import app.talklive.social.BadgeSet
import app.talklive.ui.animals.AnimalAvatar
import app.talklive.ui.badges.TopBadge
import app.talklive.ui.components.PlusRing
import app.talklive.ui.rewards.tierColor

/**
 * The profile card: everything about a person on their cover. Used on the Profile screen and, with no
 * buttons, as the live preview at the top of Edit profile.
 */
@Composable
fun ProfileCard(
    cover: String?,
    face: String?,
    name: String,
    friendId: String?,
    badges: BadgeSet?,
    progress: Progress?,
    ring: Boolean,
    alive: Boolean,
    modifier: Modifier = Modifier,
    avatarSize: androidx.compose.ui.unit.Dp = 88.dp,
    onEditAvatar: (() -> Unit)? = null,
    onLevel: (() -> Unit)? = null,
    stats: (@Composable () -> Unit)? = null,
) {
    Box(modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp))) {
        CoverBackground(cover, Modifier.matchParentSize())
        // A soft scrim so white text reads on any cover.
        Box(Modifier.matchParentSize().background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.10f), Color.Black.copy(alpha = 0.45f)))))
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Box {
                PlusRing(ring, avatarSize, alive = alive) {
                    AnimalAvatar(face, name, avatarSize, Modifier.clip(CircleShape).then(if (onEditAvatar != null) Modifier.clickable(onClick = onEditAvatar) else Modifier))
                }
                if (onEditAvatar != null) Box(
                    Modifier.align(Alignment.BottomEnd).size(28.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary).clickable(onClick = onEditAvatar),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Rounded.Edit, stringResource(R.string.edit_avatar_cd), tint = Color.White, modifier = Modifier.size(15.dp)) }
            }
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    name, style = MaterialTheme.typography.titleLarge, color = Color.White,
                    maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false),
                )
                TopBadge(badges, 24.dp, Modifier.padding(start = 8.dp))
            }
            if (!friendId.isNullOrBlank()) Text(friendId, style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.85f))
            if (progress != null) {
                Spacer(Modifier.height(8.dp))
                val chip = @Composable {
                    Row(Modifier.padding(horizontal = 12.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Star, null, tint = tierColor(progress.tier), modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(stringResource(R.string.level_chip, progress.level), style = MaterialTheme.typography.labelLarge, color = Color.White)
                    }
                }
                if (onLevel != null) Surface(onClick = onLevel, shape = CircleShape, color = Color.White.copy(alpha = 0.22f), content = chip)
                else Surface(shape = CircleShape, color = Color.White.copy(alpha = 0.22f), content = chip)
            }
            if (stats != null) {
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) { stats() }
            }
        }
    }
}

/** A small translucent pill for the card's stats row: "🔥 5" or "🌍 12 countries". */
@Composable
fun CardStatChip(text: String, onClick: (() -> Unit)?) {
    val body = @Composable {
        Text(
            text, style = MaterialTheme.typography.labelLarge, color = Color.White, textAlign = TextAlign.Center, maxLines = 1,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
        )
    }
    if (onClick != null) Surface(onClick = onClick, shape = CircleShape, color = Color.White.copy(alpha = 0.22f), content = body)
    else Surface(shape = CircleShape, color = Color.White.copy(alpha = 0.22f), content = body)
}
