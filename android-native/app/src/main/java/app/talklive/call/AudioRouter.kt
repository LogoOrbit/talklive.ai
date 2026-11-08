package app.talklive.call

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Call audio: puts the phone in communication mode, routes between speaker,
 * headset and earpiece, follows headsets as they connect, and reports when a
 * phone call (or anything else) takes the microphone away.
 */
@Singleton
class AudioRouter @Inject constructor(@ApplicationContext context: Context) {
    private val am = context.getSystemService(AudioManager::class.java)
    private val main = Handler(Looper.getMainLooper())
    private var active = false

    private val _focusLost = MutableStateFlow(false)
    /** True while another app (usually a phone call) holds the audio. */
    val focusLost: StateFlow<Boolean> = _focusLost

    private val _headset = MutableStateFlow(hasHeadset())
    /** True while a wired or Bluetooth headset is connected. */
    val headset: StateFlow<Boolean> = _headset

    private val focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build(),
        )
        .setOnAudioFocusChangeListener { change ->
            _focusLost.value = change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT
        }
        .build()

    private val devices = object : AudioDeviceCallback() {
        override fun onAudioDevicesAdded(added: Array<out AudioDeviceInfo>) { _headset.value = hasHeadset() }
        override fun onAudioDevicesRemoved(removed: Array<out AudioDeviceInfo>) { _headset.value = hasHeadset() }
    }

    // Android's "in a call" audio mode is only switched on while someone is
    // actually on the line. Searching used to switch it on, and apps that
    // watch for calls (banking apps block sign-in during one) reacted the
    // moment Tap to talk was pressed.
    @Volatile private var live = false
    @Volatile private var speakerOn = false

    /** A call is being set up: watch for headsets. The audio mode waits for [setLive]. */
    fun start(speaker: Boolean) {
        speakerOn = speaker
        if (!active) {
            active = true
            am.registerAudioDeviceCallback(devices, main)
            _focusLost.value = false
        }
        if (live) setSpeaker(speaker)
    }

    /** Someone is on the line (true) or not any more (false). */
    fun setLive(on: Boolean) {
        if (on == live) return
        if (on) {
            if (!active) start(speakerOn)
            live = true
            am.mode = AudioManager.MODE_IN_COMMUNICATION
            am.requestAudioFocus(focusRequest)
            setSpeaker(speakerOn)
        } else {
            live = false
            am.abandonAudioFocusRequest(focusRequest)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                am.clearCommunicationDevice()
            } else {
                @Suppress("DEPRECATION")
                am.isSpeakerphoneOn = false
            }
            am.mode = AudioManager.MODE_NORMAL
            _focusLost.value = false
        }
    }

    fun setSpeaker(on: Boolean) {
        speakerOn = on
        if (!live) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val list = am.availableCommunicationDevices
            val pick = if (on) {
                list.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
            } else {
                list.firstOrNull { it.type in HEADSETS } ?: list.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE }
            }
            if (pick != null) am.setCommunicationDevice(pick) else am.clearCommunicationDevice()
        } else {
            @Suppress("DEPRECATION")
            am.isSpeakerphoneOn = on
        }
    }

    fun stop() {
        setLive(false)
        if (!active) return
        active = false
        am.unregisterAudioDeviceCallback(devices)
    }

    private fun hasHeadset() = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS).any { it.type in HEADSETS }

    private companion object {
        val HEADSETS = setOf(
            AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
            AudioDeviceInfo.TYPE_WIRED_HEADSET,
            AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
            AudioDeviceInfo.TYPE_USB_HEADSET,
            AudioDeviceInfo.TYPE_BLE_HEADSET,
        )
    }
}
