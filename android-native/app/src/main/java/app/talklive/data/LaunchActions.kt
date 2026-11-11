package app.talklive.data

import kotlinx.coroutines.flow.MutableStateFlow

/** What the app was opened to do: from a home-screen shortcut, or a link. */
object LaunchActions {
    enum class Action { Talk, Chat }

    /** Consumed by the main screen once it is ready. */
    val pending = MutableStateFlow<Action?>(null)

    /** Where a tapped notification leads: "chat:<clientId>" or "requests". */
    val open = MutableStateFlow<String?>(null)
}
