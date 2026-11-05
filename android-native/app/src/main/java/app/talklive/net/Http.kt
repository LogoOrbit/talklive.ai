package app.talklive.net

import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

/**
 * One HTTP client for the whole app. Clients made from it share its
 * connection pool, so requests to talklive.app reuse an open connection
 * instead of repeating the TLS handshake each time.
 */
object Http {
    val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .build()

    /** The shared client with its own overall time limit. */
    fun withTimeout(seconds: Long): OkHttpClient = client.newBuilder().callTimeout(seconds, TimeUnit.SECONDS).build()
}
