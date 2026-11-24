package app.talklive.social

import app.talklive.net.optNullableString
import org.json.JSONObject

/**
 * The server's avatar field to the app's avatar id: "a:fox" is the animal "fox",
 * "c:wizard" is a character (its id keeps the "c:" prefix, see ui/animals/Characters.kt),
 * and a bare id is taken as is.
 */
fun animalOf(avatar: String?): String? {
    val a = avatar?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    return if (a.startsWith("a:")) a.substring(2).ifEmpty { null } else a
}

/** Talk-time badges as the server reports them (spec 3): the one shown by the name, all earned ids, hours talked. */
data class BadgeSet(val top: String?, val earned: List<String>, val hours: Double, val rank: Int? = null) {
    companion object {
        /** Null when the server sent none (older server): nothing is shown. */
        fun from(o: JSONObject?): BadgeSet? {
            if (o == null) return null
            val arr = o.optJSONArray("earned")
            val earned = if (arr == null) emptyList() else (0 until arr.length()).map { arr.optString(it) }.filter { it.isNotBlank() }
            val top = if (o.isNull("top")) null else o.optString("top").takeIf { it.isNotBlank() }
            val hours = o.optDouble("hours", 0.0).let { if (it.isNaN()) 0.0 else it }
            val rank = if (o.isNull("rank")) null else o.optInt("rank", 0).takeIf { it in 1..5 }
            return BadgeSet(top ?: earned.lastOrNull(), earned, hours, rank)
        }
    }
}

data class LastMessage(
    val mine: Boolean, val text: String, val gif: Boolean, val voice: Boolean, val ts: Long, val seen: Boolean,
    val delivered: Boolean = seen, val id: String = "",
) {
    /** What the list's tick shows; the same ladder as a bubble in the thread. */
    val status: MsgStatus get() = when { seen -> MsgStatus.Seen; delivered -> MsgStatus.Delivered; else -> MsgStatus.Sent }

    private fun sameMessage(o: LastMessage) = mine == o.mine && (if (id.isNotBlank() && o.id.isNotBlank()) id == o.id else ts == o.ts)

    /**
     * This message as just reported, without losing what is already known
     * about it: a receipt never goes back (a stale list from the server must not
     * turn "Seen" into "Sent"), and an older snapshot of our own message does not
     * replace a newer one.
     */
    fun after(known: LastMessage?): LastMessage = when {
        known == null || !mine || !known.mine -> this
        sameMessage(known) -> copy(seen = seen || known.seen, delivered = delivered || seen || known.delivered || known.seen, id = id.ifBlank { known.id })
        known.ts > ts -> known
        else -> this
    }

    fun raised(to: MsgStatus): LastMessage =
        if (!mine || to.rank <= status.rank) this else copy(seen = seen || to == MsgStatus.Seen, delivered = true)

    val preview: String get() = when {
        voice -> "🎤 Voice message"
        gif -> "GIF"
        else -> text
    }

    companion object {
        fun from(o: JSONObject?) = o?.let {
            LastMessage(it.optBoolean("mine"), it.optString("text"), it.optBoolean("gif"), it.optBoolean("voice"), it.optLong("ts"), it.optBoolean("seen"),
                it.optBoolean("delivered") || it.optBoolean("seen"), it.optString("id"))
        }
    }
}

data class Person(
    val clientId: String,
    val username: String,
    /** The private name this user gave a friend, shown instead of their username. */
    val nickname: String?,
    val countryCode: String?,
    val animal: String?,
    val friendId: String?,
    val online: Boolean,
    val lastSeen: Long?,
    val last: LastMessage?,
    val pinned: Boolean = false,
    /** Whether a message can be sent: "open"/"one" yes; "accept", "waiting", "request" not yet. */
    val dm: String = "open",
    val ts: Long = 0,
    /** For people met at random: "talk" (a voice call) or "chat" (text). */
    val mode: String = "chat",
    val durationSeconds: Int = 0,
    /** A Plus member: their name shows in gold. */
    val premium: Boolean = false,
    /** Hours (UTC, 0-23, `to` exclusive) this friend is usually online, if known. */
    val usualFrom: Int? = null,
    val usualTo: Int? = null,
    /** This user asked to be told when they come online (the bell). */
    val alert: Boolean = false,
    /** Their profile cover id (spec 4), already the effective one: null for none. */
    val cover: String? = null,
    /** Their talk-time badges (spec 3); null while the server sends none. */
    val badges: BadgeSet? = null,
) {
    val displayName: String get() = nickname?.takeIf { it.isNotBlank() } ?: username.ifBlank { "Stranger" }
    val canMessage: Boolean get() = dm == "open" || dm == "one"

    companion object {
        fun from(o: JSONObject) = Person(
            clientId = o.optString("clientId"),
            username = o.optString("username"),
            nickname = o.optNullableString("nickname"),
            countryCode = o.optNullableString("countryCode"),
            animal = animalOf(o.optNullableString("avatar") ?: o.optNullableString("animal")),
            friendId = o.optNullableString("friendId"),
            online = o.optBoolean("online"),
            lastSeen = if (o.isNull("lastSeen")) null else o.optLong("lastSeen").takeIf { it > 0 },
            last = LastMessage.from(o.optJSONObject("last")),
            pinned = o.optBoolean("pinned"),
            dm = o.optString("dm", "open"),
            ts = o.optLong("ts"),
            mode = o.optString("mode", "chat"),
            durationSeconds = o.optInt("durationSeconds"),
            premium = o.optBoolean("premium"),
            usualFrom = o.optJSONObject("usual")?.optInt("from"),
            usualTo = o.optJSONObject("usual")?.optInt("to"),
            alert = o.optBoolean("alert"),
            cover = o.optNullableString("cover"),
            badges = BadgeSet.from(o.optJSONObject("badges")),
        )
    }
}

