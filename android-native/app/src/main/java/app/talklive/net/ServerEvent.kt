package app.talklive.net

import org.json.JSONObject

data class Partner(
    val clientId: String,
    val username: String,
    val country: String?,
    val countryCode: String?,
    val animal: String?,
    val premium: Boolean,
    val timezone: String? = null,
    val lang: String? = null,
    val interests: List<String> = emptyList(),
    val films: List<app.talklive.engage.Film> = emptyList(),
    val friendId: String? = null,
    /** Gold ring: Plus or the invite reward (premium is Plus itself). */
    val ring: Boolean = false,
    /** Their profile cover (spec 4) and talk-time badges (spec 3), when the server sends them. */
    val cover: String? = null,
    val badges: app.talklive.social.BadgeSet? = null,
) {
    companion object {
        fun from(json: JSONObject?) = Partner(
            clientId = json?.optString("clientId").orEmpty(),
            username = json?.optString("username")?.takeIf { it.isNotBlank() } ?: "Stranger",
            country = json?.optNullableString("country"),
            countryCode = json?.optNullableString("countryCode"),
            animal = json?.optNullableString("animal"),
            premium = json?.optBoolean("premium") ?: false,
            timezone = json?.optNullableString("timezone"),
            lang = json?.optNullableString("lang"),
            films = app.talklive.engage.Film.list(json?.optJSONArray("films")),
            friendId = json?.optNullableString("friendId"),
            ring = json?.optBoolean("ring") ?: false,
            cover = json?.optNullableString("cover"),
            badges = app.talklive.social.BadgeSet.from(json?.optJSONObject("badges")),
            interests = json?.optJSONArray("interests")?.let { a -> (0 until a.length()).map { a.optString(it) }.filter { it.isNotBlank() } }.orEmpty(),
        )
    }
}

/** Events from the TalkLive Socket.IO server that the call flow reacts to. */
sealed interface ServerEvent {
    data object Registered : ServerEvent
    data object NeedsRegister : ServerEvent
    /** [waitingForGender]: "male"/"female" while a Men/Women filter is holding the search (it can be widened). */
    data class Waiting(val estimatedSeconds: Int?, val waitingForGender: String? = null) : ServerEvent
    /** The search's filters changed (the fallback relaxed country/language); the gender filter may still hold. */
    data class SearchStatus(val waitingForGender: String?) : ServerEvent
    /**
     * [voice]: the server wants a Voice check summary from this phone in this call.
     * [filtered]: this person's own Men / Women filter chose the partner, so
     * "Not who I filtered for" may be offered.
     * [pairId]: names this pairing, so a call that dropped and came back is recognised.
     */
    data class Matched(
        val initiator: Boolean, val partner: Partner, val callback: Boolean = false, val mode: String = "talk",
        val voice: Boolean = false, val filtered: Boolean = false, val pairId: String? = null,
    ) : ServerEvent
    /** Our socket dropped mid-call and came back in time: the call is ours again. */
    data class CallResumed(val pairId: String?) : ServerEvent
    /** The partner's socket dropped and came back. */
    data object PartnerResumed : ServerEvent
    /** A text message from the stranger in a text chat. */
    data class StrangerMessage(val id: String, val text: String, val gifUrl: String?, val replyTo: String?, val ts: Long) : ServerEvent
    data object StrangerTyping : ServerEvent
    data class StrangerReaction(val id: String, val emoji: String, val on: Boolean) : ServerEvent
    /** [offline]: their connection dropped (the server holds the call ~2 min for them to come back), not just an app switch. */
    data class PartnerAway(val away: Boolean, val offline: Boolean = false) : ServerEvent
    /** like / laugh / clap / heart, sent during a voice call. */
    data class Reaction(val type: String) : ServerEvent
    data class MutualHeart(val partner: Partner) : ServerEvent
    data class RatePrompt(val token: String, val seconds: Int) : ServerEvent
    data class StrangerChatBlocked(val reason: String) : ServerEvent
    /** A mini-game message from the partner (public/games.js protocol). */
    data class Game(val data: JSONObject) : ServerEvent
    /** The text-chat partner asks to switch to a voice call. */
    data class VoiceInvite(val username: String) : ServerEvent
    data class VoiceInviteAccepted(val token: String) : ServerEvent
    data class VoiceInviteDeclined(val username: String) : ServerEvent
    data class Signal(val data: JSONObject) : ServerEvent
    data class PartnerLeft(val reason: String, val username: String) : ServerEvent
    data class PartnerMic(val muted: Boolean) : ServerEvent
    data class SearchRefused(val reason: String) : ServerEvent
    data object Banned : ServerEvent
}

internal fun JSONObject.optNullableString(key: String): String? =
    if (isNull(key)) null else optString(key).takeIf { it.isNotBlank() }

/**
 * The banned screen's data: how long, why and where an appeal stands. [state]
 * is none, open or answered; [reply] is the owner's answer to the latest appeal.
 */
data class BanInfo(
    val until: Long,
    val reason: String,
    val permanent: Boolean,
    val state: String,
    val appealText: String?,
    val reply: String?,
    val canAppeal: Boolean,
)

/** A moderator's warning; must be acknowledged before talking again. */
data class OwnerWarning(val id: String, val reason: String, val message: String)
