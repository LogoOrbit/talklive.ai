package app.talklive.ui.components

/**
 * What a person sees when something fails. Server messages written for people
 * pass through; anything that looks like code (exception names, stack lines,
 * JSON, status codes, internal keys) becomes a plain sentence instead.
 */
fun friendlyError(raw: String?, fallback: String = "Something went wrong. Please try again."): String {
    val m = raw?.trim().orEmpty()
    if (m.isEmpty() || m.length > 220) return fallback
    val looksLikeCode = Regex(
        """(?i)(exception|java\.|kotlin\.|org\.json|null\b|undefined|stack|\bat [a-z]+\.[a-z]|[{}\[\]<>]|\b[45]\d\d\b|errno|econn|etimedout|socket|timeout|_[a-z]+_|^[a-z]+[A-Z][a-zA-Z]*$|^[a-z_]+$|::|=>|\(\))""",
    ).containsMatchIn(m)
    if (looksLikeCode) {
        return if (Regex("(?i)timeout|etimedout|econn|socket|network|unreachable").containsMatchIn(m))
            "No connection. Check your internet and try again." else fallback
    }
    return m
}
