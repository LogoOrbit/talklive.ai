package app.talklive.ui.onboarding

import android.annotation.SuppressLint
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.talklive.R
import app.talklive.net.ServerConfig
import app.talklive.ui.components.PrimaryButton

/**
 * The Terms of Service and Privacy Policy, read inside the app before an
 * account (or guest profile) is made. "I agree" unlocks once both have been
 * scrolled to the end.
 */
@Composable
internal fun TermsReader(onDismiss: () -> Unit, onAgree: () -> Unit) {
    val pages = listOf(R.string.terms to "terms", R.string.privacy_policy to "privacy")
    var tab by remember { mutableStateOf(0) }
    val done = remember { mutableStateListOf(false, false) }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(
            Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)
                .statusBarsPadding().navigationBarsPadding(),
        ) {
            Row(Modifier.fillMaxWidth().padding(start = 4.dp, end = 16.dp, top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onDismiss) { Icon(Icons.Rounded.Close, null) }
                Text(stringResource(R.string.terms_read_title), style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
            }
            TabRow(selectedTabIndex = tab) {
                pages.forEachIndexed { i, (label, _) ->
                    Tab(selected = tab == i, onClick = { tab = i }, text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(stringResource(label))
                            if (done[i]) Icon(Icons.Rounded.CheckCircle, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(start = 6.dp))
                        }
                    })
                }
            }
            Box(Modifier.weight(1f).fillMaxWidth()) {
                // Both pages stay loaded, so switching tabs keeps the reading position.
                pages.forEachIndexed { i, (_, path) ->
                    if (tab == i) LegalPage("${ServerConfig.url}/$path?app=1") { done[i] = true }
                }
            }
            Column(Modifier.padding(16.dp)) {
                val ready = done.all { it }
                Text(
                    stringResource(if (ready) R.string.terms_read_ready else R.string.terms_read_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 10.dp),
                )
                PrimaryButton(
                    text = stringResource(if (ready) R.string.terms_agree else if (!done[tab]) R.string.terms_keep_reading else R.string.terms_next),
                    enabled = ready || done[tab],
                    onClick = { if (ready) onAgree() else tab = done.indexOfFirst { !it } },
                )
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun LegalPage(url: String, onEnd: () -> Unit) {
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            WebView(ctx).apply {
                settings.javaScriptEnabled = true
                setBackgroundColor(android.graphics.Color.TRANSPARENT)
                fun check() { if (!canScrollVertically(1)) onEnd() }
                setOnScrollChangeListener { _, _, _, _, _ -> check() }
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView, url: String) { view.postDelayed({ check() }, 600) }
                    // Offline: never trap someone on a page that cannot load.
                    override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                        if (request.isForMainFrame) onEnd()
                    }
                }
                loadUrl(url)
            }
        },
    )
}