enum class MsgStatus {
    Sending, Sent, Delivered, Seen, Failed;

    /** Order of a message's life: receipts only ever move up this ladder. */
    val rank: Int get() = when (this) { Failed -> 0; Sending -> 1; Sent -> 2; Delivered -> 3; Seen -> 4 }
}

/** A Giphy GIF as the server accepts it (server/index.js cleanGif). */
data class Gif(val url: String, val preview: String, val w: Int, val h: Int, val alt: String) {
    fun json(): org.json.JSONObject = org.json.JSONObject().put("url", url).put("preview", preview).put("w", w).put("h", h).put("alt", alt)
}

data class ChatMessage(
    val id: String,
    val mine: Boolean,
    val text: String,
    val ts: Long,
    val replyTo: String? = null,
    val gifUrl: String? = null,
    /** Full GIF, kept on our own outgoing messages so a retry can resend it. */
    val gif: Gif? = null,
    val voiceMs: Long? = null,
    val status: MsgStatus = MsgStatus.Sent,
    val failReason: app.talklive.data.UiText? = null,
    /** Reactions on a text-chat message (stranger chat), by who left them. */
    val myReaction: String? = null,
    val theirReaction: String? = null,
    val edited: Boolean = false,
    /** Server id of a voice note's audio (fetched with voice-note-get). */
    val voiceId: String? = null,
    /** Disappearing messages: when this one goes (null = it stays). */
    val exp: Long? = null,
    /** A reply or reaction to a story: which one. */
    val story: StoryRef? = null,
) {
    companion object {
        fun from(o: JSONObject, me: String): ChatMessage {
            // reactions: { emoji: [clientIds] }
            var mine: String? = null
            var theirs: String? = null
            o.optJSONObject("reactions")?.let { r ->
                r.keys().forEach { emoji ->
                    val who = r.optJSONArray(emoji) ?: return@forEach
                    for (i in 0 until who.length()) if (who.optString(i) == me) mine = emoji else theirs = emoji
                }
            }
            return base(o, me).copy(myReaction = mine, theirReaction = theirs, edited = o.optBoolean("edited") || o.has("editedAt"))
        }

        private fun base(o: JSONObject, me: String) = ChatMessage(
            id = o.optString("id"),
            mine = o.optString("from") == me || o.optString("fromClientId") == me,
            text = o.optString("text"),
            ts = o.optLong("ts"),
            replyTo = o.optNullableString("replyTo"),
            gifUrl = o.optJSONObject("gif")?.optNullableString("url"),
            voiceMs = o.optJSONObject("voice")?.optLong("ms"),
            voiceId = o.optJSONObject("voice")?.optString("id")?.takeIf { it.isNotBlank() },
            status = when {
                o.optBoolean("seen") -> MsgStatus.Seen
                o.optBoolean("delivered") -> MsgStatus.Delivered
                else -> MsgStatus.Sent
            },
            exp = o.optLong("exp").takeIf { it > 0 },
            story = o.optJSONObject("story")?.let { st ->
                StoryRef(st.optString("id"), st.optString("owner"), st.optString("kind", "reply"), st.optNullableString("emoji"),
                    st.optString("text"), st.optString("bg", "blue"), st.optNullableString("gif"))
            },
        )
    }
}

/** Someone asking to talk to you (a friend calling). */
/** [answering]: accepted here, waiting for the call to connect. */
data class IncomingCall(val fromClientId: String, val username: String, val countryCode: String?, val answering: Boolean = false)

/** Your call to a friend while it rings. */
data class OutgoingCall(val person: Person, val status: String = "ringing")

