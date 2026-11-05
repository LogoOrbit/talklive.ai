package app.talklive.ui.profile

import androidx.compose.ui.unit.sp
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.DeleteForever
import androidx.compose.material.icons.rounded.VolumeUp
import androidx.compose.material.icons.rounded.Face
import androidx.compose.material.icons.rounded.Cake
import androidx.compose.material.icons.rounded.GraphicEq
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.rounded.Public
import androidx.compose.material.icons.rounded.Movie
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.CardGiftcard
import androidx.compose.material.icons.rounded.WorkspacePremium
import androidx.compose.material.icons.rounded.Feedback
import androidx.compose.material.icons.rounded.SupportAgent
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material.icons.rounded.ContactMail
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.AllInclusive
import androidx.compose.material.icons.rounded.DoneAll
import androidx.compose.material.icons.rounded.Vibration
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
                        AnimalAvatar(animal, account?.nickname, 104.dp, Modifier.clip(CircleShape).clickable { vm.open(ProfileSheet.Edit) })
                        Box(
                            Modifier.size(32.dp).clip(CircleShape).background(BrandGradient)
                                .clickable { vm.open(ProfileSheet.Edit) },
                            contentAlignment = Alignment.Center,
                        ) { Icon(Icons.Rounded.Edit, null, tint = Color.White, modifier = Modifier.size(16.dp)) }
                    }
                    Spacer(Modifier.height(12.dp))
                    Text(
                        account?.nickname ?: stringResource(R.string.guest),
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable { vm.open(ProfileSheet.Edit) }.padding(horizontal = 6.dp),
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
            // Plus, as a card of its own rather than one more row.
            Spacer(Modifier.height(20.dp))
            Box(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp))
                    .background(androidx.compose.ui.graphics.Brush.linearGradient(
                        if (premium.active) listOf(androidx.compose.ui.graphics.Color(0xFFB8860B), androidx.compose.ui.graphics.Color(0xFFF5C451))
                        else listOf(app.talklive.ui.theme.LocalAccents.current.a, app.talklive.ui.theme.LocalAccents.current.b),
                    ))
                    .clickable { youSheet = "plus" }.padding(18.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("💎", fontSize = 34.sp)
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(stringResource(R.string.plus), style = MaterialTheme.typography.titleLarge, color = androidx.compose.ui.graphics.Color.White)
                        Text(
                            when {
                                !premium.active -> stringResource(R.string.plus_card_pitch)
                                premium.expiresAt != null -> stringResource(R.string.plus_until, java.text.DateFormat.getDateInstance().format(java.util.Date(premium.expiresAt!!)))
                                else -> stringResource(R.string.plus_active)
                            },
                            style = MaterialTheme.typography.bodyMedium, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.9f),
                        )
                    }
                    Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, null, tint = androidx.compose.ui.graphics.Color.White)
                }
            }
            Section(stringResource(R.string.section_you)) {
                SettingRow(Icons.Rounded.Public, stringResource(R.string.passport), stringResource(R.string.passport_count, engage?.passport?.size ?: 0)) { youSheet = "passport" }
                SettingRow(Icons.Rounded.Movie, stringResource(R.string.fav_films), if (films.isEmpty()) stringResource(R.string.not_set) else films.joinToString(", ") { it.title }) { youSheet = "films" }
                SettingRow(Icons.Rounded.Favorite, stringResource(R.string.likes), null) { youSheet = "likes" }
                SettingRow(Icons.Rounded.CardGiftcard, stringResource(R.string.invite_title), null) { youSheet = "invite" }
                val myGender by engageVm.myGender.collectAsStateWithLifecycle()
                val ageGroup by engageVm.ageGroup.collectAsStateWithLifecycle()
                val flags by engageVm.flags.collectAsStateWithLifecycle()
                SettingRow(Icons.Rounded.Face, stringResource(R.string.i_am), genderLabel(myGender)) { youSheet = "gender" }
                SettingRow(Icons.Rounded.Cake, stringResource(R.string.age_group), if (ageGroup == "unspecified") stringResource(R.string.gender_unspecified) else ageGroup) { youSheet = "age" }
                if ("voiceCheck" in flags) {
                    val voiceOn by engageVm.voiceCheck.collectAsStateWithLifecycle()
                    val voiceResult by engageVm.voiceResult.collectAsStateWithLifecycle()
                    SettingRow(
                        Icons.Rounded.GraphicEq, stringResource(R.string.voice_check),
                        when {
                            !voiceOn -> stringResource(R.string.voice_check_desc)
                            voiceResult == null -> stringResource(R.string.voice_check_pending)
                            voiceResult == myGender -> stringResource(R.string.voice_check_confirmed)
                            else -> stringResource(R.string.voice_check_unconfirmed)
                        },
                        onClick = { engageVm.setVoiceCheck(!voiceOn) },
                        trailing = { Switch(checked = voiceOn, onCheckedChange = { engageVm.setVoiceCheck(it) }, colors = SwitchDefaults.colors(checkedTrackColor = MaterialTheme.colorScheme.primary)) },
                    )
                }
            }
            when (youSheet) {
                "passport" -> engage?.let { app.talklive.ui.engage.StreakSheet(it, onDismiss = { youSheet = null }, premium = premium.active, restoring = engageVm.restoring, onRestore = engageVm::restoreStreak, onPlus = { youSheet = "plus" }) } ?: run { youSheet = null }
                "films" -> app.talklive.ui.engage.FilmsSheet(engageVm, films) { youSheet = null }
                "likes" -> app.talklive.ui.engage.LikesSheet(engageVm, onPlus = { youSheet = "plus" }) { youSheet = null }
                "invite" -> app.talklive.ui.engage.InviteSheet(engageVm) { youSheet = null }
                "feedback" -> app.talklive.ui.engage.FeedbackSheet(onSend = { engageVm.sendFeedback(it); vm.saved = context.getString(R.string.feedback_thanks) }) { youSheet = null }
                "support" -> androidx.compose.ui.window.Dialog(
                    onDismissRequest = { youSheet = null },
                    properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
                ) { app.talklive.ui.support.SupportScreen(onBack = { youSheet = null }) }
                "gender" -> ChoiceDialog(stringResource(R.string.i_am), listOf("male", "female", "unspecified"), engageVm.myGender.value, { genderLabel(it) }, { engageVm.setMyGender(it) }) { youSheet = null }
                "age" -> ChoiceDialog(stringResource(R.string.age_group), listOf("18-24", "25-34", "35-44", "45-54", "55+", "unspecified"), engageVm.ageGroup.value, { if (it == "unspecified") stringResource(R.string.gender_unspecified) else it }, { engageVm.setAgeGroup(it) }) { youSheet = null }
                "plus" -> app.talklive.ui.engage.PlusSheet(premium, signedIn = account != null, onSignIn = { youSheet = null; onSignIn() }, onDismiss = { youSheet = null }, onInvite = { youSheet = "invite" })
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
            // Calls: how a call starts and who can ring you.
            Section(stringResource(R.string.section_calls)) {
                val autoConnect by vm.autoConnect.collectAsStateWithLifecycle()
                val speakerDefault by vm.speakerDefault.collectAsStateWithLifecycle()
                val acceptCallsC by vm.acceptCalls.collectAsStateWithLifecycle()
                SettingRow(Icons.Rounded.AllInclusive, stringResource(R.string.auto_connect), stringResource(R.string.auto_connect_desc), onClick = { vm.setAutoConnect(!autoConnect) }, trailing = {
                    Switch(checked = autoConnect, onCheckedChange = { vm.setAutoConnect(it) }, colors = SwitchDefaults.colors(checkedTrackColor = MaterialTheme.colorScheme.primary))
                })
                SettingRow(Icons.Rounded.VolumeUp, stringResource(R.string.speaker_default), stringResource(R.string.speaker_default_desc), onClick = { vm.setSpeakerDefault(!speakerDefault) }, trailing = {
                    Switch(checked = speakerDefault, onCheckedChange = { vm.setSpeakerDefault(it) }, colors = SwitchDefaults.colors(checkedTrackColor = MaterialTheme.colorScheme.primary))
                })
                SettingRow(Icons.Rounded.Call, stringResource(R.string.allow_calls), stringResource(R.string.allow_calls_desc), onClick = { vm.setAcceptCalls(!acceptCallsC) }, trailing = {
                    Switch(checked = acceptCallsC, onCheckedChange = { vm.setAcceptCalls(it) }, colors = SwitchDefaults.colors(checkedTrackColor = MaterialTheme.colorScheme.primary))
                })
            }

            Section(stringResource(R.string.section_privacy)) {
                // Tap to copy your ID (with a little "Copied" moment); accounts edit it with the pencil.
                var idCopied by remember { mutableStateOf(false) }
                LaunchedEffect(idCopied) { if (idCopied) { kotlinx.coroutines.delay(1600); idCopied = false } }
                val clip = androidx.compose.ui.platform.LocalClipboardManager.current
                SettingRow(
                    Icons.Rounded.Tag, stringResource(R.string.your_friend_id),
                    if (idCopied) stringResource(R.string.copied) else friendId ?: "…",
                    onClick = { friendId?.let { clip.setText(androidx.compose.ui.text.AnnotatedString(it)); idCopied = true } },
                    trailing = {
                        if (account != null) androidx.compose.material3.IconButton(onClick = { vm.open(ProfileSheet.FriendId) }) { Icon(Icons.Rounded.Edit, stringResource(R.string.edit), tint = MaterialTheme.colorScheme.onSurfaceVariant) }
                        else androidx.compose.animation.Crossfade(idCopied, label = "c") { c -> Icon(if (c) Icons.Rounded.Check else Icons.Rounded.ContentCopy, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) }
                    },
                )
                SettingRow(Icons.Rounded.Visibility, stringResource(R.string.show_online), stringResource(R.string.show_online_desc), onClick = { vm.setHideStatus(!hideStatus) }, trailing = {
                    Switch(checked = !hideStatus, onCheckedChange = { vm.setHideStatus(!it) }, colors = SwitchDefaults.colors(checkedTrackColor = MaterialTheme.colorScheme.primary))
                })
                val readReceipts by vm.readReceipts.collectAsStateWithLifecycle()
                SettingRow(Icons.Rounded.DoneAll, stringResource(R.string.read_receipts), stringResource(R.string.read_receipts_desc), onClick = { vm.setReadReceipts(!readReceipts) }, trailing = {
                    Switch(checked = readReceipts, onCheckedChange = { vm.setReadReceipts(it) }, colors = SwitchDefaults.colors(checkedTrackColor = MaterialTheme.colorScheme.primary))
                })
                val contactConsent by vm.contactConsent.collectAsStateWithLifecycle()
                SettingRow(Icons.Rounded.ContactMail, stringResource(R.string.contact_save), stringResource(R.string.contact_save_desc), onClick = { vm.setContactConsent(!contactConsent) }, trailing = {
                    Switch(checked = contactConsent, onCheckedChange = { vm.setContactConsent(it) }, colors = SwitchDefaults.colors(checkedTrackColor = MaterialTheme.colorScheme.primary))
                })
                SettingRow(Icons.Rounded.Block, stringResource(R.string.blocked_people), if (blocked.isEmpty()) stringResource(R.string.none) else blocked.size.toString()) {
                    vm.open(ProfileSheet.Blocked)
                }
            }

            Section(stringResource(R.string.section_appearance)) {
                val current by vm.theme.collectAsStateWithLifecycle()
                ThemePicker(current, premium.active, onLocked = { youSheet = "plus" }, onPick = vm::setTheme)
                val soundsOn by vm.sounds.collectAsStateWithLifecycle()
                SettingRow(Icons.Rounded.VolumeUp, stringResource(R.string.sounds), stringResource(R.string.sounds_desc), onClick = { vm.setSounds(!soundsOn) }, trailing = {
                    Switch(checked = soundsOn, onCheckedChange = vm::setSounds, colors = SwitchDefaults.colors(checkedTrackColor = MaterialTheme.colorScheme.primary))
                })
                val vibrationOn by vm.vibration.collectAsStateWithLifecycle()
                SettingRow(Icons.Rounded.Vibration, stringResource(R.string.vibration), stringResource(R.string.vibration_desc), onClick = { vm.setVibration(!vibrationOn) }, trailing = {
                    Switch(checked = vibrationOn, onCheckedChange = vm::setVibration, colors = SwitchDefaults.colors(checkedTrackColor = MaterialTheme.colorScheme.primary))
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
                Spacer(Modifier.height(10.dp))
                Surface(
                    onClick = { vm.open(ProfileSheet.Delete) },
                    shape = MaterialTheme.shapes.large,
                    color = Danger.copy(alpha = 0.12f),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.DeleteForever, null, tint = Danger)
                        Spacer(Modifier.size(14.dp))
                        Text(stringResource(R.string.delete_account), style = MaterialTheme.typography.titleMedium, color = Danger)
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

    vm.sheet?.let { sheet -> ProfileSheetHost(sheet, vm, animal, onSignIn) }
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

/** The website's four themes as tappable swatches. */
@Composable
private fun ThemePicker(current: app.talklive.ui.theme.AppTheme, premium: Boolean, onLocked: () -> Unit, onPick: (app.talklive.ui.theme.AppTheme) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        app.talklive.ui.theme.AppTheme.entries.forEach { t ->
            val a = app.talklive.ui.theme.accentsFor(t)
            val bg = when (t) {
                app.talklive.ui.theme.AppTheme.Light -> androidx.compose.ui.graphics.Color(0xFFEEF1F9)
                app.talklive.ui.theme.AppTheme.Ocean -> androidx.compose.ui.graphics.Color(0xFF03151F)
                app.talklive.ui.theme.AppTheme.Sunset -> androidx.compose.ui.graphics.Color(0xFF1A0B14)
                else -> androidx.compose.ui.graphics.Color(0xFF0B0F1A)
            }
            val selected = t == current
            // Light and Dark are free; Ocean and Sunset come with Plus.
            val locked = !premium && t != app.talklive.ui.theme.AppTheme.Dark && t != app.talklive.ui.theme.AppTheme.Light
            val border by androidx.compose.animation.animateColorAsState(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant, label = "theme")
            Column(
                Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).border(if (selected) 2.dp else 1.dp, border, RoundedCornerShape(16.dp))
                    .clickable { if (locked) onLocked() else onPick(t) }.padding(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(Modifier.fillMaxWidth().height(44.dp).clip(RoundedCornerShape(10.dp)).background(bg), contentAlignment = Alignment.Center) {
                    Box(Modifier.size(22.dp).clip(CircleShape).background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(a.a, a.b))))
                    if (locked) Box(
                        Modifier.align(Alignment.TopEnd).padding(4.dp).size(18.dp).clip(CircleShape).background(androidx.compose.ui.graphics.Color(0xFFF2C14E)),
                        contentAlignment = Alignment.Center,
                    ) { Icon(Icons.Rounded.Lock, null, tint = androidx.compose.ui.graphics.Color(0xFF2B1D00), modifier = Modifier.size(11.dp)) }
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    stringResource(when (t) { app.talklive.ui.theme.AppTheme.Dark -> R.string.theme_dark; app.talklive.ui.theme.AppTheme.Light -> R.string.theme_light; app.talklive.ui.theme.AppTheme.Ocean -> R.string.theme_ocean; app.talklive.ui.theme.AppTheme.Sunset -> R.string.theme_sunset }),
                    style = MaterialTheme.typography.labelMedium,
                    color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun genderLabel(g: String) = stringResource(
    when (g) { "male" -> R.string.gender_male; "female" -> R.string.gender_female; else -> R.string.gender_unspecified },
)

@Composable
private fun ChoiceDialog(title: String, options: List<String>, current: String, label: @Composable (String) -> String, onPick: (String) -> Unit, onDismiss: () -> Unit) {
    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column {
                options.forEach { o ->
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable { onPick(o); onDismiss() }.padding(vertical = 12.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        androidx.compose.material3.RadioButton(selected = o == current, onClick = { onPick(o); onDismiss() })
                        Spacer(Modifier.width(8.dp))
                        Text(label(o), style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }
        },
        confirmButton = { androidx.compose.material3.TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
    )
}

private fun settingColor(icon: ImageVector): androidx.compose.ui.graphics.Color {
    return when (icon) {
        Icons.Rounded.Public -> androidx.compose.ui.graphics.Color(0xFF3B82F6)          // passport
        Icons.Rounded.Movie -> androidx.compose.ui.graphics.Color(0xFFF97316)           // films
        Icons.Rounded.Favorite -> androidx.compose.ui.graphics.Color(0xFFEC4899)        // likes
        Icons.Rounded.CardGiftcard -> androidx.compose.ui.graphics.Color(0xFF22C55E)    // invite
        Icons.Rounded.Face -> androidx.compose.ui.graphics.Color(0xFF8B5CF6)            // I am
        Icons.Rounded.Cake -> androidx.compose.ui.graphics.Color(0xFFF59E0B)            // age
        Icons.Rounded.WorkspacePremium -> androidx.compose.ui.graphics.Color(0xFFEAB308)
        Icons.Rounded.GraphicEq -> androidx.compose.ui.graphics.Color(0xFF14B8A6)       // voice check
        Icons.Rounded.Person -> androidx.compose.ui.graphics.Color(0xFF06B6D4)          // display name
        Icons.Rounded.Mail -> androidx.compose.ui.graphics.Color(0xFF0EA5E9)
        Icons.Rounded.Key -> androidx.compose.ui.graphics.Color(0xFF64748B)
        Icons.Rounded.Visibility -> androidx.compose.ui.graphics.Color(0xFF10B981)      // online status
        Icons.Rounded.Call -> androidx.compose.ui.graphics.Color(0xFF22C55E)
        Icons.Rounded.Tag -> androidx.compose.ui.graphics.Color(0xFF6366F1)             // friend ID
        Icons.Rounded.Block -> androidx.compose.ui.graphics.Color(0xFFEF4444)
        Icons.Rounded.VolumeUp -> androidx.compose.ui.graphics.Color(0xFFA855F7)
        Icons.Rounded.SupportAgent -> androidx.compose.ui.graphics.Color(0xFF3B82F6)
        Icons.Rounded.Feedback -> androidx.compose.ui.graphics.Color(0xFFF97316)
        Icons.Rounded.Shield -> androidx.compose.ui.graphics.Color(0xFF10B981)
        Icons.Rounded.Groups -> androidx.compose.ui.graphics.Color(0xFF8B5CF6)
        Icons.Rounded.PrivacyTip -> androidx.compose.ui.graphics.Color(0xFF0EA5E9)
        Icons.Rounded.Gavel -> androidx.compose.ui.graphics.Color(0xFF64748B)
        else -> androidx.compose.ui.graphics.Color(0xFF6C5CE7)
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
        Modifier.fillMaxWidth().heightIn(min = 60.dp).clickable { app.talklive.sound.Tap.soft(); onClick() }.padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Each kind of setting has its own colour, so the list reads at a glance.
        val c = settingColor(icon)
        Box(
            Modifier.size(38.dp).clip(RoundedCornerShape(12.dp)).background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(c, c.copy(alpha = 0.72f)))),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, null, tint = androidx.compose.ui.graphics.Color.White, modifier = Modifier.size(21.dp)) }
        Spacer(Modifier.size(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            value?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
            }
        }
        if (trailing != null) trailing() else {
            Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfileSheetHost(sheet: ProfileSheet, vm: ProfileViewModel, animal: String?, onSignIn: () -> Unit = {}) {
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
                ProfileSheet.Delete -> {
                    var secret by rememberSaveable { mutableStateOf("") }
                    SheetTitle(stringResource(R.string.delete_account), stringResource(R.string.delete_account_body))
                    TalkTextField(secret, { secret = it; vm.clearError() }, stringResource(R.string.delete_account_field), password = true, imeAction = ImeAction.Done)
                    ErrorBanner(vm.error)
                    Spacer(Modifier.height(16.dp))
                    androidx.compose.material3.Button(
                        onClick = { vm.deleteAccount(secret) },
                        enabled = secret.isNotBlank() && !vm.busy,
                        colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = Danger, contentColor = Color.White),
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        shape = CircleShape,
                    ) { Text(stringResource(R.string.delete_account_confirm), style = MaterialTheme.typography.labelLarge) }
                }
                // Tapping your own picture or name: everything about how you look, in one place.
                ProfileSheet.Edit -> {
                    var nick by rememberSaveable { mutableStateOf(account?.nickname.orEmpty()) }
                    SheetTitle(stringResource(R.string.edit_profile), null)
                    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(contentAlignment = Alignment.BottomEnd) {
                            AnimalAvatar(animal, account?.nickname, 96.dp, Modifier.clip(CircleShape).clickable { vm.open(ProfileSheet.Animal) })
                            Box(Modifier.size(30.dp).clip(CircleShape).background(BrandGradient).clickable { vm.open(ProfileSheet.Animal) }, contentAlignment = Alignment.Center) {
                                Icon(Icons.Rounded.Edit, null, tint = Color.White, modifier = Modifier.size(15.dp))
                            }
                        }
                        androidx.compose.material3.TextButton(onClick = { vm.open(ProfileSheet.Animal) }) { Text(stringResource(R.string.change_avatar)) }
                    }
                    Spacer(Modifier.height(8.dp))
                    if (account != null) {
                        TalkTextField(nick, { nick = it.take(20); vm.clearError() }, stringResource(R.string.display_name), imeAction = ImeAction.Done, onIme = { vm.saveNickname(nick) })
                        Text(stringResource(R.string.display_name_rules), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp, start = 4.dp))
                        ErrorBanner(vm.error)
                        Spacer(Modifier.height(16.dp))
                        PrimaryButton(stringResource(R.string.save), onClick = { vm.saveNickname(nick) }, enabled = nick.isNotBlank() && nick.trim() != account?.nickname, loading = vm.busy)
                    } else {
                        Text(stringResource(R.string.name_needs_account), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(12.dp))
                        PrimaryButton(stringResource(R.string.sign_in_or_create), onClick = { vm.close(); onSignIn() })
                    }
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

