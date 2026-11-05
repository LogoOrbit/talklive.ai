package app.talklive.ui.engage

import androidx.compose.animation.fadeOut
import androidx.compose.animation.fadeIn
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.expandVertically
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.material.icons.rounded.Search
import androidx.compose.ui.focus.focusRequester
import androidx.compose.material.icons.rounded.Check
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.rounded.Male
import androidx.compose.material.icons.rounded.Female
import androidx.compose.material.icons.rounded.Groups
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
            val lost = s.count == 0 && s.restorable && s.lostCount >= 2
            Text(if (s.doneToday) "🔥" else if (lost) "💔" else "🕯️", style = MaterialTheme.typography.labelLarge)
            Spacer(Modifier.width(4.dp))
            Text(if (lost) s.lostCount.toString() else s.count.toString(), style = MaterialTheme.typography.labelLarge, color = if (s.doneToday) Color(0xFFC2410C) else MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** Streak, week and passport in one sheet. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun StreakSheet(engage: Engage, onDismiss: () -> Unit, premium: Boolean = false, restoring: Boolean = false, onRestore: () -> Unit = {}, onPlus: () -> Unit = {}) {
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
            // A streak that just broke: Plus brings it back.
            if (engage.streak.count == 0 && engage.streak.lostCount >= 2 && engage.streak.restorable) {
                Spacer(Modifier.height(16.dp))
                Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text(stringResource(R.string.streak_lost_title, engage.streak.lostCount), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                        Text(stringResource(R.string.streak_lost_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp, bottom = 12.dp))
                        PrimaryButton(
                            stringResource(if (premium) R.string.streak_restore else R.string.streak_restore_plus),
                            onClick = { if (premium) onRestore() else onPlus() },
                            loading = restoring,
                        )
                    }
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
    // Three boxes; tapping one opens the search for that box.
    var slots by remember { mutableStateOf(List(3) { current.getOrNull(it) }) }
    var active by remember { mutableStateOf<Int?>(null) }
    var query by rememberSaveable { mutableStateOf("") }
    val focus = remember { androidx.compose.ui.focus.FocusRequester() }
    val keyboard = androidx.compose.ui.platform.LocalSoftwareKeyboardController.current
    LaunchedEffect(active) {
        if (active != null) { kotlinx.coroutines.delay(120); runCatching { focus.requestFocus() }; keyboard?.show() }
    }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(horizontal = 20.dp).padding(bottom = 20.dp)) {
            Text(stringResource(R.string.fav_films), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
            Text(stringResource(R.string.fav_films_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                slots.forEachIndexed { i, f ->
                    val selected = active == i
                    val scale by animateFloatAsState(if (selected) 1.04f else 1f, spring(dampingRatio = 0.55f), label = "slot")
                    Box(
                        Modifier.weight(1f).aspectRatio(2f / 3f).graphicsLayer { scaleX = scale; scaleY = scale }
                            .clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surface)
                            .border(2.dp, if (selected) app.talklive.ui.components.BrandGradient else androidx.compose.ui.graphics.SolidColor(Color.Transparent), RoundedCornerShape(14.dp))
                            .clickable { active = if (selected) null else i; query = ""; vm.search("") },
                        contentAlignment = Alignment.Center,
                    ) {
                        if (f != null) {
                            AsyncImage(f.art.replace("100x100bb", "300x300bb"), f.title, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                            Box(
                                Modifier.align(Alignment.TopEnd).padding(5.dp).size(24.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.6f))
                                    .clickable { slots = slots.toMutableList().also { it[i] = null } },
                                contentAlignment = Alignment.Center,
                            ) { Icon(Icons.Rounded.Close, null, tint = Color.White, modifier = Modifier.size(16.dp)) }
                        } else Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Rounded.Add, null, tint = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("${i + 1}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
            // The search, for the box being filled.
            AnimatedVisibility(active != null, enter = expandVertically() + fadeIn(), exit = shrinkVertically() + fadeOut()) {
                Column(Modifier.padding(top = 16.dp)) {
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).padding(horizontal = 14.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Rounded.Search, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(10.dp))
                        Box(Modifier.weight(1f).padding(vertical = 12.dp)) {
                            if (query.isEmpty()) Text(stringResource(R.string.search_films), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            androidx.compose.foundation.text.BasicTextField(
                                query, { query = it; vm.search(it) }, singleLine = true,
                                textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
                                cursorBrush = androidx.compose.ui.graphics.SolidColor(MaterialTheme.colorScheme.primary),
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(imeAction = ImeAction.Search),
                                modifier = Modifier.fillMaxWidth().focusRequester(focus),
                            )
                        }
                        if (query.isNotEmpty()) IconButton(onClick = { query = ""; vm.search("") }) { Icon(Icons.Rounded.Close, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                    Box(Modifier.fillMaxWidth().heightIn(min = 60.dp, max = 280.dp)) {
                        if (vm.searching) CircularProgressIndicator(Modifier.align(Alignment.Center).size(28.dp))
                        else if (query.isNotBlank() && vm.results.isEmpty() && vm.searched) Text(stringResource(R.string.films_none), color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.align(Alignment.Center))
                        LazyColumn(Modifier.padding(top = 6.dp)) {
                            items(vm.results, key = { "${it.type}${it.id}" }) { f ->
                                val chosen = slots.any { it != null && it.type == f.type && it.id == f.id }
                                Row(
                                    Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable(enabled = !chosen) {
                                        val at = active ?: slots.indexOfFirst { it == null }.takeIf { it >= 0 } ?: return@clickable
                                        slots = slots.toMutableList().also { it[at] = f }
                                        active = null; query = ""; vm.search(""); keyboard?.hide()
                                    }.padding(horizontal = 4.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    AsyncImage(f.art, f.title, contentScale = ContentScale.Crop, modifier = Modifier.width(40.dp).aspectRatio(2f / 3f).clip(RoundedCornerShape(6.dp)))
                                    Spacer(Modifier.width(12.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(f.title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Text(listOf(if (f.type == "tv") "TV show" else "Film", f.year).filter { it.isNotBlank() }.joinToString(" · "), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    if (chosen) Icon(Icons.Rounded.Check, null, tint = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                }
            }
            ErrorBanner(vm.error)
            Spacer(Modifier.height(16.dp))
            PrimaryButton(stringResource(R.string.save), onClick = { vm.saveFilms(slots.filterNotNull(), onDismiss) }, loading = vm.busy)
            Text(stringResource(R.string.apple_credit), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
        }
    }
}

private fun Modifier.matchParentSizeCompat() = this.fillMaxWidth().aspectRatio(2f / 3f)

/**
 * Match filters, in three plain cards: what you are into, where people are
 * from, and who you meet. At most three suggestions anywhere, every section
 * has its own Clear, and Clear all sits next to Apply.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun FiltersSheet(current: Filters, premium: Boolean, onApply: (Filters) -> Unit, onDismiss: () -> Unit, onPlus: () -> Unit = {}, loadCounts: suspend () -> Map<String, Int> = { emptyMap() }) {
    val freeCountries = 2 // the website's free limit per list (server FREE_LIMITS)
    var f by remember { mutableStateOf(current) }
    var newInterest by remember { mutableStateOf("") }
    var countryQuery by remember { mutableStateOf("") }
    var avoidMode by remember { mutableStateOf(current.includeCountries.isEmpty() && current.excludeCountries.isNotEmpty()) }
    var pickingCountries by remember { mutableStateOf(false) }
    val countries = remember { Locale.getISOCountries().map { it to countryName(it) }.sortedBy { it.second } }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().imePadding()) {
            Column(Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp)) {
                Text(stringResource(R.string.filters), style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground)
                Text(stringResource(R.string.filters_body), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)

                // 1. Interests
                FilterCard("🎯", stringResource(R.string.interests), stringResource(R.string.filters_interests_hint), onClear = if (f.interests.isNotEmpty()) ({ f = f.copy(interests = emptyList()) }) else null) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.animateContentSize()) {
                        f.interests.forEach { i -> SelectedChip(i) { f = f.copy(interests = f.interests - i) } }
                        SUGGESTED_INTERESTS.filter { it !in f.interests }.take(3).forEach { i ->
                            SuggestChip("+ $i") { f = f.copy(interests = (f.interests + i).take(10)) }
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                    InlineField(newInterest, { newInterest = it.take(24) }, stringResource(R.string.add_interest)) {
                        val v = newInterest.trim().lowercase()
                        if (v.isNotBlank()) f = f.copy(interests = (f.interests + v).distinct().take(10))
                        newInterest = ""
                    }
                }

                // 2. Countries
                val list = if (avoidMode) f.excludeCountries else f.includeCountries
                FilterCard(
                    "🌍", stringResource(R.string.countries_title),
                    if (premium) stringResource(R.string.filters_countries_hint_plus) else stringResource(R.string.filters_countries_hint, freeCountries),
                    onClear = if (f.includeCountries.isNotEmpty() || f.excludeCountries.isNotEmpty()) ({ f = f.copy(includeCountries = emptyList(), excludeCountries = emptyList()) }) else null,
                ) {
                    Segmented(listOf(stringResource(R.string.countries_only), stringResource(R.string.countries_never)), if (avoidMode) 1 else 0) { avoidMode = it == 1 }
                    Spacer(Modifier.height(10.dp))
                    if (list.isEmpty()) Text(stringResource(R.string.any_country), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    else FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        list.forEach { cc ->
                            SelectedChip("${flag(cc) ?: ""} ${countryName(cc)}") {
                                f = if (avoidMode) f.copy(excludeCountries = f.excludeCountries - cc) else f.copy(includeCountries = f.includeCountries - cc)
                            }
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    // Opens a searchable list where several countries can be ticked at once.
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.background)
                            .clickable { pickingCountries = true }.padding(horizontal = 14.dp, vertical = 13.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Rounded.Add, null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.width(10.dp))
                        Text(stringResource(R.string.add_countries), color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                        Text(if (premium) "${list.size}" else "${list.size}/$freeCountries", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }

                // 3. Who you meet
                FilterCard(
                    "💜", stringResource(R.string.match_with), if (premium) null else stringResource(R.string.filters_gender_hint),
                    onClear = if (f.prefGender != "any") ({ f = f.copy(prefGender = "any") }) else null,
                ) {
                    GenderPicker(f.prefGender, premium) { g -> if (premium || g == "any") f = f.copy(prefGender = g) else onPlus() }
                }
                Spacer(Modifier.height(12.dp))
            }
            // Always in reach.
            Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                if (f.activeCount > 0) {
                    TextButton(onClick = { f = Filters(); countryQuery = ""; newInterest = "" }) { Text(stringResource(R.string.clear_all)) }
                    Spacer(Modifier.width(8.dp))
                }
                PrimaryButton(
                    if (f.activeCount > 0) stringResource(R.string.apply_filters_n, f.activeCount) else stringResource(R.string.apply_filters),
                    onClick = { onApply(f); onDismiss() }, modifier = Modifier.weight(1f),
                )
            }
        }
    }
    if (pickingCountries) CountryPicker(
        title = stringResource(if (avoidMode) R.string.countries_never else R.string.countries_only),
        countries = countries,
        selected = if (avoidMode) f.excludeCountries else f.includeCountries,
        limit = if (premium) null else freeCountries,
        onLimit = { pickingCountries = false; onPlus() },
        onDone = { picked ->
            f = if (avoidMode) f.copy(excludeCountries = picked, includeCountries = f.includeCountries - picked.toSet())
            else f.copy(includeCountries = picked, excludeCountries = f.excludeCountries - picked.toSet())
            pickingCountries = false
        },
        onDismiss = { pickingCountries = false },
        loadCounts = loadCounts,
    )
}

/** A full list of countries with search; tick as many as allowed, then Done. */
@Composable
private fun CountryPicker(
    title: String,
    countries: List<Pair<String, String>>,
    selected: List<String>,
    limit: Int?,
    onLimit: () -> Unit,
    onDone: (List<String>) -> Unit,
    onDismiss: () -> Unit,
    loadCounts: suspend () -> Map<String, Int> = { emptyMap() },
) {
    var picked by remember { mutableStateOf(selected) }
    // Who is online where, so busy countries come first (like the website).
    var counts by remember { mutableStateOf<Map<String, Int>>(emptyMap()) }
    LaunchedEffect(Unit) { counts = loadCounts() }
    var query by remember { mutableStateOf("") }
    androidx.compose.ui.window.Dialog(onDismissRequest = onDismiss, properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(shape = RoundedCornerShape(28.dp), color = MaterialTheme.colorScheme.background, modifier = Modifier.fillMaxWidth(0.92f).fillMaxHeight(0.82f)) {
            Column(Modifier.padding(top = 20.dp)) {
                Row(Modifier.padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(title, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
                    Text(if (limit != null) "${picked.size}/$limit" else "${picked.size}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                }
                Spacer(Modifier.height(12.dp))
                Box(Modifier.padding(horizontal = 16.dp)) { InlineField(query, { query = it }, stringResource(R.string.find_country), onDone = null) }
                val shown = remember(query, countries, counts) {
                    countries.filter { query.isBlank() || it.second.contains(query, ignoreCase = true) || it.first.equals(query, ignoreCase = true) }
                        .sortedByDescending { counts[it.first] ?: 0 }
                }
                androidx.compose.foundation.lazy.LazyColumn(Modifier.weight(1f).padding(top = 8.dp)) {
                    items(shown.size) { idx ->
                        val (cc, name) = shown[idx]
                        val on = cc in picked
                        Row(
                            Modifier.fillMaxWidth().clickable {
                                picked = when {
                                    on -> picked - cc
                                    limit != null && picked.size >= limit -> { onLimit(); picked }
                                    else -> picked + cc
                                }
                            }.padding(horizontal = 20.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(flag(cc) ?: "🏳️", fontSize = 22.sp)
                            Spacer(Modifier.width(14.dp))
                            Text(name, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                            counts[cc]?.takeIf { it > 0 }?.let { n ->
                                Text(stringResource(R.string.n_online, n), style = MaterialTheme.typography.labelMedium, color = app.talklive.ui.theme.Success, modifier = Modifier.padding(end = 12.dp))
                            }
                            Box(
                                Modifier.size(24.dp).clip(CircleShape)
                                    .background(if (on) app.talklive.ui.components.BrandGradient else androidx.compose.ui.graphics.SolidColor(Color.Transparent))
                                    .border(1.5.dp, if (on) Color.Transparent else MaterialTheme.colorScheme.outline, CircleShape),
                                contentAlignment = Alignment.Center,
                            ) { if (on) Icon(Icons.Rounded.Check, null, tint = Color.White, modifier = Modifier.size(16.dp)) }
                        }
                    }
                }
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) }
                    Spacer(Modifier.width(8.dp))
                    PrimaryButton(stringResource(R.string.done), onClick = { onDone(picked) }, modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun FilterCard(emoji: String, title: String, hint: String?, onClear: (() -> Unit)?, content: @Composable () -> Unit) {
    Surface(shape = RoundedCornerShape(22.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth().padding(top = 14.dp)) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(emoji, fontSize = 20.sp)
                Spacer(Modifier.width(10.dp))
                Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                if (onClear != null) Text(
                    stringResource(R.string.clear), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.clip(CircleShape).clickable(onClick = onClear).padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }
            hint?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp)) }
            Spacer(Modifier.height(12.dp))
            content()
        }
    }
}

@Composable
private fun SelectedChip(label: String, onRemove: () -> Unit) {
    Row(
        Modifier.clip(CircleShape).background(app.talklive.ui.components.BrandGradient).clickable(onClick = onRemove).padding(start = 12.dp, end = 8.dp, top = 7.dp, bottom = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, color = Color.White, style = MaterialTheme.typography.labelLarge)
        Spacer(Modifier.width(4.dp))
        Icon(Icons.Rounded.Close, null, tint = Color.White, modifier = Modifier.size(16.dp))
    }
}

@Composable
private fun SuggestChip(label: String, onClick: () -> Unit) {
    Text(
        label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.clip(CircleShape).border(1.dp, MaterialTheme.colorScheme.outline, CircleShape).clickable(onClick = onClick).padding(horizontal = 12.dp, vertical = 7.dp),
    )
}

@Composable
private fun InlineField(value: String, onChange: (String) -> Unit, hint: String, onDone: (() -> Unit)?) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.background).padding(start = 14.dp, end = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.weight(1f).padding(vertical = 13.dp)) {
            if (value.isEmpty()) Text(hint, color = MaterialTheme.colorScheme.onSurfaceVariant)
            androidx.compose.foundation.text.BasicTextField(
                value, onChange, singleLine = true,
                textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
                cursorBrush = androidx.compose.ui.graphics.SolidColor(MaterialTheme.colorScheme.primary),
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(imeAction = if (onDone != null) ImeAction.Done else ImeAction.Search),
                keyboardActions = androidx.compose.foundation.text.KeyboardActions(onDone = { onDone?.invoke() }),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        if (onDone != null && value.isNotBlank()) IconButton(onClick = onDone) { Icon(Icons.Rounded.Add, null, tint = MaterialTheme.colorScheme.primary) }
    }
}

/**
 * Who to meet, readable without reading: a colour and a symbol for each
 * (pink female sign for women, blue male sign for men, a group for anyone).
 */
@Composable
private fun GenderPicker(selected: String, premium: Boolean, onPick: (String) -> Unit) {
    data class Opt(val id: String, val label: Int, val icon: androidx.compose.ui.graphics.vector.ImageVector, val color: Color)
    val opts = listOf(
        Opt("any", R.string.anyone, Icons.Rounded.Groups, Color(0xFF8B5CF6)),
        Opt("female", R.string.women, Icons.Rounded.Female, Color(0xFFEC4899)),
        Opt("male", R.string.men, Icons.Rounded.Male, Color(0xFF3B82F6)),
    )
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        opts.forEach { o ->
            val on = selected == o.id
            val locked = !premium && o.id != "any"
            val border by androidx.compose.animation.animateColorAsState(if (on) o.color else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f), label = "b")
            Column(
                Modifier.weight(1f).clip(RoundedCornerShape(18.dp))
                    .background(if (on) o.color.copy(alpha = 0.16f) else MaterialTheme.colorScheme.background)
                    .border(2.dp, border, RoundedCornerShape(18.dp))
                    .clickable { app.talklive.sound.Tap.soft(); onPick(o.id) }
                    .padding(vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box {
                    Box(Modifier.size(48.dp).clip(CircleShape).background(o.color), contentAlignment = Alignment.Center) {
                        Icon(o.icon, null, tint = Color.White, modifier = Modifier.size(30.dp))
                    }
                    if (locked) Box(
                        Modifier.align(Alignment.BottomEnd).size(20.dp).clip(CircleShape).background(Color(0xFFF2C14E)),
                        contentAlignment = Alignment.Center,
                    ) { Icon(Icons.Rounded.Lock, null, tint = Color(0xFF2B1D00), modifier = Modifier.size(12.dp)) }
                    if (on) Box(
                        Modifier.align(Alignment.TopEnd).size(20.dp).clip(CircleShape).background(Color.White),
                        contentAlignment = Alignment.Center,
                    ) { Icon(Icons.Rounded.Check, null, tint = o.color, modifier = Modifier.size(14.dp)) }
                }
                Spacer(Modifier.height(8.dp))
                Text(stringResource(o.label), style = MaterialTheme.typography.labelLarge, color = if (on) o.color else MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}

@Composable
private fun Segmented(options: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    Row(Modifier.fillMaxWidth().clip(CircleShape).background(MaterialTheme.colorScheme.background).padding(4.dp)) {
        options.forEachIndexed { i, label ->
            val on = i == selected
            Box(
                Modifier.weight(1f).clip(CircleShape)
                    .background(if (on) app.talklive.ui.components.BrandGradient else androidx.compose.ui.graphics.SolidColor(Color.Transparent))
                    .clickable { onSelect(i) }.padding(vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) { Text(label, style = MaterialTheme.typography.labelLarge, color = if (on) Color.White else MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1) }
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


