package app.talklive.ui.onboarding

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.talklive.R
import app.talklive.net.ServerConfig
import app.talklive.ui.components.PrimaryButton

/**
 * The rules, before an account or guest profile is made: the key points in
 * plain words (built in, so it opens instantly, even offline), the full
 * Terms and Privacy Policy one tap away, and a single "I agree".
 */
@Composable
internal fun TermsReader(onDismiss: () -> Unit, onAgree: () -> Unit) {
    val context = LocalContext.current
    fun open(page: String) = runCatching {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("${ServerConfig.url}/$page")))
    }
    val points = listOf(
        "🔞" to R.string.terms_pt_age,
        "🤝" to R.string.terms_pt_respect,
        "🛡️" to R.string.terms_pt_safety,
        "🙈" to R.string.terms_pt_private,
        "💾" to R.string.terms_pt_data,
        "💳" to R.string.terms_pt_pay,
    )
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(
            Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)
                .statusBarsPadding().navigationBarsPadding(),
        ) {
            Row(Modifier.fillMaxWidth().padding(4.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onDismiss) { Icon(Icons.Rounded.Close, null, tint = MaterialTheme.colorScheme.onBackground) }
            }
            Column(
                Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 24.dp),
            ) {
                Text(stringResource(R.string.terms_read_title), style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground)
                Spacer(Modifier.height(6.dp))
                Text(stringResource(R.string.terms_intro), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(20.dp))
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    points.forEach { (emoji, text) ->
                        Row(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer), contentAlignment = Alignment.Center) {
                                Text(emoji, fontSize = 20.sp)
                            }
                            Spacer(Modifier.width(14.dp))
                            Text(stringResource(text), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }
                Spacer(Modifier.height(18.dp))
                Text(stringResource(R.string.terms_full_hint), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(Modifier.padding(top = 4.dp, bottom = 16.dp)) {
                    listOf(R.string.terms to "terms", R.string.privacy_policy to "privacy", R.string.community_guidelines to "community-guidelines").forEach { (label, page) ->
                        Text(
                            stringResource(label), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable { open(page) }.padding(horizontal = 6.dp, vertical = 8.dp),
                        )
                    }
                }
            }
            Column(Modifier.padding(horizontal = 20.dp, vertical = 12.dp)) {
                PrimaryButton(text = stringResource(R.string.terms_agree), onClick = onAgree)
                Text(
                    stringResource(R.string.terms_read_ready), style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                )
            }
        }
    }
}
