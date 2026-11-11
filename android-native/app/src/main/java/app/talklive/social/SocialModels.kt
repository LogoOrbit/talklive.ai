package app.talklive.social

import app.talklive.net.optNullableString
import org.json.JSONObject

/** "a:fox" (the server's avatar field) to "fox". */
internal fun animalOf(avatar: String?): String? = avatar?.takeIf { it.startsWith("a:") }?.substring(2)

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
) {
    val displayName: String get() = nickname?.takeIf { it.isNotBlank() } ?: username.ifBlank { "Stranger" }
    val canMessage: Boolean get() = dm == "open" || dm == "one"

    companion object {
        fun from(o: JSONObject) = Person(
            clientId = o.optString("clientId"),
            username = o.optString("username"),
            nickname = o.optNullableString("nickname"),
            countryCode = o.optNullableString("countryCode"),
            animal = animalOf(o.optNullableString("avatar")),
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
        )
    }
}

/** Someone asking to talk to you (a friend calling). */
data class IncomingCall(val fromClientId: String, val username: String, val countryCode: String?)

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
