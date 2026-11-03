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
            interests = json?.optJSONArray("interests")?.let { a -> (0 until a.length()).map { a.optString(it) }.filter { it.isNotBlank() } }.orEmpty(),
        )
    }
}

/** Events from the TalkLive Socket.IO server that the call flow reacts to. */
sealed interface ServerEvent {
    data object Registered : ServerEvent
    data object NeedsRegister : ServerEvent
    data class Waiting(val estimatedSeconds: Int?) : ServerEvent
    data class Matched(val initiator: Boolean, val partner: Partner, val callback: Boolean = false, val mode: String = "talk") : ServerEvent
    /** A text message from the stranger in a text chat. */
    data class StrangerMessage(val id: String, val text: String, val gifUrl: String?, val replyTo: String?, val ts: Long) : ServerEvent
    data object StrangerTyping : ServerEvent
    data class StrangerReaction(val id: String, val emoji: String, val on: Boolean) : ServerEvent
    data class PartnerAway(val away: Boolean) : ServerEvent
    /** like / laugh / clap / heart, sent during a voice call. */
    data class Reaction(val type: String) : ServerEvent
    data class MutualHeart(val partner: Partner) : ServerEvent
    data class RatePrompt(val token: String, val seconds: Int) : ServerEvent
    data class StrangerChatBlocked(val reason: String) : ServerEvent
    /** A mini-game message from the partner (public/games.js protocol). */
    data class Game(val data: JSONObject) : ServerEvent
    data class Signal(val data: JSONObject) : ServerEvent
    data class PartnerLeft(val reason: String, val username: String) : ServerEvent
    data class PartnerMic(val muted: Boolean) : ServerEvent
    data class SearchRefused(val reason: String) : ServerEvent
    data object Banned : ServerEvent
}

internal fun JSONObject.optNullableString(key: String): String? =
    if (isNull(key)) null else optString(key).takeIf { it.isNotBlank() }

/** A moderator's warning; must be acknowledged before talking again. */
data class OwnerWarning(val id: String, val reason: String, val message: String)
