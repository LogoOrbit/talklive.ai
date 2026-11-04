package app.talklive.ui.profile

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.Public
import androidx.compose.material.icons.rounded.Movie
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.CardGiftcard
import androidx.compose.material.icons.rounded.WorkspacePremium
import androidx.compose.material.icons.rounded.Feedback
import androidx.compose.material.icons.rounded.SupportAgent
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.Tag
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Gavel
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Key
import androidx.compose.material.icons.rounded.Mail
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PrivacyTip
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.talklive.BuildConfig
import app.talklive.R
import app.talklive.ui.animals.AnimalAvatar
import app.talklive.ui.animals.AnimalCaption
import app.talklive.ui.animals.AnimalGrid
import app.talklive.ui.animals.animalById
import app.talklive.ui.components.BrandGradient
import app.talklive.ui.components.ErrorBanner
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.components.TalkTextField
import app.talklive.ui.theme.Danger

@Composable
fun ProfileScreen(
    onSignIn: () -> Unit,
    vm: ProfileViewModel = hiltViewModel(),
    engageVm: app.talklive.ui.engage.EngageViewModel = hiltViewModel(),
) {
    val account by vm.account.collectAsStateWithLifecycle()
    val animal by vm.animal.collectAsStateWithLifecycle()
    val dark by vm.dark.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(vm.saved) {
        vm.saved?.let { snackbar.showSnackbar(it); vm.saved = null }
    }
    fun open(page: String) = context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("${app.talklive.net.ServerConfig.url}/$page")))

    Box(Modifier.fillMaxSize()) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).statusBarsPadding().padding(horizontal = 20.dp, vertical = 8.dp),
        ) {
            Text(
                stringResource(R.string.tab_profile),
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(start = 4.dp, top = 8.dp, bottom = 16.dp),
            )

            // Identity card.
            Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface) {
                Column(Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(contentAlignment = Alignment.BottomEnd) {
                        AnimalAvatar(animal, account?.nickname, 104.dp, Modifier.clip(CircleShape).clickable { vm.open(ProfileSheet.Animal) })
                        Box(
                            Modifier.size(32.dp).clip(CircleShape).background(BrandGradient)
                                .clickable { vm.open(ProfileSheet.Animal) },
                            contentAlignment = Alignment.Center,
                        ) { Icon(Icons.Rounded.Edit, null, tint = Color.White, modifier = Modifier.size(16.dp)) }
                    }
                    Spacer(Modifier.height(12.dp))
                    Text(
                        account?.nickname ?: stringResource(R.string.guest),
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        account?.let { "@${it.username}" } ?: (animalById(animal)?.trait ?: ""),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (account == null) {
                        Spacer(Modifier.height(16.dp))
                        Text(
                            stringResource(R.string.guest_pitch),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.height(12.dp))
                        PrimaryButton(stringResource(R.string.sign_in_or_create), onClick = onSignIn)
                    }
                }
            }

            val engage by engageVm.engage.collectAsStateWithLifecycle()
            val films by engageVm.films.collectAsStateWithLifecycle()
            val premium by engageVm.premium.collectAsStateWithLifecycle()
            var youSheet by remember { mutableStateOf<String?>(null) }
            Section(stringResource(R.string.section_you)) {
                SettingRow(Icons.Rounded.Public, stringResource(R.string.passport), stringResource(R.string.passport_count, engage?.passport?.size ?: 0)) { youSheet = "passport" }
                SettingRow(Icons.Rounded.Movie, stringResource(R.string.fav_films), if (films.isEmpty()) stringResource(R.string.not_set) else films.joinToString(", ") { it.title }) { youSheet = "films" }
                SettingRow(Icons.Rounded.Favorite, stringResource(R.string.likes), null) { youSheet = "likes" }
                SettingRow(Icons.Rounded.CardGiftcard, stringResource(R.string.invite_title), null) { youSheet = "invite" }
                SettingRow(
                    Icons.Rounded.WorkspacePremium, stringResource(R.string.plus),
                    when {
                        !premium.active -> stringResource(R.string.plus_inactive)
                        premium.expiresAt != null -> stringResource(R.string.plus_until, java.text.DateFormat.getDateInstance().format(java.util.Date(premium.expiresAt!!)))
                        else -> stringResource(R.string.plus_active)
                    },
                ) { youSheet = "plus" }
            }
            when (youSheet) {
                "passport" -> engage?.let { app.talklive.ui.engage.StreakSheet(it) { youSheet = null } } ?: run { youSheet = null }
                "films" -> app.talklive.ui.engage.FilmsSheet(engageVm, films) { youSheet = null }
                "likes" -> app.talklive.ui.engage.LikesSheet(engageVm, onPlus = { youSheet = "plus" }) { youSheet = null }
                "invite" -> app.talklive.ui.engage.InviteSheet(engageVm) { youSheet = null }
                "feedback" -> app.talklive.ui.engage.FeedbackSheet(onSend = { engageVm.sendFeedback(it); vm.saved = context.getString(R.string.feedback_thanks) }) { youSheet = null }
                "support" -> androidx.compose.ui.window.Dialog(
                    onDismissRequest = { youSheet = null },
                    properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
                ) { app.talklive.ui.support.SupportScreen(onBack = { youSheet = null }) }
                "plus" -> app.talklive.ui.engage.PlusSheet(premium, signedIn = account != null, onSignIn = { youSheet = null; onSignIn() }, onDismiss = { youSheet = null })
            }

            if (account != null) {
                Section(stringResource(R.string.section_account)) {
                    SettingRow(Icons.Rounded.Person, stringResource(R.string.display_name), account?.nickname) { vm.open(ProfileSheet.Nickname) }
                    SettingRow(Icons.Rounded.Mail, stringResource(R.string.recovery_email), account?.email?.ifBlank { null } ?: stringResource(R.string.not_set)) {
                        vm.open(ProfileSheet.Email)
                    }
                    SettingRow(Icons.Rounded.Key, stringResource(R.string.change_password), null) { vm.open(ProfileSheet.Password) }
                }
            }

            val hideStatus by vm.hideStatus.collectAsStateWithLifecycle()
            val acceptCalls by vm.acceptCalls.collectAsStateWithLifecycle()
            val blocked by vm.blocked.collectAsStateWithLifecycle()
            val friendId by vm.myFriendId.collectAsStateWithLifecycle()
            Section(stringResource(R.string.section_privacy)) {
                SettingRow(Icons.Rounded.Tag, stringResource(R.string.your_friend_id), friendId ?: "…", onClick = { if (account != null) vm.open(ProfileSheet.FriendId) })
                SettingRow(Icons.Rounded.Visibility, stringResource(R.string.show_online), stringResource(R.string.show_online_desc), onClick = { vm.setHideStatus(!hideStatus) }, trailing = {
                    Switch(checked = !hideStatus, onCheckedChange = { vm.setHideStatus(!it) }, colors = SwitchDefaults.colors(checkedTrackColor = MaterialTheme.colorScheme.primary))
                })
                SettingRow(Icons.Rounded.Call, stringResource(R.string.allow_calls), stringResource(R.string.allow_calls_desc), onClick = { vm.setAcceptCalls(!acceptCalls) }, trailing = {
                    Switch(checked = acceptCalls, onCheckedChange = { vm.setAcceptCalls(it) }, colors = SwitchDefaults.colors(checkedTrackColor = MaterialTheme.colorScheme.primary))
                })
                SettingRow(Icons.Rounded.Block, stringResource(R.string.blocked_people), if (blocked.isEmpty()) stringResource(R.string.none) else blocked.size.toString()) {
                    vm.open(ProfileSheet.Blocked)
                }
            }

            Section(stringResource(R.string.section_appearance)) {
                SettingRow(Icons.Rounded.DarkMode, stringResource(R.string.dark_mode), null, onClick = vm::toggleTheme, trailing = {
                    Switch(
                        checked = dark,
                        onCheckedChange = { vm.toggleTheme() },
                        colors = SwitchDefaults.colors(checkedTrackColor = MaterialTheme.colorScheme.primary),
                    )
                })
            }

            Section(stringResource(R.string.section_safety)) {
                SettingRow(Icons.Rounded.SupportAgent, stringResource(R.string.support_title), stringResource(R.string.support_row)) { youSheet = "support" }
                SettingRow(Icons.Rounded.Feedback, stringResource(R.string.feedback_title), null) { youSheet = "feedback" }
                SettingRow(Icons.Rounded.Shield, stringResource(R.string.safety_tips), null) { open("safety") }
                SettingRow(Icons.Rounded.Groups, stringResource(R.string.community_guidelines), null) { open("community-guidelines") }
                SettingRow(Icons.Rounded.PrivacyTip, stringResource(R.string.privacy_policy), null) { open("privacy") }
                SettingRow(Icons.Rounded.Gavel, stringResource(R.string.terms), null) { open("terms") }
            }

            if (account != null) {
                Spacer(Modifier.height(16.dp))
                Surface(
                    onClick = vm::signOut,
                    shape = MaterialTheme.shapes.large,
                    color = MaterialTheme.colorScheme.surface,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.AutoMirrored.Rounded.Logout, null, tint = Danger)
                        Spacer(Modifier.size(14.dp))
                        Text(stringResource(R.string.sign_out), style = MaterialTheme.typography.titleMedium, color = Danger)
                    }
                }
            }

            Text(
                "TalkLive ${BuildConfig.VERSION_NAME}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally).padding(vertical = 24.dp),
            )
        }
        SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter))
    }

    vm.sheet?.let { sheet -> ProfileSheetHost(sheet, vm, animal) }
}

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Text(
        title.uppercase(),
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(start = 8.dp, top = 24.dp, bottom = 8.dp),
    )
    Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface) {
        Column { content() }
    }
}

