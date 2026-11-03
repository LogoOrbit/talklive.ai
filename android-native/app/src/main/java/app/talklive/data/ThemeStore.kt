package app.talklive.data

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

/** Light (default) or dark, remembered across launches. */
@Singleton
class ThemeStore @Inject constructor(@ApplicationContext context: Context) {
    private val prefs = context.getSharedPreferences("ui", Context.MODE_PRIVATE)
    private val _dark = MutableStateFlow(prefs.getBoolean(KEY_DARK, false))
    val dark: StateFlow<Boolean> = _dark

    fun toggle() {
        val v = !_dark.value
        prefs.edit().putBoolean(KEY_DARK, v).apply()
        _dark.value = v
    }

    private companion object { const val KEY_DARK = "dark" }
}
