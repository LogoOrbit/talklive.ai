package app.talklive.net

import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

/**
 * One HTTP client for the whole app. Clients made from it share its
 * connection pool, so requests to talklive.app reuse an open connection
 * instead of repeating the TLS handshake each time.
 */
object Http {
    /**
     * Who is calling: the server treats a bare "okhttp/x" agent as a bot and
     * leaves it out of Online now, country counts and visitor stats.
     */
    val userAgent: String = runCatching {
        "TalkLive-Android/${app.talklive.BuildConfig.VERSION_NAME} (Linux; Android ${android.os.Build.VERSION.RELEASE}; ${android.os.Build.MODEL})"
    }.getOrDefault("TalkLive-Android/1.0 (Linux; Android)")

    val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        // IPv4 addresses first: on Wi-Fi networks with broken IPv6, every
        // request used to wait out the IPv6 attempt before trying IPv4.
        .dns(object : okhttp3.Dns { override fun lookup(hostname: String) = okhttp3.Dns.SYSTEM.lookup(hostname).sortedBy { it is java.net.Inet6Address } })
        .addInterceptor { chain -> chain.proceed(chain.request().newBuilder().header("User-Agent", userAgent).build()) }
        .build()

    /** The shared client with its own overall time limit. */
    fun withTimeout(seconds: Long): OkHttpClient = client.newBuilder().callTimeout(seconds, TimeUnit.SECONDS).build()
}
