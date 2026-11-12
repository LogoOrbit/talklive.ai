package app.talklive.e2e

import java.io.File
import java.net.HttpURLConnection
import java.net.ServerSocket
import java.net.URL
import java.nio.file.Files
import java.util.Collections

/**
 * Runs the real TalkLive server (server/index.js) on a free local port with a
 * throwaway data directory, so tests exercise the app against the same code
 * that runs in production. Needs `node` and the repo's node_modules.
 */
class LocalServer : AutoCloseable {
    val port: Int = ServerSocket(0).use { it.localPort }
    val url = "http://127.0.0.1:$port"
    private val dataDir: File = Files.createTempDirectory("tl-android-e2e").toFile()
    private val log = Collections.synchronizedList(mutableListOf<String>())
    private val process: Process

    init {
        val root = generateSequence(File(System.getProperty("user.dir")).absoluteFile) { it.parentFile }
            .firstOrNull { File(it, "server/index.js").exists() }
            ?: error("server/index.js not found above ${System.getProperty("user.dir")}")
        process = ProcessBuilder("node", "server/index.js")
            .directory(root)
            .redirectErrorStream(true)
            .apply {
                environment()["PORT"] = port.toString()
                environment()["DATA_DIR"] = dataDir.absolutePath
                environment()["NODE_ENV"] = "development"
                environment()["GIPHY_API_KEY"] = ""
                // A one-second chat counts toward the streak in tests.
                environment()["ENGAGE_GOOD_CALL_SECONDS"] = "1"
                // Never send real email, push or payments from tests: drop every
                // credential the machine running them happens to have.
                environment().keys.filter { k ->
                    listOf("RESEND", "SMTP", "MAIL", "SENDGRID", "POSTMARK", "FCM", "VAPID", "TWILIO", "ANTHROPIC", "OPENAI", "CLOUDFLARE", "METERED")
                        .any { k.uppercase().contains(it) }
                }.forEach { environment().remove(it) }
            }
            .start()
        Thread { process.inputStream.bufferedReader().forEachLine { log += it } }.apply { isDaemon = true }.start()
        waitUp()
    }

    /** The newest line in the server log matching [regex], group 1. */
    fun findInLog(regex: Regex): String? = synchronized(log) { log.asReversed().firstNotNullOfOrNull { regex.find(it)?.groupValues?.get(1) } }

    fun logTail(n: Int = 40): String = synchronized(log) { log.takeLast(n).joinToString("\n") }

    private fun waitUp() {
        repeat(120) {
            runCatching {
                (URL("$url/healthz").openConnection() as HttpURLConnection).run {
                    connectTimeout = 500; readTimeout = 500
                    if (responseCode in 200..299) return
                }
            }
            if (!process.isAlive) error("server exited:\n${logTail()}")
            Thread.sleep(250)
        }
        error("server never came up:\n${logTail()}")
    }

    override fun close() {
        process.destroy()
        if (!process.waitFor(5, java.util.concurrent.TimeUnit.SECONDS)) process.destroyForcibly()
        dataDir.deleteRecursively()
    }
}
