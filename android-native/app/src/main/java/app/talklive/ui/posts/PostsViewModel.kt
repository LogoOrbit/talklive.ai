package app.talklive.ui.posts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.talklive.posts.PostsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PostsViewModel @Inject constructor(private val repo: PostsRepository) : ViewModel() {
    val state = repo.state

    /** Home: once per app open. */
    fun loadOnce() { viewModelScope.launch { repo.loadOnce() } }

    /** The news screen opened or was pulled down. */
    fun load() { viewModelScope.launch { repo.load() } }

    fun react(postId: String, type: String?) { viewModelScope.launch { repo.react(postId, type) } }

    /** Null when posted, else the reason (verify, rate, blocked, error). */
    suspend fun comment(postId: String, text: String): String? = repo.comment(postId, text)
}