data class FoundUser(
    val clientId: String,
    val friendId: String,
    val username: String,
    val countryCode: String?,
    val animal: String?,
    val isFriend: Boolean,
    val pending: Boolean,
    val online: Boolean,
)

/** Someone this user blocked. */
data class BlockedPerson(val clientId: String, val username: String, val wasFriend: Boolean)

/** An item in the activity list: a missed friend call or an accepted request. */
data class ActivityItem(val id: String, val type: String, val fromClientId: String, val username: String, val ts: Long)

/** A conversation's disappearing-messages setting, as this person sees it. */
data class Disappearing(val on: Boolean, val byMe: Boolean = false, val byName: String? = null)

/** Likes (spec 8): how many people liked you, how many became matches, and (Plus only) who. */
data class LikesSummary(val count: Int = 0, val matches: Int = 0, val people: List<Person> = emptyList())

/** A GIF placed on a story; [x] and [y] are its centre, 0..1 across and down. */
data class StoryGif(val url: String, val preview: String, val w: Int, val h: Int, val x: Float, val y: Float, val s: Float = 1f, val r: Float = 0f, val id: Long = StoryLayer.nextId())

/**
 * Text or an emoji placed on a story: centre ([x], [y], 0..1), size [s] (1 = normal) and turn [r]
 * in degrees. Text has a colour or gradient [c] ("#rrggbb" or "g:name"), may sit on a highlight
 * pill [b], and has a font style [f] and alignment [a]. [m] is a little motion it plays.
 */
data class StoryLayer(
    val id: Long, val kind: String, val text: String, val x: Float, val y: Float,
    val s: Float = 1f, val r: Float = 0f, val c: String = "#ffffff", val b: Boolean = false,
    val f: String = "classic", val a: String = "center", val m: String = "none",
) {
    fun json(): org.json.JSONObject = org.json.JSONObject().put("t", kind).put("text", text).put("x", x.toDouble()).put("y", y.toDouble())
        .put("s", s.toDouble()).put("r", r.toDouble()).also {
            if (kind == "text") {
                it.put("c", c)
                if (b) it.put("b", true)
                if (f != "classic") it.put("f", f)
                if (a != "center") it.put("a", a)
            }
            if (m != "none") it.put("m", m)
        }

    companion object {
        private var seq = System.nanoTime()
        fun nextId(): Long = ++seq
        fun from(o: org.json.JSONObject) = StoryLayer(nextId(), o.optString("t", "text"), o.optString("text"),
            o.optDouble("x", 0.5).toFloat(), o.optDouble("y", 0.5).toFloat(), o.optDouble("s", 1.0).toFloat(), o.optDouble("r", 0.0).toFloat(),
            o.optString("c", "#ffffff"), o.optBoolean("b"), o.optString("f", "classic"), o.optString("a", "center"), o.optString("m", "none"))
    }
}

fun StoryGif.json(): org.json.JSONObject = org.json.JSONObject().put("url", url).put("preview", preview).put("w", w).put("h", h)
    .put("x", x.toDouble()).put("y", y.toDouble()).put("s", s.toDouble()).put("r", r.toDouble())

fun storyGifFrom(o: org.json.JSONObject) = StoryGif(o.optString("url"), o.optString("preview"), o.optInt("w"), o.optInt("h"),
    o.optDouble("x", 0.5).toFloat(), o.optDouble("y", 0.5).toFloat(), o.optDouble("s", 1.0).toFloat(), o.optDouble("r", 0.0).toFloat())

/** A story: text on a colour, with GIFs on it. Gone after 24 hours. */
data class Story(
    val id: String, val text: String, val bg: String, val gifs: List<StoryGif>, val ts: Long, val seen: Boolean,
    /** Text and emoji placed on it (newer stories); when present, [text] is only a summary. */
    val layers: List<StoryLayer> = emptyList(),
    /** Who has seen it; only for your own stories (likes first, each with any reaction they sent). */
    val viewers: List<StoryViewerInfo> = emptyList(),
    /** You put a heart on this friend's story. */
    val liked: Boolean = false,
    /** Hearts on your own story. */
    val likeCount: Int = 0,
) {
    val views: List<String> get() = viewers.map { it.name }
}

/** One person who saw your story. */
data class StoryViewerInfo(val clientId: String, val name: String, val liked: Boolean, val reaction: String?)

/** A reply or reaction message points at the story it answered (shown above the message in the inbox). */
data class StoryRef(val id: String, val owner: String, val kind: String, val emoji: String?, val text: String, val bg: String, val gif: String?)

/** One circle in the stories row: you, or a friend with live stories. */
data class StoryPerson(val clientId: String, val mine: Boolean, val name: String, val animal: String?, val stories: List<Story>) {
    val unseen: Boolean get() = stories.any { !it.seen }
}
