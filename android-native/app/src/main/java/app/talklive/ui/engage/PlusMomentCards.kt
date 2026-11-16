package app.talklive.ui.engage

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.engage.PlusMoment

/** What a soft Plus card says: its moment (for the policy and analytics), a line and the tap label. */
data class PlusCardUi(val moment: PlusMoment, val text: String, val cta: String)

/** A quiet, dismissible card on Home: someone liked you, after a good call, or the 1-day pass. Never a dialog. */
@Composable
fun PlusMomentCard(card: PlusCardUi, onTap: () -> Unit, onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surface, modifier = modifier.fillMaxWidth()) {
        Row(Modifier.padding(start = 16.dp, top = 4.dp, bottom = 4.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(card.text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
            TextButton(onClick = onTap, modifier = Modifier.heightIn(min = 48.dp)) { Text(card.cta) }
            IconButton(onClick = onDismiss) {
                Icon(Icons.Rounded.Close, stringResource(R.string.plus_moment_dismiss), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

/** While searching in a busy queue: one true line, "Plus members are matched first", that can be dismissed. */
@Composable
fun PlusSearchLine(onTap: () -> Unit, onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
        Text(
            stringResource(R.string.plus_moment_search), style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center,
        )
        TextButton(onClick = onTap, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.nudge_see_plus)) }
        IconButton(onClick = onDismiss) {
            Icon(Icons.Rounded.Close, stringResource(R.string.plus_moment_dismiss), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
