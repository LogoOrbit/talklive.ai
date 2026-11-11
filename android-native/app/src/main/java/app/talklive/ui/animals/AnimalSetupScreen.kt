package app.talklive.ui.animals

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Casino
import androidx.compose.material3.Icon
import androidx.compose.material3.TextButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.components.ScreenTitle

/** Asked once after onboarding: the face strangers see when you connect. */
@Composable
fun AnimalSetupScreen(initial: String? = null, onDone: (String) -> Unit) {
    var pick by rememberSaveable { mutableStateOf(initial) }
    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 24.dp)) {
        Spacer(Modifier.height(24.dp))
        ScreenTitle(stringResource(R.string.animal_title), stringResource(R.string.animal_body))
        Spacer(Modifier.height(16.dp))
        AnimalGrid(
            selected = pick,
            onSelect = { pick = it },
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = PaddingValues(vertical = 8.dp),
        )
        AnimalCaption(pick, Modifier.padding(vertical = 12.dp))
        PrimaryButton(stringResource(R.string.continue_), onClick = { pick?.let(onDone) }, enabled = pick != null)
        TextButton(
            onClick = { pick = randomFreeAnimal().id },
            modifier = Modifier.align(Alignment.CenterHorizontally).padding(bottom = 8.dp),
        ) {
            Icon(Icons.Rounded.Casino, null)
            Text("  " + stringResource(R.string.surprise_me))
        }
    }
}
