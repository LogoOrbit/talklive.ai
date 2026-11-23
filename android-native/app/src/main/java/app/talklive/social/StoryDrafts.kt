package app.talklive.social

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** An unfinished story: kept on the phone until it is posted or discarded. */
data class StoryDraft(val text: String, val bg: String, val gifs: List<StoryGif>, val layers: List<StoryLayer> = emptyList()) {
    val isEmpty: Boolean get() = text.isBlank() && gifs.isEmpty() && layers.isEmpty()
    /** What older apps show: the words on it, one per line. */
    val summary: String get() = (listOf(text) + layers.filter { it.kind == "text" }.map { it.text }).filter { it.isNotBlank() }.joinToString("\n")
}

/**
 * Story drafts survive Back, a phone call, or the app being closed: every edit
 * is saved here, and only a confirmed post or an explicit "Discard" clears it.
 */
object StoryDrafts {
    private var prefs: android.content.SharedPreferences? = null

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences("story_draft", Context.MODE_PRIVATE)
    }

    fun load(): StoryDraft? = runCatching {
        val o = JSONObject(prefs?.getString("draft", null) ?: return null)
        val arr = o.optJSONArray("gifs") ?: JSONArray()
        val ls = o.optJSONArray("layers") ?: JSONArray()
        StoryDraft(
            o.optString("text"), o.optString("bg", "blue"),
            (0 until arr.length()).mapNotNull { arr.optJSONObject(it) }.map { storyGifFrom(it) },
            (0 until ls.length()).mapNotNull { ls.optJSONObject(it) }.map { StoryLayer.from(it) },
        ).takeIf { !it.isEmpty }
    }.getOrNull()

    fun save(d: StoryDraft) {
        if (d.isEmpty) { clear(); return }
        val arr = JSONArray()
        d.gifs.forEach { arr.put(it.json()) }
        val ls = JSONArray()
        d.layers.forEach { ls.put(it.json()) }
        prefs?.edit()?.putString("draft", JSONObject().put("text", d.text).put("bg", d.bg).put("gifs", arr).put("layers", ls).toString())?.apply()
    }

    fun clear() { prefs?.edit()?.remove("draft")?.apply() }
}

/** Where a story being posted is, from the moment Post is pressed until friends can see it. */
data class StoryUpload(val stage: Stage, val error: String? = null) {
    enum class Stage { Waiting, Sending, Saved, Published, Failed }

    /** How far the ring around your avatar is filled; each step is a real event, not a timer. */
    val progress: Float get() = when (stage) {
        Stage.Waiting -> 0.08f
        Stage.Sending -> 0.45f
        Stage.Saved -> 0.85f
        Stage.Published -> 1f
        Stage.Failed -> 1f
    }
}
