package app.talklive.social

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.Executors

/**
 * What the app last knew - friends and chats, each conversation's newest messages, and
 * friends' stories - kept on the phone so the inbox, a chat and the stories row show at
 * once on the next open, then update from the network. Tied to one profile: another
 * profile on this phone never sees it. Small (the newest 60 messages per chat), written
 * off the main thread, and every write is a whole-file replace so a crash cannot leave
 * half a file.
 */
object SocialCache {
    private const val PER_THREAD = 60
    private var dir: File? = null
    private val io = Executors.newSingleThreadExecutor { r -> Thread(r, "social-cache").apply { priority = Thread.MIN_PRIORITY } }

    fun init(context: Context) {
        dir = File(context.filesDir, "social-cache").apply { mkdirs() }
    }

    private fun file(name: String) = dir?.let { File(it, name) }
    private fun safe(id: String) = id.replace(Regex("[^A-Za-z0-9_-]"), "_").take(80)

    private fun write(name: String, owner: String, body: Any) {
        val f = file(name) ?: return
        val text = JSONObject().put("owner", owner).put("body", body).toString()
        io.execute {
            runCatching {
                val tmp = File(f.parentFile, f.name + ".tmp")
                tmp.writeText(text)
                tmp.renameTo(f)
            }
        }
    }

    private fun read(name: String, owner: String): Any? = runCatching {
        val f = file(name) ?: return null
        if (!f.exists()) return null
        val o = JSONObject(f.readText())
        if (o.optString("owner") != owner) null else o.opt("body")
    }.getOrNull()

    fun saveState(owner: String, state: JSONObject) = write("state.json", owner, state)
    fun state(owner: String): JSONObject? = read("state.json", owner) as? JSONObject

    fun saveStories(owner: String, people: JSONArray) = write("stories.json", owner, people)
    fun stories(owner: String): JSONArray? = read("stories.json", owner) as? JSONArray

    /** A conversation's newest page as the server sent it, trimmed to its newest messages. */
    fun saveThread(owner: String, history: JSONObject) {
        val id = history.optString("friendClientId").ifBlank { return }
        val msgs = history.optJSONArray("messages") ?: return
        val from = (msgs.length() - PER_THREAD).coerceAtLeast(0)
        val trimmed = JSONArray()
        for (i in from until msgs.length()) trimmed.put(msgs.opt(i))
        val copy = JSONObject(history.toString()).put("messages", trimmed)
        if (from > 0) copy.put("hasMore", true)
        write("t_${safe(id)}.json", owner, copy)
    }
    fun thread(owner: String, friendId: String): JSONObject? = read("t_${safe(friendId)}.json", owner) as? JSONObject

    /** Signed out or the profile changed: nothing of it stays. */
    fun clear() {
        val d = dir ?: return
        io.execute { runCatching { d.listFiles()?.forEach { it.delete() } } }
    }
}
