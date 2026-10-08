package app.talklive;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/**
 * TalkLive's only activity: Capacitor's WebView showing https://talklive.app
 * (capacitor.config.json), plus the native pieces the website cannot do on its
 * own - see TalkLiveNativePlugin.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TalkLiveNativePlugin.class);
        super.onCreate(savedInstanceState);
        Notifications.createChannels(this);
    }
}
