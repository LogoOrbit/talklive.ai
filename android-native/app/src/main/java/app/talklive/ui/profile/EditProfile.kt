package app.talklive.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import app.talklive.R
import app.talklive.ui.animals.AnimalCaption
import app.talklive.ui.animals.AnimalGrid
import app.talklive.ui.animals.isPlusFace
import app.talklive.ui.animals.isSpecialFace
import app.talklive.ui.animals.specialUnlocked
import app.talklive.ui.components.ErrorBanner
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.components.TalkTextField
import app.talklive.ui.engage.EngageViewModel
import app.talklive.ui.engage.PlusReason

enum class EditTab { Avatar, Cover, Name }

/**
 * Edit profile: a live preview card on top that follows every choice, then three tabs
 * (Avatar, Cover, Name with the ID). Locked faces and covers can be tried on; Save is what
 * asks for Plus or a level.
 */
@Composable
fun EditProfileDialog(
    initialTab: EditTab,
    vm: ProfileViewModel,
    engageVm: EngageViewModel,
    onSignIn: () -> Unit,
    onPlus: (PlusReason) -> Unit,
    onRewards: () -> Unit,
    onClose: () -> Unit,
) {
    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            EditProfileContent(initialTab, vm, engageVm, onSignIn, onPlus, onRewards, onClose)
        }
    }
}