@Composable
private fun SettingRow(
    icon: ImageVector,
    title: String,
    value: String?,
    trailing: (@Composable () -> Unit)? = null,
    onClick: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 60.dp).clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(36.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp)) }
        Spacer(Modifier.size(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            value?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
            }
        }
        if (trailing != null) trailing() else {
            Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfileSheetHost(sheet: ProfileSheet, vm: ProfileViewModel, animal: String?) {
    val state = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val account by vm.account.collectAsStateWithLifecycle()
    ModalBottomSheet(onDismissRequest = vm::close, sheetState = state, containerColor = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(horizontal = 20.dp).padding(bottom = 20.dp)) {
            when (sheet) {
                ProfileSheet.Animal -> {
                    var pick by rememberSaveable { mutableStateOf(animal) }
                    SheetTitle(stringResource(R.string.animal_title))
                    AnimalGrid(
                        selected = pick,
                        onSelect = { pick = it },
                        modifier = Modifier.fillMaxWidth().height(380.dp),
                        contentPadding = PaddingValues(vertical = 8.dp),
                    )
                    AnimalCaption(pick, Modifier.padding(vertical = 12.dp))
                    PrimaryButton(stringResource(R.string.save), onClick = { pick?.let(vm::setAnimal) }, enabled = pick != null)
                }
                ProfileSheet.Blocked -> {
                    val blocked by vm.blocked.collectAsStateWithLifecycle()
                    SheetTitle(stringResource(R.string.blocked_people), stringResource(R.string.blocked_body))
                    if (blocked.isEmpty()) Text(stringResource(R.string.none), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    blocked.forEach { b ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                            AnimalAvatar(null, b.username, 40.dp)
                            Spacer(Modifier.size(12.dp))
                            Text(b.username, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
                            androidx.compose.material3.TextButton(onClick = { vm.unblock(b.clientId) }) { Text(stringResource(R.string.unblock)) }
                        }
                    }
                }
                ProfileSheet.FriendId -> {
                    val current by vm.myFriendId.collectAsStateWithLifecycle()
                    var handle by rememberSaveable { mutableStateOf(current.orEmpty()) }
                    SheetTitle(stringResource(R.string.your_friend_id), stringResource(R.string.friend_id_body))
                    TalkTextField(handle, { handle = it.take(21) }, stringResource(R.string.your_friend_id), imeAction = ImeAction.Done, onIme = { vm.saveFriendId(handle) })
                    ErrorBanner(vm.error)
                    Spacer(Modifier.height(16.dp))
                    PrimaryButton(stringResource(R.string.save), onClick = { vm.saveFriendId(handle) }, enabled = handle.length >= 3, loading = vm.busy)
                }
                ProfileSheet.Nickname -> {
                    var nick by rememberSaveable { mutableStateOf(account?.nickname.orEmpty()) }
                    SheetTitle(stringResource(R.string.display_name), stringResource(R.string.display_name_body))
                    TalkTextField(nick, { nick = it.take(24) }, stringResource(R.string.display_name), imeAction = ImeAction.Done, onIme = { vm.saveNickname(nick) })
                    ErrorBanner(vm.error)
                    Spacer(Modifier.height(16.dp))
                    PrimaryButton(stringResource(R.string.save), onClick = { vm.saveNickname(nick) }, enabled = nick.isNotBlank(), loading = vm.busy)
                }
                ProfileSheet.Email -> {
                    var email by rememberSaveable { mutableStateOf(account?.email.orEmpty()) }
                    var pass by rememberSaveable { mutableStateOf("") }
                    SheetTitle(stringResource(R.string.recovery_email), stringResource(R.string.recovery_email_body))
                    TalkTextField(email, { email = it }, stringResource(R.string.email), keyboardType = KeyboardType.Email)
                    Spacer(Modifier.height(8.dp))
                    TalkTextField(pass, { pass = it }, stringResource(R.string.current_password), password = true, imeAction = ImeAction.Done)
                    ErrorBanner(vm.error)
                    Spacer(Modifier.height(16.dp))
                    PrimaryButton(
                        stringResource(R.string.save), onClick = { vm.saveEmail(email, pass) },
                        enabled = email.contains('@') && pass.isNotEmpty(), loading = vm.busy,
                    )
                }
                ProfileSheet.Password -> {
                    var current by rememberSaveable { mutableStateOf("") }
                    var new by rememberSaveable { mutableStateOf("") }
                    SheetTitle(stringResource(R.string.change_password))
                    TalkTextField(current, { current = it }, stringResource(R.string.current_password), password = true)
                    Spacer(Modifier.height(8.dp))
                    TalkTextField(
                        new, { new = it }, stringResource(R.string.new_password), password = true,
                        imeAction = ImeAction.Done, supporting = stringResource(R.string.password_hint),
                    )
                    ErrorBanner(vm.error)
                    Spacer(Modifier.height(16.dp))
                    PrimaryButton(
                        stringResource(R.string.save), onClick = { vm.savePassword(current, new) },
                        enabled = current.isNotEmpty() && new.length >= 8, loading = vm.busy,
                    )
                }
            }
        }
    }
}

@Composable
private fun SheetTitle(title: String, body: String? = null) {
    Text(title, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
    body?.let {
        Spacer(Modifier.height(4.dp))
        Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    Spacer(Modifier.height(16.dp))
}

