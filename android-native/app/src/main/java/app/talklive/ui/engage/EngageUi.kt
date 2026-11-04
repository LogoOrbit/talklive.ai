package app.talklive.ui.engage

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.engage.Engage
import app.talklive.engage.Film
import app.talklive.engage.Filters
import app.talklive.ui.animals.AnimalAvatar
import app.talklive.ui.components.ErrorBanner
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.components.TalkTextField
import app.talklive.ui.social.flag
import coil.compose.AsyncImage
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import java.util.Locale

/** "🔥 5" in the home bar; grey until today's call is done. */
@Composable
fun StreakChip(engage: Engage?, onClick: () -> Unit) {
    val s = engage?.streak ?: return
    if (s.count <= 0 && s.best <= 0) return
    Surface(onClick = onClick, shape = CircleShape, color = if (s.doneToday) Color(0xFFFFEDD5) else MaterialTheme.colorScheme.surface) {
        Row(Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(if (s.doneToday) "🔥" else "🕯️", style = MaterialTheme.typography.labelLarge)
            Spacer(Modifier.width(4.dp))
            Text(s.count.toString(), style = MaterialTheme.typography.labelLarge, color = if (s.doneToday) Color(0xFFC2410C) else MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** Streak, week and passport in one sheet. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun StreakSheet(engage: Engage, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 24.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("🔥", style = MaterialTheme.typography.displaySmall)
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(stringResource(R.string.streak_days, engage.streak.count), style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground)
                    Text(
                        if (engage.streak.doneToday) stringResource(R.string.streak_done) else stringResource(R.string.streak_todo),
                        style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Stat(stringResource(R.string.stat_best), engage.streak.best.toString(), Modifier.weight(1f))
                Stat(stringResource(R.string.stat_calls_week), engage.week.calls.toString(), Modifier.weight(1f))
                Stat(stringResource(R.string.stat_countries_week), engage.week.countries.toString(), Modifier.weight(1f))
            }
            Spacer(Modifier.height(20.dp))
            PassportGrid(engage.passport)
        }
    }
}

@Composable
private fun Stat(label: String, value: String, modifier: Modifier) {
    Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surface, modifier = modifier) {
        Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PassportGrid(passport: List<String>) {
    Text(stringResource(R.string.passport_title, passport.size), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
    Spacer(Modifier.height(4.dp))
    Text(stringResource(R.string.passport_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    Spacer(Modifier.height(12.dp))
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        passport.forEach { cc ->
            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface) {
                Column(Modifier.padding(horizontal = 10.dp, vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(flag(cc) ?: "🏳️", style = MaterialTheme.typography.headlineSmall)
                    Text(countryName(cc), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                }
            }
        }
    }
}

fun countryName(cc: String): String = Locale("", cc).getDisplayCountry(Locale.getDefault()).ifBlank { cc }

/** Up to three posters, e.g. on the stranger's call card. */
@Composable
fun FilmPosters(films: List<Film>, size: androidx.compose.ui.unit.Dp = 56.dp, onClick: ((Film) -> Unit)? = null) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        films.take(3).forEach { f ->
            AsyncImage(
                model = f.art.replace("100x100bb", "300x300bb"), contentDescription = f.title, contentScale = ContentScale.Crop,
                modifier = Modifier.width(size).aspectRatio(2f / 3f).clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .then(if (onClick != null) Modifier.clickable { onClick(f) } else Modifier),
            )
        }
    }
}

/** Pick up to three favourite films and shows. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FilmsSheet(vm: EngageViewModel, current: List<Film>, onDismiss: () -> Unit) {
    var picks by remember { mutableStateOf(current) }
    var query by rememberSaveable { mutableStateOf("") }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(horizontal = 20.dp).padding(bottom = 20.dp)) {
            Text(stringResource(R.string.fav_films), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
            Text(stringResource(R.string.fav_films_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                repeat(3) { i ->
                    val f = picks.getOrNull(i)
                    Box(Modifier.width(84.dp).aspectRatio(2f / 3f).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surface), contentAlignment = Alignment.Center) {
                        if (f != null) {
                            AsyncImage(f.art.replace("100x100bb", "300x300bb"), f.title, contentScale = ContentScale.Crop, modifier = Modifier.matchParentSizeCompat())
                            Box(Modifier.align(Alignment.TopEnd).padding(4.dp).size(24.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.6f)).clickable { picks = picks - f }, contentAlignment = Alignment.Center) {
                                Icon(Icons.Rounded.Close, null, tint = Color.White, modifier = Modifier.size(16.dp))
                            }
                        } else Icon(Icons.Rounded.Add, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
            TalkTextField(query, { query = it; vm.search(it) }, stringResource(R.string.search_films), imeAction = ImeAction.Search)
            Box(Modifier.fillMaxWidth().heightIn(min = 60.dp, max = 300.dp)) {
                if (vm.searching) CircularProgressIndicator(Modifier.align(Alignment.Center).size(28.dp))
                else if (query.isNotBlank() && vm.results.isEmpty() && vm.searched) Text(stringResource(R.string.films_none), color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.align(Alignment.Center))
                LazyColumn {
                    items(vm.results, key = { "${it.type}${it.id}" }) { f ->
                        val chosen = picks.any { it.type == f.type && it.id == f.id }
                        Row(
                            Modifier.fillMaxWidth().clickable(enabled = !chosen && picks.size < 3) { picks = picks + f }.padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            AsyncImage(f.art, f.title, contentScale = ContentScale.Crop, modifier = Modifier.width(40.dp).aspectRatio(2f / 3f).clip(RoundedCornerShape(6.dp)))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(f.title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(listOf(if (f.type == "tv") "TV show" else "Film", f.year).filter { it.isNotBlank() }.joinToString(" · "), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (chosen) Text("✓", color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
            ErrorBanner(vm.error)
            Spacer(Modifier.height(12.dp))
            PrimaryButton(stringResource(R.string.save), onClick = { vm.saveFilms(picks, onDismiss) }, loading = vm.busy)
            Text(stringResource(R.string.apple_credit), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
        }
    }
}

private fun Modifier.matchParentSizeCompat() = this.fillMaxWidth().aspectRatio(2f / 3f)

/** Match filters: interests and countries for everyone, gender with Plus. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun FiltersSheet(current: Filters, premium: Boolean, onApply: (Filters) -> Unit, onDismiss: () -> Unit, onPlus: () -> Unit = {}) {
    val freeCountries = 2 // the website's free limit per list (server FREE_LIMITS)
    var f by remember { mutableStateOf(current) }
    var newInterest by remember { mutableStateOf("") }
    var countryQuery by remember { mutableStateOf("") }
    val countries = remember { Locale.getISOCountries().map { it to countryName(it) }.sortedBy { it.second } }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(horizontal = 20.dp).padding(bottom = 20.dp).verticalScroll(rememberScrollState())) {
            Text(stringResource(R.string.filters), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
            Text(stringResource(R.string.filters_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)

            Label(stringResource(R.string.interests))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.animateContentSize()) {
                (SUGGESTED_INTERESTS + f.interests).distinct().forEach { i ->
                    val on = i in f.interests
                    FilterChip(
                        selected = on,
                        onClick = { f = f.copy(interests = if (on) f.interests - i else (f.interests + i).take(10)) },
                        label = { Text(i) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primaryContainer),
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(newInterest, { newInterest = it.take(24) }, Modifier.weight(1f), placeholder = { Text(stringResource(R.string.add_interest)) }, singleLine = true, shape = MaterialTheme.shapes.medium)
                IconButton(onClick = {
                    val v = newInterest.trim().lowercase()
                    if (v.isNotBlank()) f = f.copy(interests = (f.interests + v).distinct().take(10))
                    newInterest = ""
                }) { Icon(Icons.Rounded.Add, null) }
            }

            Label(stringResource(R.string.countries_include))
            CountryChips(f.includeCountries) { cc -> f = f.copy(includeCountries = f.includeCountries - cc) }
            Label(stringResource(R.string.countries_exclude))
            CountryChips(f.excludeCountries) { cc -> f = f.copy(excludeCountries = f.excludeCountries - cc) }
            OutlinedTextField(countryQuery, { countryQuery = it }, Modifier.fillMaxWidth(), placeholder = { Text(stringResource(R.string.find_country)) }, singleLine = true, shape = MaterialTheme.shapes.medium)
            if (countryQuery.isNotBlank()) {
                countries.filter { it.second.contains(countryQuery, ignoreCase = true) }.take(5).forEach { (cc, name) ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("${flag(cc) ?: ""}  $name", modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.onBackground)
                        TextButton(onClick = { if (!premium && f.includeCountries.size >= freeCountries) onPlus() else { f = f.copy(includeCountries = (f.includeCountries + cc).distinct(), excludeCountries = f.excludeCountries - cc); countryQuery = "" } }) { Text(stringResource(R.string.include)) }
                        TextButton(onClick = { if (!premium && f.excludeCountries.size >= freeCountries) onPlus() else { f = f.copy(excludeCountries = (f.excludeCountries + cc).distinct(), includeCountries = f.includeCountries - cc); countryQuery = "" } }) { Text(stringResource(R.string.avoid)) }
                    }
                }
            }

            Label(stringResource(R.string.match_with) + if (premium) "" else "  🔒 Plus")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("any" to R.string.anyone, "female" to R.string.women, "male" to R.string.men).forEach { (g, label) ->
                    FilterChip(
                        selected = f.prefGender == g,
                        onClick = { if (premium || g == "any") f = f.copy(prefGender = g) else onPlus() },
                        label = { Text(stringResource(label)) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primaryContainer),
                    )
                }
            }
            Spacer(Modifier.height(20.dp))
            PrimaryButton(stringResource(R.string.apply_filters), onClick = { onApply(f); onDismiss() })
            if (f.activeCount > 0) {
                TextButton(onClick = { onApply(Filters()); onDismiss() }, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text(stringResource(R.string.clear_filters)) }
            }
        }
    }
}

private val SUGGESTED_INTERESTS = listOf("music", "movies", "gaming", "travel", "sports", "anime", "books", "language exchange", "tech", "art")

@Composable
private fun Label(text: String) {
    Text(text, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(top = 18.dp, bottom = 8.dp))
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CountryChips(list: List<String>, onRemove: (String) -> Unit) {
    if (list.isEmpty()) {
        Text(stringResource(R.string.any_country), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        return
    }
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        list.forEach { cc ->
            FilterChip(selected = true, onClick = { onRemove(cc) }, label = { Text("${flag(cc) ?: ""} ${countryName(cc)}") }, trailingIcon = { Icon(Icons.Rounded.Close, null, Modifier.size(16.dp)) })
        }
    }
}

/** Who hearted you. Plus shows names; everyone sees the count. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LikesSheet(vm: EngageViewModel, onPlus: (() -> Unit)? = null, onDismiss: () -> Unit) {
    LaunchedEffect(Unit) { vm.loadLikes() }
    val likes = vm.likes
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 24.dp)) {
            Text(stringResource(R.string.likes_title, likes?.count ?: 0), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.height(12.dp))
            when {
                likes == null -> CircularProgressIndicator(Modifier.size(28.dp))
                likes.count == 0 -> Text(stringResource(R.string.likes_empty), color = MaterialTheme.colorScheme.onSurfaceVariant)
                likes.locked -> {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Lock, null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.width(10.dp))
                        Text(stringResource(R.string.likes_locked, likes.countries.mapNotNull { flag(it) }.joinToString(" ")), color = MaterialTheme.colorScheme.onBackground)
                    }
                    if (onPlus != null) {
                        Spacer(Modifier.height(14.dp))
                        PrimaryButton(stringResource(R.string.plus_get), onClick = onPlus)
                    }
                }
                else -> likes.list.forEach { l ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        AnimalAvatar(null, l.username, 40.dp)
                        Spacer(Modifier.width(12.dp))
                        Text("${l.username}  ${flag(l.countryCode) ?: ""}", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
                        if (l.online) Text(stringResource(R.string.online), color = app.talklive.ui.theme.Success, style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }
    }
}

/** Invite friends: progress toward the free Plus reward and a share button. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InviteSheet(vm: EngageViewModel, onDismiss: () -> Unit) {
    val ref by vm.referral.collectAsStateWithLifecycle()
    val context = LocalContext.current
    LaunchedEffect(Unit) { vm.requestReferral() }
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 24.dp)) {
            Text(stringResource(R.string.invite_title), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
            Text(stringResource(R.string.invite_body, ref?.needed ?: 3), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(16.dp))
            ref?.let { r ->
                LinearProgressIndicator(
                    progress = { r.progress / r.needed.toFloat().coerceAtLeast(1f) },
                    modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape),
                    color = MaterialTheme.colorScheme.primary, trackColor = MaterialTheme.colorScheme.surfaceVariant, drawStopIndicator = {},
                )
                Spacer(Modifier.height(8.dp))
                Text(stringResource(R.string.invite_progress, r.progress, r.needed, r.verified, r.rewardedHours), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(16.dp))
                PrimaryButton(stringResource(R.string.share_link), icon = Icons.Rounded.Share, onClick = {
                    context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, context.getString(R.string.invite_share_text, r.link)), null))
                })
            } ?: CircularProgressIndicator(Modifier.size(28.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedbackSheet(onSend: (String) -> Unit, onDismiss: () -> Unit) {
    var text by rememberSaveable { mutableStateOf("") }
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(horizontal = 20.dp).padding(bottom = 24.dp)) {
            Text(stringResource(R.string.feedback_title), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
            Text(stringResource(R.string.feedback_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(text, { text = it.take(1000) }, Modifier.fillMaxWidth().heightIn(min = 140.dp), placeholder = { Text(stringResource(R.string.feedback_hint)) }, shape = MaterialTheme.shapes.medium)
            Spacer(Modifier.height(16.dp))
            PrimaryButton(stringResource(R.string.send), onClick = { onSend(text); onDismiss() }, enabled = text.isNotBlank())
        }
    }
}


