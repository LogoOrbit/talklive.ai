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
    } catch (e: Exception) {
        Result.Failed(e.message ?: "Google sign-in failed.")
    }
}
