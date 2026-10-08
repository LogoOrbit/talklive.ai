package app.talklive;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.CancellationSignal;

import androidx.core.content.ContextCompat;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.google.firebase.FirebaseApp;

import java.util.concurrent.Executor;

/**
 * The bridge between the website and the phone. Called from public/native.js
 * as Capacitor.Plugins.TalkLiveNative.
 *
 *  - setCallActive: start/stop CallService around a call.
 *  - googleSignIn:  Google blocks its web sign-in inside apps, so the app signs
 *                   in natively and hands the ID token to the site, which
 *                   verifies it exactly like the web button's credential.
 */
@CapacitorPlugin(name = "TalkLiveNative")
public class TalkLiveNativePlugin extends Plugin {

    /**
     * Whether Firebase is set up in this build (google-services.json present).
     * Registering for push without it throws, so native.js asks first.
     */
    @PluginMethod
    public void pushAvailable(PluginCall call) {
        boolean available;
        try {
            available = !FirebaseApp.getApps(getContext()).isEmpty();
        } catch (RuntimeException e) {
            available = false;
        }
        JSObject result = new JSObject();
        result.put("available", available);
        call.resolve(result);
    }

    @PluginMethod
    public void setCallActive(PluginCall call) {
        boolean active = Boolean.TRUE.equals(call.getBoolean("active", false));
        if (active) {
            boolean micGranted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO)
                    == PackageManager.PERMISSION_GRANTED;
            if (micGranted) CallService.start(getContext(), call.getString("title", "TalkLive call"));
        } else {
            CallService.stop(getContext());
        }
        call.resolve();
    }

    @PluginMethod
    public void googleSignIn(PluginCall call) {
        String clientId = call.getString("clientId");
        if (clientId == null || clientId.isEmpty()) {
            call.reject("Missing Google client ID", "no_client_id");
            return;
        }
        GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(clientId).build();
        GetCredentialRequest request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
        CredentialManager manager = CredentialManager.create(getContext());
        Executor main = ContextCompat.getMainExecutor(getContext());

        manager.getCredentialAsync(getActivity(), request, new CancellationSignal(), main,
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse response) {
                        Credential credential = response.getCredential();
                        if (credential instanceof CustomCredential
                                && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                            GoogleIdTokenCredential google = GoogleIdTokenCredential.createFrom(credential.getData());
                            JSObject result = new JSObject();
                            result.put("credential", google.getIdToken());
                            call.resolve(result);
                        } else {
                            call.reject("Unexpected credential type", "bad_credential");
                        }
                    }

                    @Override
                    public void onError(GetCredentialException e) {
                        if (e instanceof GetCredentialCancellationException) {
                            call.reject("Cancelled", "cancelled");
                        } else {
                            call.reject(e.getMessage() != null ? e.getMessage() : "Google sign-in failed", "failed");
                        }
                    }
                });
    }
}
