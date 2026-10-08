package app.talklive;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

/**
 * Keeps a call alive when the user leaves the app or locks the phone.
 *
 * Android stops a background app's microphone (and, soon after, the app)
 * unless a foreground service of type "microphone" is running. The web app
 * tells TalkLiveNativePlugin when a call starts and ends; this service shows
 * the "On a call" notification for exactly that time.
 */
public class CallService extends Service {
    private static final int NOTIFICATION_ID = 4201;
    static final String EXTRA_TITLE = "title";

    static void start(Context context, String title) {
        Intent intent = new Intent(context, CallService.class).putExtra(EXTRA_TITLE, title);
        ContextCompat.startForegroundService(context, intent);
    }

    static void stop(Context context) {
        context.stopService(new Intent(context, CallService.class));
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String title = intent != null ? intent.getStringExtra(EXTRA_TITLE) : null;
        Intent open = new Intent(this, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        PendingIntent tap = PendingIntent.getActivity(this, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new NotificationCompat.Builder(this, Notifications.ONGOING)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title != null && !title.isEmpty() ? title : "TalkLive call")
                .setContentText("Tap to return to the call")
                .setContentIntent(tap)
                .setOngoing(true)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE : 0;
        try {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type);
        } catch (RuntimeException e) {
            // Android refuses a microphone service without the RECORD_AUDIO
            // grant or when started from the background. The call itself still
            // works while the app is open, so never crash over it.
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Swiping the app away ends the call; do not leave a dead notification.
        stopSelf();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
