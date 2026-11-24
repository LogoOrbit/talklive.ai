package app.talklive.update

import android.content.Intent
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.SystemUpdate
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.talklive.R
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability

/**
 * When Google Play has a newer version of the app for this user (the public release or
 * the closed-testing track they joined), the app can't be used until it is installed.
 * Play's own full-screen update runs first; backing out of it leaves our blocking screen,
 * which only offers Update. Checked on every return to the app. A copy not installed from
 * Play (or with no connection to Play) is never blocked.
 */
class ForcedUpdate(private val activity: ComponentActivity) {
    /** True while a newer version is waiting: everything else is hidden. */
    var required by mutableStateOf(false)
        private set

    private val manager = AppUpdateManagerFactory.create(activity)
    private var info: AppUpdateInfo? = null
    private val launcher: ActivityResultLauncher<IntentSenderRequest> =
        activity.registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) {
            // Cancelled or failed: stay blocked; the next resume (or the button) asks again.
            check()
        }

    fun check() {
        manager.appUpdateInfo.addOnSuccessListener { i ->
            info = i
            when (i.updateAvailability()) {
                UpdateAvailability.UPDATE_AVAILABLE -> {
                    required = true
                    if (i.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) start(i)
                }
                // An update started earlier and the app was left: carry on with it.
                UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS -> {
                    required = true
                    start(i)
                }
                else -> required = false
            }
        }
    }

    private fun start(i: AppUpdateInfo) {
        runCatching {
            manager.startUpdateFlowForResult(i, launcher, AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build())
        }.onFailure { openStore() }
    }

    fun update() {
        val i = info
        if (i != null && (i.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE || i.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) &&
            i.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)
        ) start(i) else openStore()
    }

    private fun openStore() {
        val pkg = activity.packageName
        runCatching { activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$pkg")).setPackage("com.android.vending")) }
            .onFailure { runCatching { activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$pkg"))) } }
    }
}

/** Covers the whole app; touches don't pass through, and Back leaves the app. */
@Composable
fun UpdateRequiredScreen(onUpdate: () -> Unit, onExit: () -> Unit) {
    BackHandler(onBack = onExit)
    Column(
        Modifier.fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .clickable(MutableInteractionSource(), null) {}
            .systemBarsPadding()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(Icons.Rounded.SystemUpdate, null, Modifier.size(72.dp), tint = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.height(20.dp))
        Text(stringResource(R.string.update_required_title), style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground, textAlign = TextAlign.Center)
        Spacer(Modifier.height(10.dp))
        Text(stringResource(R.string.update_required_body), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        Spacer(Modifier.height(28.dp))
        Button(onClick = onUpdate, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(stringResource(R.string.update_required_button)) }
    }
}
