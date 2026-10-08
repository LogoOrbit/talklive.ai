package app.talklive;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;

/**
 * Notification channels. The ids are part of the contract with the server:
 * server/push.js sends each FCM message with one of these channel ids.
 */
final class Notifications {
    /** A friend asking to talk: rings like a call. */
    static final String CALLS = "calls";
    /** Friend messages, requests and acceptances. */
    static final String MESSAGES = "messages";
    /** The silent "call in progress" notification CallService must show. */
    static final String ONGOING = "ongoing_call";

    private Notifications() {}

    static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;

        NotificationChannel calls = new NotificationChannel(CALLS, "Calls", NotificationManager.IMPORTANCE_HIGH);
        calls.setDescription("When a friend wants to talk to you");
        calls.enableVibration(true);
        calls.setVibrationPattern(new long[] {0, 800, 600, 800, 600, 800});
        calls.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
                new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build());
        nm.createNotificationChannel(calls);

        NotificationChannel messages = new NotificationChannel(MESSAGES, "Messages", NotificationManager.IMPORTANCE_HIGH);
        messages.setDescription("Friend messages and friend requests");
        nm.createNotificationChannel(messages);

        NotificationChannel ongoing = new NotificationChannel(ONGOING, "Call in progress", NotificationManager.IMPORTANCE_LOW);
        ongoing.setDescription("Shown while you are on a call, so it keeps going when you leave the app");
        ongoing.setShowBadge(false);
        nm.createNotificationChannel(ongoing);
    }
}
