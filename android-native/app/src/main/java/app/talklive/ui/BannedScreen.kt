package app.talklive.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.auth.AuthResult
import app.talklive.net.BanInfo
import app.talklive.ui.components.ErrorBanner
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.components.TalkTextField
import app.talklive.ui.theme.Danger
import kotlinx.coroutines.launch

/**
 * Shown instead of the whole app while this account, device or network is
 * banned: why, until when, an appeal the owner answers from the dashboard,
 * Delete account and Sign out. Nothing else in the app works meanwhile.
 */
@Composable
fun BannedScreen(info: BanInfo, signedIn: Boolean, vm: TalkViewModel) {
    val scope = rememberCoroutineScope()
    var draft by rememberSaveable { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var note by remember { mutableStateOf<String?>(null) }
    var noteIsError by remember { mutableStateOf(false) }
    var confirmDelete by rememberSaveable { mutableStateOf(false) }
    val tooShort = stringResource(R.string.ban_appeal_short)
    val failed = stringResource(R.string.ban_appeal_fail)
    val limit = stringResource(R.string.ban_appeal_limit)
    val sent = stringResource(R.string.ban_appeal_sent)

    Column(
        Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).systemBarsPadding()
            .verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.ban_title), style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground, textAlign = TextAlign.Center)
        val whenText = if (info.permanent) stringResource(R.string.ban_permanent)
        else stringResource(R.string.ban_until, java.text.DateFormat.getDateTimeInstance().format(java.util.Date(info.until)))
        Text(whenText, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        if (info.reason.isNotBlank()) {
            Text(
                stringResource(R.string.ban_reason, info.reason),
                style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(16.dp)).padding(14.dp),
            )
        }

        Column(
            Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(20.dp)).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(stringResource(R.string.ban_appeal_title), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            info.appealText?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            if (info.state == "answered" && info.reply != null) {
                Text(stringResource(R.string.ban_appeal_reply), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(info.reply, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface)
            }
            when {
                info.state == "open" -> Text(stringResource(R.string.ban_appeal_waiting), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                info.canAppeal -> {
                    Text(stringResource(R.string.ban_appeal_hint), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedTextField(
                        draft, { draft = it.take(1000); note = null },
                        modifier = Modifier.fillMaxWidth(), minLines = 3, maxLines = 6, shape = RoundedCornerShape(16.dp),
                    )
                    PrimaryButton(stringResource(R.string.ban_appeal_send), onClick = {
                        val text = draft.trim()
                        if (text.length < 10) { note = tooShort; noteIsError = true; return@PrimaryButton }
                        busy = true
                        scope.launch {
                            val res = vm.sendBanAppeal(text)
                            busy = false
                            if (res?.optBoolean("ok") == true) { draft = ""; note = sent; noteIsError = false }
                            else { note = if (res?.optString("error") == "limit") limit else failed; noteIsError = true }
                        }
                    }, loading = busy, modifier = Modifier.fillMaxWidth())
                }
                else -> Text(limit, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (noteIsError) ErrorBanner(note) else note?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }

        Spacer(Modifier.height(4.dp))
        if (signedIn) {
            OutlinedButton(
                onClick = { confirmDelete = true },
                modifier = Modifier.fillMaxWidth().height(52.dp), shape = CircleShape,
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Danger),
            ) { Text(stringResource(R.string.delete_account)) }
        }
        OutlinedButton(onClick = { vm.signOutBanned() }, modifier = Modifier.fillMaxWidth().height(52.dp), shape = CircleShape) {
            Text(stringResource(R.string.sign_out))
        }
    }

    if (confirmDelete) {
        var secret by rememberSaveable { mutableStateOf("") }
        var error by remember { mutableStateOf<String?>(null) }
        var deleting by remember { mutableStateOf(false) }
        AlertDialog(
            onDismissRequest = { if (!deleting) confirmDelete = false },
            title = { Text(stringResource(R.string.delete_account)) },
            text = {
                Column {
                    Text(stringResource(R.string.delete_account_body), style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.height(12.dp))
                    TalkTextField(secret, { secret = it; error = null }, stringResource(R.string.delete_account_field), password = true)
                    ErrorBanner(error)
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        deleting = true
                        scope.launch {
                            val r = vm.deleteBannedAccount(secret)
                            deleting = false
                            if (r is AuthResult.Error) error = r.message else confirmDelete = false
                        }
                    },
                    enabled = secret.isNotBlank() && !deleting,
                    colors = ButtonDefaults.buttonColors(containerColor = Danger, contentColor = Color.White),
                ) { Text(stringResource(R.string.delete_account_confirm)) }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }, enabled = !deleting) { Text(stringResource(R.string.cancel)) } },
        )
    }
}
