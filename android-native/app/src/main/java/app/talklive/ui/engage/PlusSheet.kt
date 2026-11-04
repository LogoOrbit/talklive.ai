package app.talklive.ui.engage

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.WorkspacePremium
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.hilt.navigation.compose.hiltViewModel
import app.talklive.R
import app.talklive.billing.BillingState
import app.talklive.billing.PlayBilling
import app.talklive.billing.PlayMessage
import app.talklive.billing.PlusPlan
import app.talklive.engage.Premium
import app.talklive.ui.components.PrimaryButton
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class PlusViewModel @Inject constructor(val billing: PlayBilling) : ViewModel()

/**
 * TalkLive Plus: what it adds, Play's prices for this person, subscribe,
 * restore and manage. Guests are asked to sign in first so Plus follows the
 * account to a new phone.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlusSheet(premium: Premium, signedIn: Boolean, onSignIn: () -> Unit, onDismiss: () -> Unit, vm: PlusViewModel = hiltViewModel()) {
    val context = LocalContext.current
    val state by vm.billing.state.collectAsStateWithLifecycle()
    val busy by vm.billing.busy.collectAsStateWithLifecycle()
    val message by vm.billing.message.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { vm.billing.refresh() }
    LaunchedEffect(message) {
        val m = message ?: return@LaunchedEffect
        val text = when (m) {
            PlayMessage.Welcome -> context.getString(R.string.plus_welcome)
            PlayMessage.Pending -> context.getString(R.string.plus_pending)
            PlayMessage.Later -> context.getString(R.string.plus_later)
            PlayMessage.Failed -> context.getString(R.string.plus_failed)
            PlayMessage.NothingToRestore -> context.getString(R.string.plus_nothing_to_restore)
            is PlayMessage.Error -> m.text.ifBlank { context.getString(R.string.plus_failed) }
        }
        Toast.makeText(context, text, Toast.LENGTH_LONG).show()
        vm.billing.clearMessage()
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 24.dp).verticalScroll(rememberScrollState())) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.WorkspacePremium, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(32.dp))
                Spacer(Modifier.width(10.dp))
                Text(stringResource(R.string.plus), style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground)
            }
            Spacer(Modifier.height(16.dp))
            listOf(R.string.plus_perk_gender, R.string.plus_perk_likes, R.string.plus_perk_undo).forEach {
                Row(Modifier.padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.CheckCircle, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(10.dp))
                    Text(stringResource(it), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground)
                }
            }
            Spacer(Modifier.height(20.dp))

            when {
                premium.active -> {
                    Text(
                        if (premium.expiresAt != null) stringResource(R.string.plus_until, java.text.DateFormat.getDateInstance().format(java.util.Date(premium.expiresAt)))
                        else stringResource(R.string.plus_active),
                        style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary,
                    )
                    if (premium.play) {
                        Spacer(Modifier.height(12.dp))
                        PrimaryButton(stringResource(R.string.plus_manage), onClick = { openManage(context) })
                    }
                }
                !signedIn -> {
                    Text(stringResource(R.string.plus_sign_in), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(12.dp))
                    PrimaryButton(stringResource(R.string.sign_in_or_create), onClick = onSignIn)
                }
                else -> when (val s = state) {
                    BillingState.Loading -> CircularProgressIndicator(Modifier.size(28.dp).align(Alignment.CenterHorizontally))
                    BillingState.Unavailable -> Text(stringResource(R.string.plus_unavailable), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    is BillingState.Ready -> {
                        var picked by remember(s) { mutableStateOf(s.plans.last()) }
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            s.plans.forEach { plan -> PlanCard(plan, s.plans, plan == picked) { picked = plan } }
                        }
                        Spacer(Modifier.height(16.dp))
                        PrimaryButton(
                            if (picked.trial != null) stringResource(R.string.plus_start_trial) else stringResource(R.string.plus_subscribe),
                            onClick = { context.findActivity()?.let { vm.billing.buy(it, picked) } },
                            loading = busy,
                        )
                        Text(stringResource(R.string.plus_terms), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 10.dp))
                    }
                }
            }
            if (signedIn) {
                TextButton(onClick = { vm.billing.restore() }, modifier = Modifier.align(Alignment.CenterHorizontally).padding(top = 8.dp)) {
                    Text(stringResource(R.string.plus_restore))
                }
            }
        }
    }
}

@Composable
private fun PlanCard(plan: PlusPlan, all: List<PlusPlan>, selected: Boolean, onClick: () -> Unit) {
    val border by animateColorAsState(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant, label = "plan")
    val days = PlayBilling.periodDays(plan.period)
    // "Save 40%" on the longer plan against the shortest one, when Play's prices allow it.
    val saving = all.firstOrNull()?.takeIf { it != plan }?.let { short ->
        val shortMicros = priceMicros(short.price) ?: return@let null
        val mine = priceMicros(plan.price) ?: return@let null
        val shortDays = PlayBilling.periodDays(short.period).takeIf { it > 0 } ?: return@let null
        val pct = (100 - mine * 100.0 / (shortMicros * days / shortDays)).toInt()
        pct.takeIf { it in 5..90 }
    }
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(if (selected) 2.dp else 1.dp, border),
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    stringResource(if (days >= 360) R.string.plus_yearly else R.string.plus_monthly),
                    style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface,
                )
                plan.trial?.let { Text(stringResource(R.string.plus_trial, PlayBilling.periodDays(it)), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary) }
                saving?.let { Text(stringResource(R.string.plus_save, it), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary) }
            }
            Text(plan.price, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

/** Digits of a formatted price ("$4.99", "₹ 399,00") as a comparable number. */
private fun priceMicros(formatted: String): Long? = formatted.filter { it.isDigit() }.toLongOrNull()

private fun openManage(context: Context) {
    runCatching {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(PlayBilling.MANAGE_URL + context.packageName)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}
