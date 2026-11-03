package app.talklive.ui.onboarding

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.talklive.auth.AuthRepository
import app.talklive.auth.AuthResult
import app.talklive.auth.GoogleSignIn
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class SignupStep { Email, Account, Code }

enum class ResetStep { Email, Code, Password }

@HiltViewModel
class AuthViewModel @Inject constructor(private val auth: AuthRepository) : ViewModel() {
    var busy by mutableStateOf(false); private set
    var googleBusy by mutableStateOf(false); private set
    var error by mutableStateOf<String?>(null); private set

    // Sign-up form, kept here so it survives rotation and going back a step.
    var step by mutableStateOf(SignupStep.Email); internal set
    var email by mutableStateOf("")
    var username by mutableStateOf("")
    var password by mutableStateOf("")
    var code by mutableStateOf("")
    var resendIn by mutableStateOf(0); private set

    // Forgot password.
    var resetStep by mutableStateOf(ResetStep.Email); internal set
    var resetEmail by mutableStateOf("")
    var resetCode by mutableStateOf("")
    var resetPassword by mutableStateOf("")
    private var resetToken: String? = null

    fun startReset() {
        error = null
        resetStep = ResetStep.Email
        resetEmail = loginUser.takeIf { it.contains('@') }.orEmpty()
        resetCode = ""
        resetPassword = ""
    }

    /** Returns false when there is no earlier reset step. */
    fun resetBack(): Boolean {
        error = null
        resetStep = when (resetStep) {
            ResetStep.Email -> return false
            ResetStep.Code -> ResetStep.Email
            ResetStep.Password -> ResetStep.Code
        }
        return true
    }

    fun sendResetCode() = run {
        when (val r = auth.forgotPassword(resetEmail)) {
            AuthResult.Ok -> { resetStep = ResetStep.Code; resetCode = ""; startResendTimer() }
            is AuthResult.Error -> error = r.message
        }
    }

    fun verifyReset(digits: String) = run {
        val (r, token) = auth.verifyResetCode(resetEmail, digits)
        when {
            r is AuthResult.Error -> { error = r.message; resetCode = "" }
            token != null -> { resetToken = token; resetStep = ResetStep.Password }
        }
    }

    fun finishReset() = run {
        val token = resetToken ?: return@run
        (auth.resetPassword(token, resetPassword) as? AuthResult.Error)?.let { error = it.message }
    }

    // Log-in form.
    var loginUser by mutableStateOf("")
    var loginPassword by mutableStateOf("")

    val emailValid get() = EMAIL_RE.matches(email.trim())
    val usernameValid get() = USERNAME_RE.matches(username.trim())
    val passwordValid get() = password.length >= 8

    fun clearError() { error = null }

    fun continueAsGuest() = auth.finishOnboarding()

    fun next() {
        error = null
        when (step) {
            SignupStep.Email -> if (emailValid) step = SignupStep.Account
            SignupStep.Account -> sendCode()
            SignupStep.Code -> verify(code)
        }
    }

    /** Returns false when there is no earlier step (leave the flow). */
    fun back(): Boolean {
        error = null
        step = when (step) {
            SignupStep.Email -> return false
            SignupStep.Account -> SignupStep.Email
            SignupStep.Code -> { code = ""; SignupStep.Account }
        }
        return true
    }

    fun sendCode() = run {
        when (val r = auth.sendSignupCode(username, email)) {
            AuthResult.Ok -> { step = SignupStep.Code; startResendTimer() }
            is AuthResult.Error -> error = r.message
        }
    }

    fun verify(digits: String) = run {
        val r = auth.signup(username, email, password, digits)
        if (r is AuthResult.Error) { error = r.message; code = "" }
    }

    fun login() = run {
        (auth.login(loginUser, loginPassword) as? AuthResult.Error)?.let { error = it.message }
    }

    fun google(activity: Context) {
        if (googleBusy) return
        googleBusy = true
        error = null
        viewModelScope.launch {
            val clientId = auth.googleClientId()
            if (clientId == null) {
                error = "Google sign-in is not available right now."
            } else when (val g = GoogleSignIn.signIn(activity, clientId)) {
                is GoogleSignIn.Result.Token -> (auth.google(g.idToken) as? AuthResult.Error)?.let { error = it.message }
                is GoogleSignIn.Result.Failed -> error = g.message
                GoogleSignIn.Result.Cancelled -> Unit
            }
            googleBusy = false
        }
    }

    private fun run(block: suspend () -> Unit) {
        if (busy) return
        busy = true
        error = null
        viewModelScope.launch {
            try { block() } finally { busy = false }
        }
    }

    private fun startResendTimer() {
        resendIn = 30
        viewModelScope.launch {
            while (resendIn > 0) { delay(1000); resendIn-- }
        }
    }

    private companion object {
        val EMAIL_RE = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$")
        val USERNAME_RE = Regex("^[A-Za-z0-9_.-]{3,24}$")
    }
}
