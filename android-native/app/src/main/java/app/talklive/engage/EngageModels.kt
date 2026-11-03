package app.talklive.engage

import org.json.JSONArray
import org.json.JSONObject

data class Streak(val count: Int, val best: Int, val doneToday: Boolean)
data class Week(val calls: Int, val countries: Int, val longestSeconds: Int)

/** Daily streak, country passport and this week's stats (server/engage.js). */
data class Engage(val streak: Streak, val passport: List<String>, val week: Week) {
    companion object {
        fun from(o: JSONObject): Engage {
            val s = o.optJSONObject("streak") ?: JSONObject()
            val w = o.optJSONObject("week") ?: JSONObject()
            val p = o.optJSONArray("passport") ?: JSONArray()
            return Engage(
                Streak(s.optInt("count"), s.optInt("best"), s.optBoolean("doneToday")),
                (0 until p.length()).map { p.optString(it) }.filter { it.length == 2 },
                Week(w.optInt("calls"), w.optInt("countries"), w.optInt("longest")),
            )
        }
    }
}

/** A favourite film or show: Apple artwork and link, as the website stores them. */
data class Film(val type: String, val id: Long, val title: String, val year: String, val art: String, val url: String) {
    fun toJson(): JSONObject = JSONObject().put("t", type).put("id", id).put("title", title).put("year", year).put("art", art).put("url", url)

    companion object {
        fun from(o: JSONObject?): Film? {
            o ?: return null
            val art = o.optString("art").takeIf { it.startsWith("https://") } ?: return null
            return Film(o.optString("t"), o.optLong("id"), o.optString("title"), o.optString("year"), art, o.optString("url"))
        }
        fun list(a: JSONArray?): List<Film> = if (a == null) emptyList() else (0 until a.length()).mapNotNull { from(a.optJSONObject(it)) }
    }
}

data class Premium(val active: Boolean, val expiresAt: Long?, val checkout: Boolean)

data class Referral(val code: String, val verified: Int, val progress: Int, val needed: Int, val rewardedHours: Int) {
    val link: String get() = "https://talklive.app/?ref=$code"
}

data class Like(val clientId: String, val username: String, val countryCode: String?, val at: Long, val online: Boolean)

/** Who tapped the heart on you. Without Plus only the count and countries are shown. */
data class Likes(val count: Int, val locked: Boolean, val countries: List<String>, val list: List<Like>)

/** Match filters, sent with registration like the website's filters panel. */
data class Filters(
    val interests: List<String> = emptyList(),
    val includeCountries: List<String> = emptyList(),
    val excludeCountries: List<String> = emptyList(),
    val prefGender: String = "any",
    val prefLang: String = "",
) {
    val activeCount: Int get() = listOf(interests.isNotEmpty(), includeCountries.isNotEmpty(), excludeCountries.isNotEmpty(), prefGender != "any", prefLang.isNotEmpty()).count { it }
}
