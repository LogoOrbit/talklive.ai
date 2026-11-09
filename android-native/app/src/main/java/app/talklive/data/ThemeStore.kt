package app.talklive.data

import android.content.Context
import app.talklive.ui.theme.AppTheme
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject
import javax.inject.Singleton

/** The website's themes: Dark (default), Light, Ocean, Sunset. Remembered across launches. */
@Singleton
class ThemeStore @Inject constructor(@ApplicationContext context: Context) {
    private val prefs = context.getSharedPreferences("ui", Context.MODE_PRIVATE)
    private val _theme = MutableStateFlow(AppTheme.of(prefs.getString(KEY_THEME, null)))
    val theme: StateFlow<AppTheme> = _theme
    val dark: StateFlow<Boolean> = _theme.map { it.isDark }.stateIn(CoroutineScope(Dispatchers.Main.immediate), SharingStarted.Eagerly, _theme.value.isDark)

    // A theme saved to the account (CloudSettings) arriving after sign-in.
    private val watch = android.content.SharedPreferences.OnSharedPreferenceChangeListener { p, k ->
        if (k == KEY_THEME) _theme.value = AppTheme.of(p.getString(KEY_THEME, null))
    }.also { prefs.registerOnSharedPreferenceChangeListener(it) }

    fun set(t: AppTheme) { prefs.edit().putString(KEY_THEME, t.wire).apply(); _theme.value = t }

    /** The quick moon/sun button: Light <-> the last dark theme. */
    fun toggle() {
        if (_theme.value.isDark) { prefs.edit().putString(KEY_LAST_DARK, _theme.value.wire).apply(); set(AppTheme.Light) }
        else set(AppTheme.of(prefs.getString(KEY_LAST_DARK, "dark")))
    }

    private companion object { const val KEY_THEME = "theme"; const val KEY_LAST_DARK = "last_dark" }
}
