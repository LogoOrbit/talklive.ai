package app.talklive.ui.engage

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.talklive.engage.EngageRepository
import app.talklive.engage.Film
import app.talklive.engage.Filters
import app.talklive.engage.Likes
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class EngageViewModel @Inject constructor(private val repo: EngageRepository, private val mic: app.talklive.voice.MicMonitor) : ViewModel() {
    val myGender = repo.myGender
    val ageGroup = repo.ageGroup
    val flags = repo.flags
    val voiceCheck = mic.enabled
    val voiceResult = mic.result
    fun setMyGender(g: String) = repo.setMyGender(g)
    fun setAgeGroup(a: String) = repo.setAgeGroup(a)
    fun setVoiceCheck(on: Boolean) = mic.setEnabled(on)
    val engage = repo.engage
    val premium = repo.premium
    val referral = repo.referral
    val films = repo.films
    val filters = repo.filters
    val moments = repo.moments

    var likes by mutableStateOf<Likes?>(null); private set
    var results by mutableStateOf<List<Film>>(emptyList()); private set
    var searching by mutableStateOf(false); private set
    var error by mutableStateOf<String?>(null); private set
    var busy by mutableStateOf(false); private set
    private var searchJob: Job? = null

    fun loadLikes() = viewModelScope.launch { likes = repo.likes() }
    fun requestReferral() = repo.requestReferral()
    fun setFilters(f: Filters) = repo.setFilters(f)
    fun sendFeedback(text: String) = repo.sendFeedback(text)

    /** Search as you type, after a short pause. */
    fun search(q: String) {
        searchJob?.cancel()
        if (q.isBlank()) { results = emptyList(); searching = false; return }
        searchJob = viewModelScope.launch {
            delay(350)
            searching = true
            results = repo.searchFilms(q)
            searching = false
        }
    }

    fun saveFilms(list: List<Film>, onDone: () -> Unit) {
        if (busy) return
        busy = true; error = null
        viewModelScope.launch {
            repo.saveFilms(list).onSuccess { onDone() }.onFailure { error = it.message }
            busy = false
        }
    }
}