@Composable
private fun EditProfileContent(
    initialTab: EditTab,
    vm: ProfileViewModel,
    engageVm: EngageViewModel,
    onSignIn: () -> Unit,
    onPlus: (PlusReason) -> Unit,
    onRewards: () -> Unit,
    onClose: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val account by vm.account.collectAsStateWithLifecycle()
    val animal by vm.animal.collectAsStateWithLifecycle()
    val myCover by vm.myCover.collectAsStateWithLifecycle()
    val myBadges by vm.myBadges.collectAsStateWithLifecycle()
    val progress by vm.progress.collectAsStateWithLifecycle()
    val friendId by vm.myFriendId.collectAsStateWithLifecycle()
    val premium by engageVm.premium.collectAsStateWithLifecycle()

    val heldFace = animal
    val heldCover = effectiveCover(myCover, !premium.ended)
    val heldNick = account?.nickname.orEmpty()
    val tier = progress?.tier ?: "none"

    var tab by rememberSaveable { mutableStateOf(initialTab) }
    var faceSel by rememberSaveable { mutableStateOf(heldFace) }
    var coverSel by rememberSaveable { mutableStateOf(heldCover) }
    var nick by rememberSaveable { mutableStateOf(heldNick) }
    var idName by rememberSaveable { mutableStateOf(friendId.orEmpty().substringBefore('#').filter { it in 'a'..'z' }.take(16)) }
    var idTag by rememberSaveable { mutableStateOf(friendId.orEmpty().substringAfter('#', "").filter { it.isDigit() }.take(4)) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val idOk = idName.isNotEmpty() && idTag.isNotEmpty()
    val handle = "$idName#$idTag"

    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().imePadding()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onClose) {
                Icon(Icons.AutoMirrored.Rounded.ArrowBack, stringResource(R.string.back), tint = MaterialTheme.colorScheme.onBackground)
            }
            Text(stringResource(R.string.edit_profile), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
        }

        // The live preview: every choice below shows here at once.
        ProfileCard(
            cover = coverSel,
            face = faceSel,
            name = nick.trim().ifBlank { account?.nickname ?: stringResource(R.string.guest) },
            friendId = if (idOk) handle else friendId,
            badges = myBadges,
            progress = progress,
            ring = premium.ring,
            alive = premium.active,
            avatarSize = 72.dp,
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        Spacer(Modifier.height(12.dp))

        // Avatar | Cover | Name
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp).clip(RoundedCornerShape(50)).background(MaterialTheme.colorScheme.surface).padding(4.dp),
        ) {
            EditTab.entries.forEach { t ->
                val on = t == tab
                Box(
                    Modifier.weight(1f).clip(RoundedCornerShape(50))
                        .background(if (on) MaterialTheme.colorScheme.primaryContainer else androidx.compose.ui.graphics.Color.Transparent)
                        .clickable { tab = t }.padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        stringResource(when (t) { EditTab.Avatar -> R.string.edit_tab_avatar; EditTab.Cover -> R.string.edit_tab_cover; EditTab.Name -> R.string.edit_tab_name }),
                        style = MaterialTheme.typography.labelLarge,
                        color = if (on) app.talklive.ui.theme.AccentText else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        Box(Modifier.weight(1f).fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
            when (tab) {
                EditTab.Avatar -> Column(Modifier.fillMaxSize()) {
                    AnimalGrid(
                        selected = faceSel,
                        onSelect = { faceSel = it; error = null },
                        premium = premium.active,
                        look = premium.look,
                        lookFace = premium.lookFace,
                        tier = tier,
                        previewLocked = true,
                        modifier = Modifier.weight(1f).fillMaxWidth(),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 6.dp),
                    )
                    AnimalCaption(faceSel, Modifier.padding(top = 4.dp))
                }
                EditTab.Cover -> Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                    CoverPicker(
                        current = coverSel, plus = premium.active,
                        onPick = { coverSel = it; error = null },
                        onLocked = { },
                        previewLocked = true,
                        height = 420.dp,
                    )
                }
                EditTab.Name -> Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                    if (account == null) {
                        Text(stringResource(R.string.edit_name_signin), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(12.dp))
                        PrimaryButton(stringResource(R.string.sign_in_or_create), onClick = { onClose(); onSignIn() })
                    } else {
                        Text(stringResource(R.string.display_name), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
                        Spacer(Modifier.height(8.dp))
                        TalkTextField(nick, { nick = it.take(24); error = null }, stringResource(R.string.display_name), imeAction = ImeAction.Next)
                        Spacer(Modifier.height(20.dp))
                        Text(stringResource(R.string.your_friend_id), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
                        Text(stringResource(R.string.friend_id_rules), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(8.dp))
                        val tagFocus = remember { FocusRequester() }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            OutlinedTextField(
                                idName,
                                { v -> idName = v.lowercase().filter { it in 'a'..'z' }.take(16); error = null; if (v.any { it.isDigit() || it == '#' }) runCatching { tagFocus.requestFocus() } },
                                label = { Text(stringResource(R.string.id_letters)) },
                                singleLine = true, shape = RoundedCornerShape(16.dp), modifier = Modifier.weight(1f),
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(imeAction = ImeAction.Next, autoCorrectEnabled = false),
                                keyboardActions = androidx.compose.foundation.text.KeyboardActions(onNext = { runCatching { tagFocus.requestFocus() } }),
                            )
                            Text("#", style = MaterialTheme.typography.headlineMedium, color = app.talklive.ui.theme.AccentText, modifier = Modifier.padding(horizontal = 8.dp))
                            OutlinedTextField(
                                idTag, { v -> idTag = v.filter { it.isDigit() }.take(4); error = null },
                                label = { Text(stringResource(R.string.id_numbers)) },
                                singleLine = true, shape = RoundedCornerShape(16.dp), modifier = Modifier.width(110.dp).focusRequester(tagFocus),
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.NumberPassword, imeAction = ImeAction.Done),
                            )
                        }
                    }
                }
            }
        }

        ErrorBanner(error)
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = onClose, enabled = !saving) { Text(stringResource(R.string.cancel)) }
            Box(Modifier.weight(1f)) {
                PrimaryButton(
                    stringResource(R.string.save),
                    loading = saving,
                    onClick = {
                        val face = faceSel
                        val faceChanged = face != null && face != heldFace
                        val coverChanged = coverSel != null && coverSel != heldCover
                        val newNick = nick.trim()
                        val nickChanged = account != null && newNick.isNotEmpty() && newNick != heldNick
                        val idChanged = account != null && idOk && handle != friendId
                        val lookFace = premium.lookFace
                        val faceUnlocked = premium.active || (premium.look && (lookFace == null || lookFace.removePrefix("a:") == face))
                        when {
                            // Locked faces and covers were only a preview: asking for Plus or a level happens here.
                            faceChanged && face != null && isSpecialFace(face) && !specialUnlocked(face, tier) -> onRewards()
                            faceChanged && isPlusFace(face) && !faceUnlocked -> onPlus(PlusReason.Avatar)
                            coverChanged && app.talklive.ui.profile.isPlusCover(coverSel) && !premium.active -> onPlus(PlusReason.Cover)
                            !faceChanged && !coverChanged && !nickChanged && !idChanged -> onClose()
                            else -> scope.launch {
                                saving = true
                                val err = vm.saveProfile(
                                    face = if (faceChanged) face else null,
                                    cover = if (coverChanged) coverSel else null,
                                    nick = if (nickChanged) newNick else null,
                                    handle = if (idChanged) handle else null,
                                )
                                saving = false
                                when (err) {
                                    null -> { vm.saved = context.getString(R.string.edit_saved); onClose() }
                                    "plus" -> onPlus(PlusReason.Cover)
                                    else -> error = err
                                }
                            }
                        }
                    },
                )
            }
        }
    }
}
