package app.talklive.engage

import android.content.Context
import app.talklive.net.TalkSocket
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import javax.inject.Inject
import javax.inject.Singleton

/** Something worth celebrating after a call. */
sealed interface EngageMoment {
    data class StreakUp(val days: Int) : EngageMoment
    data class NewStamp(val countryCode: String) : EngageMoment
}

/**
 * Streak and passport, Plus status, referrals, likes, favourite films,
 * feedback and match filters: the website's engagement features.
 */
@Singleton
class EngageRepository(
    context: Context,
    private val socket: TalkSocket,
    prefsName: String,
) {
    @Inject constructor(@ApplicationContext context: Context, socket: TalkSocket) : this(context, socket, "engage")

    private val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val http = OkHttpClient()

    private val _engage = MutableStateFlow<Engage?>(null)
    val engage: StateFlow<Engage?> = _engage

    private val _moments = MutableSharedFlow<EngageMoment>(extraBufferCapacity = 8)
    val moments: SharedFlow<EngageMoment> = _moments

    private val _premium = MutableStateFlow(Premium(false, null, false))
    val premium: StateFlow<Premium> = _premium

    private val _referral = MutableStateFlow<Referral?>(null)
    val referral: StateFlow<Referral?> = _referral

    /** "I am" and age group, as in the website's Settings: used for gender filters and audience stats. */
    private val _myGender = MutableStateFlow(prefs.getString("my_gender", "unspecified") ?: "unspecified")
    val myGender: StateFlow<String> = _myGender
    private val _ageGroup = MutableStateFlow(prefs.getString("age_group", "unspecified") ?: "unspecified")
    val ageGroup: StateFlow<String> = _ageGroup

    fun setMyGender(g: String) { prefs.edit().putString("my_gender", g).apply(); _myGender.value = g; socket.register() }
    fun setAgeGroup(a: String) { prefs.edit().putString("age_group", a).apply(); _ageGroup.value = a; socket.register() }

    /** Server feature flags (window.TL_FLAGS in /config.js). */
    private val _flags = MutableStateFlow<Set<String>>(emptySet())
    val flags: StateFlow<Set<String>> = _flags

    fun loadFlags() = scope.launch(Dispatchers.IO) {
        runCatching {
            http.newCall(Request.Builder().url("${app.talklive.net.ServerConfig.url}/config.js").build()).execute().use { r ->
                val js = r.body?.string().orEmpty()
                val json = Regex("TL_FLAGS\\s*=\\s*(\\{.*?\\});").find(js)?.groupValues?.get(1) ?: return@use
                val o = JSONObject(json)
                _flags.value = o.keys().asSequence().filter { o.optBoolean(it) }.toSet()
            }
        }
    }

    private val _films = MutableStateFlow<List<Film>>(emptyList())
    val films: StateFlow<List<Film>> = _films

    private val _filters = MutableStateFlow(loadFilters())
    val filters: StateFlow<Filters> = _filters

    init {
        socket.on("engage-state") { a -> (a.firstOrNull() as? JSONObject)?.let { _engage.value = Engage.from(it) } }
        socket.on("engage-update") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            o.optJSONObject("state")?.let { _engage.value = Engage.from(it) }
            if (o.optBoolean("bump")) _engage.value?.let { _moments.tryEmit(EngageMoment.StreakUp(it.streak.count)) }
            o.optString("stamp").takeIf { it.length == 2 }?.let { _moments.tryEmit(EngageMoment.NewStamp(it)) }
        }
        socket.on("premium-status") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            _premium.value = Premium(o.optBoolean("premium"), if (o.isNull("expiresAt")) null else o.optLong("expiresAt"), o.optBoolean("checkout"), o.optBoolean("play"))
        }
        socket.on("referral-status") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            val code = o.optString("code")
            if (code.isNotBlank()) {
                _referral.value = Referral(code, o.optInt("verified"), o.optInt("progress"), o.optInt("needed", 3), o.optInt("rewardedHours"))
            }
        }
        socket.on("fav-films") { a ->
            val o = a.firstOrNull() as? JSONObject ?: return@on
            if (o.optBoolean("self")) _films.value = Film.list(o.optJSONArray("films"))
        }
        // Filters ride along with every registration.
        socket.registerExtras = {
            filtersJson(_filters.value).apply {
                prefs.getString("referral", null)?.let { put("referralCode", it) }
                put("gender", _myGender.value)
                put("ageGroup", _ageGroup.value)
            }
        }
        // Our own films once registered.
        scope.launch {
            socket.events.collect { if (it == app.talklive.net.ServerEvent.Registered) socket.emit("get-fav-films", JSONObject()) }
        }
    }

    fun requestReferral() = socket.emit("get-referral-link")

    /** An invite code from a talklive.app/?ref= link; sent with the next registrations. */
    fun setReferral(code: String) {
        if (prefs.getString("referral", null) == null) {
            prefs.edit().putString("referral", code).apply()
            socket.register()
        }
    }

    suspend fun likes(): Likes? {
        val o = socket.ask("get-likes") ?: return null
        val list = o.optJSONArray("list")?.let { arr ->
            (0 until arr.length()).mapNotNull { arr.optJSONObject(it) }.map {
                Like(it.optString("clientId"), it.optString("username"), it.optString("countryCode").ifBlank { null }, it.optLong("at"), it.optBoolean("online"))
            }
        }.orEmpty()
        val countries = o.optJSONArray("countries")?.let { arr -> (0 until arr.length()).map { arr.optString(it) } }.orEmpty()
        return Likes(o.optInt("count"), o.optBoolean("locked"), countries, list)
    }

    suspend fun saveFilms(films: List<Film>): Result<List<Film>> {
        val payload = JSONObject().put("films", JSONArray(films.take(3).map { it.toJson() }))
        val res = try {
            socket.request("set-fav-films", payload, "set-fav-films-result")
        } catch (_: TimeoutCancellationException) {
            return Result.failure(Exception("The server did not answer. Please try again."))
        }
        if (!res.optBoolean("ok")) return Result.failure(Exception(res.optString("error").ifBlank { "Could not save." }))
        val saved = Film.list(res.optJSONArray("films"))
        _films.value = saved
        return Result.success(saved)
    }

    /** Films (Apple movies) and shows (Apple TV seasons, one per show), like public/fav-films.js. */
    suspend fun searchFilms(query: String): List<Film> = withContext(Dispatchers.IO) {
        val q = URLEncoder.encode(query.trim(), "UTF-8")
        if (q.isBlank()) return@withContext emptyList()
        val movies = runCatching {
            get("https://itunes.apple.com/search?country=us&media=movie&entity=movie&limit=12&term=$q")
                ?.optJSONArray("results")?.let { arr ->
                    (0 until arr.length()).mapNotNull { arr.optJSONObject(it) }.filter {
                        it.optString("kind") == "feature-movie" && it.optString("trackExplicitness") != "explicit" &&
                            it.has("artworkUrl100") && it.has("trackViewUrl")
                    }.map {
                        Film("movie", it.optLong("trackId"), it.optString("trackName"), it.optString("releaseDate").take(4), it.optString("artworkUrl100"), it.optString("trackViewUrl"))
                    }
                }
        }.getOrNull().orEmpty()
        val shows = runCatching {
            get("https://itunes.apple.com/search?country=us&media=tvShow&entity=tvSeason&limit=25&term=$q")
                ?.optJSONArray("results")?.let { arr ->
                    (0 until arr.length()).mapNotNull { arr.optJSONObject(it) }
                        .filter { it.has("artistId") && it.has("artworkUrl100") && it.optString("collectionExplicitness") != "explicit" }
                        .groupBy { it.optLong("artistId") }.values.take(5)
                        .mapNotNull { seasons ->
                            val r = seasons.minByOrNull { it.optString("releaseDate") } ?: return@mapNotNull null
                            val url = r.optString("artistViewUrl").ifBlank { r.optString("collectionViewUrl") }
                            if (url.isBlank()) null else Film("tv", r.optLong("artistId"), r.optString("artistName"), "", r.optString("artworkUrl100"), url)
                        }
                }
        }.getOrNull().orEmpty()
        (movies.take(8) + shows).distinctBy { it.type to it.id }
    }

    fun sendFeedback(text: String) {
        val body = text.trim().take(1000)
        if (body.isNotEmpty()) socket.emit("feedback", JSONObject().put("text", body))
    }

    fun setFilters(f: Filters) {
        _filters.value = f
        prefs.edit()
            .putString("interests", f.interests.joinToString("\n"))
            .putString("include", f.includeCountries.joinToString(","))
            .putString("exclude", f.excludeCountries.joinToString(","))
            .putString("gender", f.prefGender)
            .putString("lang", f.prefLang)
            .apply()
        socket.register()
    }

    private fun loadFilters() = Filters(
        interests = prefs.getString("interests", "").orEmpty().split("\n").filter { it.isNotBlank() },
        includeCountries = prefs.getString("include", "").orEmpty().split(",").filter { it.length == 2 },
        excludeCountries = prefs.getString("exclude", "").orEmpty().split(",").filter { it.length == 2 },
        prefGender = prefs.getString("gender", "any") ?: "any",
        prefLang = prefs.getString("lang", "") ?: "",
    )

    private fun filtersJson(f: Filters) = JSONObject()
        .put("interests", JSONArray(f.interests))
        .put("includeCountries", JSONArray(f.includeCountries))
        .put("excludeCountries", JSONArray(f.excludeCountries))
        .put("prefGender", f.prefGender)
        .apply { if (f.prefLang.isNotBlank()) put("prefLang", f.prefLang) }

    private fun get(url: String): JSONObject? =
        http.newCall(Request.Builder().url(url).build()).execute().use { if (it.isSuccessful) JSONObject(it.body?.string().orEmpty()) else null }
}
