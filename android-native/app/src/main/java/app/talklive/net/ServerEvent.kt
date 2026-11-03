package app.talklive.net

import org.json.JSONObject

data class Partner(
    val clientId: String,
    val username: String,
    val country: String?,
    val countryCode: String?,
    val animal: String?,
    val premium: Boolean,
) {
    companion object {
        fun from(json: JSONObject?) = Partner(
            clientId = json?.optString("clientId").orEmpty(),
            username = json?.optString("username")?.takeIf { it.isNotBlank() } ?: "Stranger",
            country = json?.optNullableString("country"),
            countryCode = json?.optNullableString("countryCode"),
            animal = json?.optNullableString("animal"),
            premium = json?.optBoolean("premium") ?: false,
        )
    }
}

/** Events from the TalkLive Socket.IO server that the call flow reacts to. */
sealed interface ServerEvent {
    data object Registered : ServerEvent
    data object NeedsRegister : ServerEvent
    data class Waiting(val estimatedSeconds: Int?) : ServerEvent
    data class Matched(val initiator: Boolean, val partner: Partner) : ServerEvent
    data class Signal(val data: JSONObject) : ServerEvent
    data class PartnerLeft(val reason: String, val username: String) : ServerEvent
    data class PartnerMic(val muted: Boolean) : ServerEvent
    data class SearchRefused(val reason: String) : ServerEvent
    data object Banned : ServerEvent
}

internal fun JSONObject.optNullableString(key: String): String? =
    if (isNull(key)) null else optString(key).takeIf { it.isNotBlank() }
