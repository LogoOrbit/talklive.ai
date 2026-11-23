package app.talklive.social

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** An unfinished story: kept on the phone until it is posted or discarded. */
data class StoryDraft(val text: String, val bg: String, val gifs: List<StoryGif>) {
    val isEmpty: Boolean get() = text.isBlank() && gifs.isEmpty()
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
        StoryDraft(
            o.optString("text"), o.optString("bg", "blue"),
            (0 until arr.length()).mapNotNull { arr.optJSONObject(it) }.map {
                StoryGif(it.optString("url"), it.optString("preview"), it.optInt("w"), it.optInt("h"), it.optDouble("x", 0.5).toFloat(), it.optDouble("y", 0.5).toFloat())
            },
        ).takeIf { !it.isEmpty }
    }.getOrNull()

    fun save(d: StoryDraft) {
        if (d.isEmpty) { clear(); return }
        val arr = JSONArray()
        d.gifs.forEach { arr.put(JSONObject().put("url", it.url).put("preview", it.preview).put("w", it.w).put("h", it.h).put("x", it.x.toDouble()).put("y", it.y.toDouble())) }
        prefs?.edit()?.putString("draft", JSONObject().put("text", d.text).put("bg", d.bg).put("gifs", arr).toString())?.apply()
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
