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
import androidx.compose.foundation.layout.offset
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
 * The profile card: a cover banner across the top, the avatar sitting on its lower edge, then name,
 * Friend ID, level and stats on the card itself. Used on the Profile screen and, with no buttons, as
 * the live preview at the top of Edit profile.
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
    avatarSize: androidx.compose.ui.unit.Dp = 96.dp,
    onEditAvatar: (() -> Unit)? = null,
    onLevel: (() -> Unit)? = null,
    stats: (@Composable () -> Unit)? = null,
) {
    val bannerHeight = avatarSize + 12.dp
    Surface(modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp) {
        Column(Modifier.fillMaxWidth().padding(bottom = 18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.fillMaxWidth()) {
                CoverBackground(cover, Modifier.fillMaxWidth().height(bannerHeight))
                // The level sits on the banner's corner, out of the way of the avatar.
                if (progress != null) {
                    val chip = @Composable {
                        Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Star, null, tint = tierColor(progress.tier), modifier = Modifier.size(15.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.level_chip, progress.level), style = MaterialTheme.typography.labelLarge, color = Color.White)
                        }
                    }
                    val chipMod = Modifier.align(Alignment.TopEnd).padding(10.dp)
                    if (onLevel != null) Surface(onClick = onLevel, shape = CircleShape, color = Color.Black.copy(alpha = 0.32f), modifier = chipMod, content = chip)
                    else Surface(shape = CircleShape, color = Color.Black.copy(alpha = 0.32f), modifier = chipMod, content = chip)
                }
                Box(Modifier.align(Alignment.BottomCenter).offset(y = avatarSize / 2)) {
                    // A ring in the card's colour lifts the avatar off the banner.
                    Box(Modifier.clip(CircleShape).background(MaterialTheme.colorScheme.surface).padding(4.dp)) {
                        PlusRing(ring, avatarSize, alive = alive) {
                            AnimalAvatar(face, name, avatarSize, Modifier.clip(CircleShape).then(if (onEditAvatar != null) Modifier.clickable(onClick = onEditAvatar) else Modifier))
                        }
                    }
                    if (onEditAvatar != null) Box(
                        Modifier.align(Alignment.BottomEnd).padding(end = 4.dp, bottom = 4.dp).size(30.dp).clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surface).padding(3.dp).clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary).clickable(onClick = onEditAvatar),
                        contentAlignment = Alignment.Center,
                    ) { Icon(Icons.Rounded.Edit, stringResource(R.string.edit_avatar_cd), tint = Color.White, modifier = Modifier.size(14.dp)) }
                }
            }
            Spacer(Modifier.height(avatarSize / 2 + 10.dp))
            Row(Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    name, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false),
                )
                TopBadge(badges, 22.dp, Modifier.padding(start = 6.dp))
            }
            if (!friendId.isNullOrBlank()) Text(friendId, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (stats != null) {
                Spacer(Modifier.height(14.dp))
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) { stats() }
            }
        }
    }
}

/** A small pill for the card's stats row: "🔥 5" or "🌍 12 countries". */
@Composable
fun CardStatChip(text: String, onClick: (() -> Unit)?) {
    val body = @Composable {
        Text(
            text, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.Center, maxLines = 1,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
        )
    }
    val color = MaterialTheme.colorScheme.background
    if (onClick != null) Surface(onClick = onClick, shape = CircleShape, color = color, content = body)
    else Surface(shape = CircleShape, color = color, content = body)
}
