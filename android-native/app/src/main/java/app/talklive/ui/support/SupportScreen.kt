package app.talklive.ui.support

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.Image
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.hilt.navigation.compose.hiltViewModel
import app.talklive.R
import app.talklive.support.SupportConfig
import app.talklive.support.SupportRepository
import app.talklive.support.SupportThread
import app.talklive.ui.components.BrandGradient
import app.talklive.ui.components.ErrorBanner
import app.talklive.ui.components.TalkTextField
import app.talklive.ui.theme.Success
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SupportViewModel @Inject constructor(private val repo: SupportRepository) : ViewModel() {
    var config by mutableStateOf<SupportConfig?>(null); private set
    var thread by mutableStateOf<SupportThread?>(null); private set
    var busy by mutableStateOf(false); private set
    var error by mutableStateOf<String?>(null); private set

    init {
        viewModelScope.launch {
            config = repo.config()
            // Poll for the team's replies while the screen is open.
            while (true) {
                repo.refresh()?.let { thread = it }
                delay(5000)
            }
        }
    }

    fun send(text: String, email: String?) {
        if (busy || text.isBlank()) return
        busy = true; error = null
        viewModelScope.launch {
            val r = if (thread == null) repo.start(text.trim(), email) else repo.send(text.trim())
            r.onSuccess { thread = it.copy(teamOnline = thread?.teamOnline ?: false) }.onFailure { error = it.message }
            busy = false
        }
    }
}

@Composable
fun SupportScreen(onBack: () -> Unit, vm: SupportViewModel = hiltViewModel()) {
    BackHandler(onBack = onBack)
    var draft by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    val list = rememberLazyListState()
    val thread = vm.thread
    val online = thread?.teamOnline ?: vm.config?.online ?: false
    LaunchedEffect(thread?.messages?.size) { thread?.messages?.size?.takeIf { it > 0 }?.let { list.animateScrollToItem(it - 1) } }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).imePadding()) {
        Surface(color = MaterialTheme.colorScheme.surface) {
            Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 4.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, null) }
                Image(painterResource(R.drawable.logo), null, Modifier.size(36.dp))
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(stringResource(R.string.support_title), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                    Text(
                        stringResource(if (online) R.string.support_online else R.string.support_offline),
                        style = MaterialTheme.typography.labelMedium, color = if (online) Success else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        LazyColumn(state = list, modifier = Modifier.weight(1f).fillMaxWidth(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            item {
                Bubble(
                    vm.config?.let { c -> if (online) c.greeting else c.awayMessage.ifBlank { c.greeting } }?.ifBlank { null } ?: stringResource(R.string.support_greeting),
                    team = true,
                )
            }
            items(thread?.messages.orEmpty(), key = { it.id }) { m -> Bubble(m.text, m.fromTeam) }
        }
        ErrorBanner(vm.error)
        Column(Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface).navigationBarsPadding().padding(12.dp)) {
            val needsEmail = thread == null && vm.config?.email.isNullOrBlank()
            if (needsEmail) {
                TalkTextField(email, { email = it }, stringResource(R.string.support_email), keyboardType = KeyboardType.Email, supporting = stringResource(R.string.support_email_hint))
                Spacer(Modifier.height(4.dp))
            }
            Row(verticalAlignment = Alignment.Bottom) {
                OutlinedTextField(
                    draft, { draft = it.take(2000) }, Modifier.weight(1f).heightIn(min = 52.dp),
                    placeholder = { Text(stringResource(R.string.support_hint)) }, shape = RoundedCornerShape(24.dp), maxLines = 5,
                )
                Spacer(Modifier.width(8.dp))
                Box(
                    Modifier.size(52.dp).clip(CircleShape).background(BrandGradient).clickable(enabled = draft.isNotBlank() && !vm.busy && (!needsEmail || email.contains('@'))) {
                        vm.send(draft, email.ifBlank { null }); draft = ""
                    },
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.AutoMirrored.Rounded.Send, stringResource(R.string.send), tint = Color.White) }
            }
        }
    }
}

@Composable
private fun Bubble(text: String, team: Boolean) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (team) Arrangement.Start else Arrangement.End) {
        Box(
            Modifier.widthIn(max = 300.dp).clip(RoundedCornerShape(18.dp))
                .then(if (team) Modifier.background(MaterialTheme.colorScheme.surface) else Modifier.background(BrandGradient))
                .padding(horizontal = 14.dp, vertical = 10.dp),
        ) { Text(text, color = if (team) MaterialTheme.colorScheme.onSurface else Color.White, style = MaterialTheme.typography.bodyLarge) }
    }
}

