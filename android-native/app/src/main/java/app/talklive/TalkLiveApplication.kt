package app.talklive

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import app.talklive.data.CrashReporter
import app.talklive.net.TalkSocket
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject
import kotlinx.coroutines.launch

@HiltAndroidApp
class TalkLiveApplication : Application(), coil.ImageLoaderFactory {
    @Inject lateinit var socket: TalkSocket
    // Created at start so it hears the first state-sync after registering.
    @Inject lateinit var social: app.talklive.social.SocialRepository
    @Inject lateinit var push: app.talklive.push.PushRegistrar
    @Inject lateinit var ice: app.talklive.net.IceServerApi
    @Inject lateinit var calls: app.talklive.call.CallManager
    // Created at start: it hooks filters into registration and hears engage events.
    @Inject lateinit var engage: app.talklive.engage.EngageRepository

    override fun onCreate() {
        CrashReporter.install(this)
        super.onCreate()
        CrashReporter.sendPending(this, socket)
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_CALL, getString(R.string.channel_call), NotificationManager.IMPORTANCE_LOW)
                .apply { setShowBadge(false) },
        )
        // Channel ids the server's pushes name (server/push.js CHANNEL_FOR_KIND).
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_CALLS, getString(R.string.channel_calls), NotificationManager.IMPORTANCE_HIGH)
                .apply { description = getString(R.string.channel_calls_desc) },
        )
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_MESSAGES, getString(R.string.channel_messages), NotificationManager.IMPORTANCE_HIGH)
                .apply { description = getString(R.string.channel_messages_desc) },
        )
        push.refresh()
        // Foreground/background: the server pushes to a backgrounded app, and a
        // text-chat partner sees "switched away".
        androidx.lifecycle.ProcessLifecycleOwner.get().lifecycle.addObserver(
            androidx.lifecycle.LifecycleEventObserver { _, event ->
                when (event) {
                    androidx.lifecycle.Lifecycle.Event.ON_START -> { socket.hidden = false; calls.appVisible(true) }
                    androidx.lifecycle.Lifecycle.Event.ON_STOP -> { socket.hidden = true; calls.appVisible(false) }
                    else -> Unit
                }
            },
        )
        kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch { runCatching { ice.get() } }
    }

    /** Animated GIFs in chats. */
    override fun newImageLoader(): coil.ImageLoader = coil.ImageLoader.Builder(this)
        .components {
            if (android.os.Build.VERSION.SDK_INT >= 28) add(coil.decode.ImageDecoderDecoder.Factory())
            else add(coil.decode.GifDecoder.Factory())
        }
        .crossfade(true)
        .build()

    companion object {
        const val CHANNEL_CALL = "ongoing_call"
        const val CHANNEL_CALLS = "calls"
        const val CHANNEL_MESSAGES = "messages"
    }
}
