package app.talklive.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential

/** Native "Continue with Google" through Android's Credential Manager. */
object GoogleSignIn {
    const val NOT_SET_UP = "Google sign-in is not available on this version of the app yet. Use email for now; your account works on talklive.app too."

    sealed interface Result {
        data class Token(val idToken: String) : Result
        data object Cancelled : Result
        data class Failed(val message: String) : Result
    }

    suspend fun signIn(activityContext: Context, webClientId: String): Result = try {
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(GetSignInWithGoogleOption.Builder(webClientId).build())
            .build()
        val cred = CredentialManager.create(activityContext).getCredential(activityContext, request).credential
        if (cred is CustomCredential && cred.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            Result.Token(GoogleIdTokenCredential.createFrom(cred.data).idToken)
        } else {
            Result.Failed("Google did not return an account.")
        }
    } catch (_: GetCredentialCancellationException) {
        Result.Cancelled
    } catch (e: androidx.credentials.exceptions.NoCredentialException) {
        // Also what Google answers when this app's package + signing key are not
        // registered as an Android OAuth client (see README, Google sign-in).
        Result.Failed(NOT_SET_UP)
    } catch (e: androidx.credentials.exceptions.GetCredentialException) {
        Result.Failed(if (e.type.contains("DEVELOPER", true) || e.message.orEmpty().contains("10:")) NOT_SET_UP else e.message ?: "Google sign-in failed.")
    } catch (e: Exception) {
        Result.Failed(e.message ?: "Google sign-in failed.")
    }
}
