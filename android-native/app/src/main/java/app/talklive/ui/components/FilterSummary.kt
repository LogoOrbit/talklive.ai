package app.talklive.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import app.talklive.R
import app.talklive.engage.Filters
import java.util.Locale

/**
 * What the next search is limited to, for Home and the searching screens:
 * "Women · 🇪🇸🇲🇽 · Spanish · music +1 · not 🇮🇳". Display only - matching
 * reads the filters from the registration, never this text. The gender
 * preference only counts with Plus, as on the server. Null when nothing is set.
 */
@Composable
fun filterSummary(f: Filters, premium: Boolean): String? {
    val parts = mutableListOf<String>()
    if (premium && f.prefGender == "female") parts += stringResource(R.string.women)
    if (premium && f.prefGender == "male") parts += stringResource(R.string.men)
    fun flags(list: List<String>) = list.take(3).mapNotNull { app.talklive.ui.social.flag(it) ?: it }.joinToString("") +
        if (list.size > 3) "+${list.size - 3}" else ""
    if (f.includeCountries.isNotEmpty()) parts += flags(f.includeCountries)
    if (f.prefLang.isNotBlank()) {
        val loc = Locale.getDefault()
        parts += Locale.forLanguageTag(f.prefLang).getDisplayLanguage(loc).replaceFirstChar { it.titlecase(loc) }
    }
    if (f.interests.isNotEmpty()) parts += f.interests.first() + if (f.interests.size > 1) " +${f.interests.size - 1}" else ""
    if (f.excludeCountries.isNotEmpty()) parts += stringResource(R.string.filters_not, flags(f.excludeCountries))
    return parts.takeIf { it.isNotEmpty() }?.joinToString(" · ")
}
