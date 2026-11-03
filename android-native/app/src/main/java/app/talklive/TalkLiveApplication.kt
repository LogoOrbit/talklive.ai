package app.talklive

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import app.talklive.data.CrashReporter
import app.talklive.net.TalkSocket
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class TalkLiveApplication : Application() {
    @Inject lateinit var socket: TalkSocket

    override fun onCreate() {
        CrashReporter.install(this)
        super.onCreate()
        CrashReporter.sendPending(this, socket)
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_CALL, getString(R.string.channel_call), NotificationManager.IMPORTANCE_LOW)
                .apply { setShowBadge(false) },
        )
    }

    companion object {
        const val CHANNEL_CALL = "ongoing_call"
    }
}
