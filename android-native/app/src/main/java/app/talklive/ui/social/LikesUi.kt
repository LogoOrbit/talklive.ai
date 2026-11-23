package app.talklive.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.social.LikesSummary
import app.talklive.social.Person
import app.talklive.ui.animals.AnimalAvatar
import app.talklive.ui.components.PlusGold

private val LikePink = Color(0xFFEC4899)

/** The heart button: "Like" until pressed, then a quiet "Liked". */
@Composable
fun LikeButton(liked: Boolean, onLike: () -> Unit, modifier: Modifier = Modifier) {
    OutlinedButton(onClick = onLike, enabled = !liked, modifier = modifier.height(56.dp), shape = CircleShape) {
        Icon(Icons.Rounded.Favorite, null, tint = LikePink, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(8.dp))
        Text(stringResource(if (liked) R.string.liked else R.string.like))
    }
}

/** After a call or chat ends: a soft ask to like the person (a mutual like becomes a match). */
@Composable
fun PostCallLikeDialog(name: String, onLike: () -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Rounded.Favorite, null, tint = LikePink, modifier = Modifier.size(36.dp)) },
        title = { Text(stringResource(R.string.like_prompt_title, name), textAlign = TextAlign.Center) },
        text = { Text(stringResource(R.string.like_prompt_body), textAlign = TextAlign.Center) },
        confirmButton = { Button(onClick = { onLike(); onDismiss() }) { Text(stringResource(R.string.like)) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.not_now)) } },
    )
}

/** "It's a match!": both faces, then Call again or Message. */
@Composable
fun MatchDialog(person: Person, myAnimal: String?, onCall: () -> Unit, onMessage: () -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.match_title), textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) },
        text = {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AnimalAvatar(myAnimal, null, 76.dp)
                    Icon(Icons.Rounded.Favorite, null, tint = LikePink, modifier = Modifier.padding(horizontal = 10.dp).size(28.dp))
                    AnimalAvatar(person.animal, person.displayName, 76.dp)
                }
                Spacer(Modifier.height(14.dp))
                Text(stringResource(R.string.match_body, person.displayName), textAlign = TextAlign.Center, style = MaterialTheme.typography.bodyLarge)
            }
        },
        confirmButton = { Button(onClick = { onDismiss(); onCall() }) { Text(stringResource(R.string.call_again)) } },
        dismissButton = {
            Row {
                TextButton(onClick = { onDismiss(); onMessage() }) { Text(stringResource(R.string.message)) }
                TextButton(onClick = onDismiss) { Text(stringResource(R.string.close)) }
            }
        },
    )
}

/**
 * "N people liked you". Plus sees who (tap for their profile); everyone else sees blurred faces
 * and "See who with Plus".
 */
@Composable
fun LikesRow(likes: LikesSummary, onPerson: (Person) -> Unit, onPlus: () -> Unit, modifier: Modifier = Modifier) {
    if (likes.count <= 0 && likes.people.isEmpty()) return
    val count = if (likes.people.isNotEmpty()) maxOf(likes.count, likes.people.size) else likes.count
    val plus = likes.people.isNotEmpty()
    Column(
        modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp).clip(RoundedCornerShape(18.dp))
            .background(LikePink.copy(alpha = 0.10f)).border(1.dp, LikePink.copy(alpha = 0.35f), RoundedCornerShape(18.dp))
            .then(if (plus) Modifier else Modifier.clickable(onClick = onPlus))
            .padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Favorite, null, tint = LikePink, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text(
                pluralStringResource(R.plurals.people_liked_you, count, count),
                style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
        Spacer(Modifier.height(10.dp))
        if (plus) {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(likes.people, key = { it.clientId }) { p ->
                    Column(Modifier.width(60.dp).clip(RoundedCornerShape(12.dp)).clickable { onPerson(p) }, horizontalAlignment = Alignment.CenterHorizontally) {
                        AnimalAvatar(p.animal, p.displayName, 48.dp)
                        Text(p.displayName, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Row(horizontalArrangement = Arrangement.spacedBy((-10).dp)) {
                    repeat(minOf(count, 4)) { i ->
                        // Nobody is identifiable: a stand-in face, blurred (and the server sends no people to free accounts).
                        Box(Modifier.size(40.dp).clip(CircleShape).border(2.dp, MaterialTheme.colorScheme.background, CircleShape)) {
                            AnimalAvatar(listOf("cat", "fox", "rabbit", "panda")[i % 4], null, 40.dp, Modifier.blur(8.dp))
                        }
                    }
                }
                Spacer(Modifier.weight(1f))
                Icon(Icons.Rounded.Lock, null, tint = app.talklive.ui.theme.GoldText, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text(stringResource(R.string.see_who_with_plus), style = MaterialTheme.typography.labelLarge, color = app.talklive.ui.theme.GoldText)
            }
        }
    }
}

/**
 * Likes as one bubble at the start of the friends strip (like a story circle),
 * instead of a big card: a pink heart with the count. Plus opens who; free opens Plus.
 */
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun LikesBubble(likes: LikesSummary, onPerson: (Person) -> Unit, onPlus: () -> Unit) {
    val count = if (likes.people.isNotEmpty()) maxOf(likes.count, likes.people.size) else likes.count
    if (count <= 0) return
    var open by androidx.compose.runtime.saveable.rememberSaveable { androidx.compose.runtime.mutableStateOf(false) }
    Column(
        Modifier.width(64.dp).clip(RoundedCornerShape(12.dp)).clickable { if (likes.people.isNotEmpty()) open = true else onPlus() },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(contentAlignment = Alignment.Center) {
            val first = likes.people.firstOrNull()
            Box(
                Modifier.size(56.dp).clip(CircleShape)
                    .background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(LikePink, Color(0xFFF472B6))))
                    .padding(2.5.dp).clip(CircleShape).background(MaterialTheme.colorScheme.background),
                contentAlignment = Alignment.Center,
            ) {
                if (first != null) AnimalAvatar(first.animal, first.displayName, 48.dp)
                else AnimalAvatar("cat", null, 48.dp, Modifier.blur(8.dp))
            }
            // The count on a heart, bottom right.
            Box(
                Modifier.align(Alignment.BottomEnd).size(24.dp).clip(CircleShape).background(LikePink)
                    .border(2.dp, MaterialTheme.colorScheme.background, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(if (count > 99) "99+" else count.toString(), style = MaterialTheme.typography.labelSmall, color = Color.White, maxLines = 1)
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(
            stringResource(R.string.likes_short), style = MaterialTheme.typography.labelMedium, color = LikePink,
            maxLines = 1, overflow = TextOverflow.Ellipsis,
        )
    }
    if (open) androidx.compose.material3.ModalBottomSheet(onDismissRequest = { open = false }) {
        Column(Modifier.fillMaxWidth().padding(start = 20.dp, end = 20.dp, bottom = 24.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Favorite, null, tint = LikePink, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(pluralStringResource(R.plurals.people_liked_you, count, count), style = MaterialTheme.typography.titleMedium)
            }
            Spacer(Modifier.height(12.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(likes.people, key = { it.clientId }) { p ->
                    Column(
                        Modifier.width(64.dp).clip(RoundedCornerShape(12.dp)).clickable { open = false; onPerson(p) },
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        AnimalAvatar(p.animal, p.displayName, 52.dp)
                        Text(p.displayName, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
    }
}
