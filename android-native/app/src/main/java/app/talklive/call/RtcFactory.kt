package app.talklive.call

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import org.webrtc.PeerConnectionFactory
import org.webrtc.audio.JavaAudioDeviceModule
import javax.inject.Inject
import javax.inject.Singleton

/** One PeerConnectionFactory for the app's lifetime, audio only. */
@Singleton
class RtcFactory @Inject constructor(
    @ApplicationContext private val context: Context,
    private val mic: app.talklive.voice.MicMonitor,
) {
    val factory: PeerConnectionFactory by lazy {
        PeerConnectionFactory.initialize(
            PeerConnectionFactory.InitializationOptions.builder(context).createInitializationOptions(),
        )
        val adm = JavaAudioDeviceModule.builder(context)
            .setUseHardwareAcousticEchoCanceler(true)
            .setUseHardwareNoiseSuppressor(true)
            .setUseStereoInput(false)
            .setUseStereoOutput(false)
            // Own-mic samples for Voice check and shouting detection (MicMonitor).
            .setSamplesReadyCallback(mic)
            .createAudioDeviceModule()
        PeerConnectionFactory.builder()
            .setAudioDeviceModule(adm)
            .createPeerConnectionFactory()
    }
}
