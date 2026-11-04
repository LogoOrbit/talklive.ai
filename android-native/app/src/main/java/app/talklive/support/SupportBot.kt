package app.talklive.support

/**
 * Instant answers in the help chat, from the same questions the website's help
 * centre covers (public/support-chat.js), written for the app. It only answers
 * when it is fairly sure; otherwise the chat says a person will reply.
 */
object SupportBot {
    data class Faq(val question: String, val keywords: List<String>, val answer: String)

    val FAQ = listOf(
        Faq("Is TalkLive free?", listOf("free", "cost", "price", "pay", "money"),
            "Yes. Calls and messages are free. TalkLive Plus adds extras like every filter, seeing who liked you and undoing a skip."),
        Faq("How do I start a call or skip someone?", listOf("start", "call", "skip", "next", "how"),
            "On the Talk tab, pick Voice or Text and tap Start. To move on, tap the big button twice. Turn on Auto-connect on the call screen to meet someone new each time a call ends."),
        Faq("My microphone is not working", listOf("mic", "microphone", "hear", "sound", "audio", "voice"),
            "Open your phone's Settings > Apps > TalkLive > Permissions and allow the microphone. Close other apps that may be using it (calls, recorders), check you are not muted, and that Bluetooth is connected to the right device."),
        Faq("It keeps searching", listOf("search", "searching", "wait", "nobody", "long", "match"),
            "Usually your filters are narrow or fewer people are online right now. Loosen or clear your filters, or keep the app open: you are matched the moment someone arrives."),
        Faq("The call keeps dropping", listOf("drop", "dropping", "disconnect", "lag", "connection", "internet"),
            "That is almost always the network. TalkLive tries to reconnect for 30 seconds. Move closer to your Wi-Fi or switch between Wi-Fi and mobile data."),
        Faq("I did not get my verification code", listOf("code", "verification", "verify", "email", "otp"),
            "Check your spam and promotions folders and that your email is spelled right. A code works for 10 minutes; you can ask for a new one a few times an hour. You can also continue with Google."),
        Faq("I forgot my password", listOf("forgot", "password", "reset", "login", "log"),
            "On the Log in screen tap Forgot password?, enter your account email, type the 6-digit code we send, and choose a new password."),
        Faq("How do I change my name or picture?", listOf("name", "change", "picture", "avatar", "profile", "edit"),
            "Open Profile and tap your picture or name. You can change your avatar and display name there (display names need a free account)."),
        Faq("How do I delete my account?", listOf("delete", "remove", "account", "erase", "data"),
            "Open Profile, scroll to the bottom and tap Delete account. You will confirm with your password (or type DELETE if you use Google). It cannot be undone."),
        Faq("How do I add a friend?", listOf("friend", "add", "id", "request"),
            "After a call or chat, tap Add friend. Or share Your ID from the Friends tab: the other person types it into Add friend. Once they accept, you can message and call each other any time."),
        Faq("My message will not send", listOf("message", "send", "sent", "link", "blocked"),
            "Links cannot be sent, to keep people safe from scams. If you are not friends yet, you can send one message until they accept. One of you may also have blocked the other."),
        Faq("How do I report someone?", listOf("report", "abuse", "harass", "rude", "creep", "scam"),
            "Tap the person on the call or chat, then Report. The conversation ends at once and they are not told who reported them. Our team reviews every report."),
        Faq("Does TalkLive record calls?", listOf("record", "recorded", "privacy", "safe", "store"),
            "No. Call audio is never recorded or stored."),
        Faq("What does TalkLive Plus include?", listOf("plus", "premium", "subscription", "subscribe", "include", "benefit"),
            "Every filter (gender and unlimited countries), seeing who liked you, undoing a skip, faster matching, a 💎 badge, and bringing back a broken streak once a month."),
        Faq("How do I cancel Plus or get a refund?", listOf("cancel", "refund", "unsubscribe", "charged", "billing"),
            "Plus bought in the app is managed by Google Play: open Play Store > your profile > Payments & subscriptions > Subscriptions > TalkLive. You keep Plus until the end of the period you paid for."),
        Faq("I was banned. Can I appeal?", listOf("ban", "banned", "appeal", "blocked", "paused"),
            "Bans follow reports that broke the Community Guidelines. If you think it was a mistake, send us a message here with your username and what happened."),
    )

    /** The best answer for [text], or null when nothing fits well enough. */
    fun answer(text: String): Faq? {
        val words = text.lowercase().split(Regex("[^\\p{L}\\p{N}]+")).filter { it.length >= 2 }.toSet()
        if (words.isEmpty()) return null
        val scored = FAQ.map { f ->
            val q = f.question.lowercase().split(Regex("[^\\p{L}\\p{N}]+")).filter { it.length >= 3 }.toSet()
            f to (words.count { it in f.keywords } * 2 + words.count { it in q })
        }.maxByOrNull { it.second } ?: return null
        return scored.first.takeIf { scored.second >= 2 }
    }
}
