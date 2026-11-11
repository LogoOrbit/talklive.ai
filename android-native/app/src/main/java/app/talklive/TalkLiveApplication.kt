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
    @Inject lateinit var sounds: app.talklive.sound.SoundDirector
    @Inject lateinit var notifier: app.talklive.push.LocalNotifier
    @Inject lateinit var fx: app.talklive.sound.Sounds
    // Created at start: it signs the saved account back in on the first
    // registration, which can arrive before any screen has asked for it.
    @Inject lateinit var auth: app.talklive.auth.AuthRepository

    override fun onCreate() {
        CrashReporter.install(this)
        super.onCreate()
        CrashReporter.sendPending(this, socket)
        engage.loadFlags()
        sounds.start()
        app.talklive.sound.Tap.sounds = fx
        fx.warm()
        notifier.start()
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_CALL, getString(R.string.channel_call), NotificationManager.IMPORTANCE_LOW)
                .apply { setShowBadge(false) },
        )
        // Channel ids the server's pushes name (server/push.js CHANNEL_FOR_KIND).
        // Each has its own TalkLive sound. A channel's sound cannot change once
        // made, so these are new ids and the old silent-default ones go.
        fun sound(name: String) = android.net.Uri.parse("android.resource://$packageName/raw/$name")
        fun attrs(usage: Int) = android.media.AudioAttributes.Builder()
            .setUsage(usage).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
        listOf("calls", "messages").forEach { runCatching { nm.deleteNotificationChannel(it) } }
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_CALLS, getString(R.string.channel_calls), NotificationManager.IMPORTANCE_HIGH).apply {
                description = getString(R.string.channel_calls_desc)
                setSound(sound("tl_ring"), attrs(android.media.AudioAttributes.USAGE_NOTIFICATION_RINGTONE))
                enableVibration(true); vibrationPattern = longArrayOf(0, 400, 250, 400)
            },
        )
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_MESSAGES, getString(R.string.channel_messages), NotificationManager.IMPORTANCE_HIGH).apply {
                description = getString(R.string.channel_messages_desc)
                setSound(sound("tl_message"), attrs(android.media.AudioAttributes.USAGE_NOTIFICATION))
                enableVibration(true); vibrationPattern = longArrayOf(0, 120, 80, 120)
            },
        )
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_SOCIAL, getString(R.string.channel_social), NotificationManager.IMPORTANCE_HIGH).apply {
                description = getString(R.string.channel_social_desc)
                setSound(sound("tl_friend"), attrs(android.media.AudioAttributes.USAGE_NOTIFICATION))
            },
        )
        push.refresh()
        // Connect as early as possible, and again the moment the network returns.
        socket.connect()
        runCatching {
            getSystemService(android.net.ConnectivityManager::class.java).registerDefaultNetworkCallback(object : android.net.ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: android.net.Network) { socket.reconnectNow() }
            })
        }
        // Foreground/background: the server pushes to a backgrounded app, and a
        // text-chat partner sees "switched away".
        androidx.lifecycle.ProcessLifecycleOwner.get().lifecycle.addObserver(
            androidx.lifecycle.LifecycleEventObserver { _, event ->
                when (event) {
                    androidx.lifecycle.Lifecycle.Event.ON_START -> { socket.reconnectNow(); socket.hidden = false; calls.appVisible(true) }
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
        // Chat GIFs are large and many. Coil's defaults let them take a quarter
        // of the app's memory and up to 250 MB of the phone's storage.
        .memoryCache { coil.memory.MemoryCache.Builder(this).maxSizePercent(0.15).build() }
        .diskCache { coil.disk.DiskCache.Builder().directory(cacheDir.resolve("image_cache")).maxSizeBytes(48L * 1024 * 1024).build() }
        .build()

    companion object {
        const val CHANNEL_CALL = "ongoing_call"
        const val CHANNEL_CALLS = "calls_v2"
        const val CHANNEL_MESSAGES = "messages_v2"
        const val CHANNEL_SOCIAL = "social_v2"
    }
}
