package app.talklive.ui.components

import androidx.compose.animation.togetherWith
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material.icons.rounded.VisibilityOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.animation.core.animateFloat
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.contentType
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.talklive.ui.theme.BrandTeal
import app.talklive.ui.theme.BrandViolet
import app.talklive.ui.theme.Danger

/** The website's primary button: violet to teal, 135°. */
/** The theme's accent gradient (violet to cyan on the default theme). */
val BrandGradient: Brush
    @androidx.compose.runtime.Composable @androidx.compose.runtime.ReadOnlyComposable
    get() = app.talklive.ui.theme.LocalAccents.current.let { Brush.linearGradient(listOf(it.a, it.b)) }

/** A press-to-shrink modifier source, for buttons that feel physical. */
@Composable
private fun pressScale(source: MutableInteractionSource): Float {
    val pressed by source.collectIsPressedAsState()
    // Low damping: the button springs slightly past full size when let go.
    return animateFloatAsState(if (pressed) 0.95f else 1f, spring(dampingRatio = if (pressed) 0.8f else 0.4f, stiffness = 700f), label = "press").value
}

@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    icon: ImageVector? = null,
    shape: androidx.compose.ui.graphics.Shape = CircleShape,
    done: Boolean = false,
) {
    val haptics = LocalHapticFeedback.current
    val source = remember { MutableInteractionSource() }
    androidx.compose.runtime.LaunchedEffect(done) { if (done) haptics.performHapticFeedback(HapticFeedbackType.LongPress) }
    Surface(
        onClick = {
            haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
            app.talklive.sound.Tap.pop()
            onClick()
        },
        enabled = enabled && !loading && !done,
        shape = shape,
        color = Color.Transparent,
        interactionSource = source,
        modifier = modifier.fillMaxWidth().height(56.dp).scale(pressScale(source)),
    ) {
        Box(
            Modifier.background(BrandGradient).alpha(if (enabled) 1f else 0.5f),
            contentAlignment = Alignment.Center,
        ) {
            // Text, spinner and success check cross-fade; the check pops in with overshoot.
            androidx.compose.animation.AnimatedContent(
                targetState = when { done -> 2; loading -> 1; else -> 0 },
                transitionSpec = {
                    (androidx.compose.animation.fadeIn(androidx.compose.animation.core.tween(160)) +
                        androidx.compose.animation.scaleIn(spring(dampingRatio = 0.45f, stiffness = 500f), initialScale = 0.6f))
                        .togetherWith(androidx.compose.animation.fadeOut(androidx.compose.animation.core.tween(120)))
                },
                label = "btn",
            ) { st ->
                when (st) {
                    2 -> Icon(Icons.Rounded.Check, null, tint = Color.White, modifier = Modifier.size(26.dp))
                    1 -> CircularProgressIndicator(Modifier.size(24.dp), color = Color.White, strokeWidth = 2.5.dp)
                    else -> Row(verticalAlignment = Alignment.CenterVertically) {
                        icon?.let { Icon(it, null, tint = Color.White); Spacer(Modifier.width(10.dp)) }
                        Text(text, color = Color.White, style = MaterialTheme.typography.labelLarge)
                    }
                }
            }
        }
    }
}

@Composable
fun SecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    leading: (@Composable () -> Unit)? = null,
    loading: Boolean = false,
    // A custom shape is used inside cards: filled, no outline.
    shape: androidx.compose.ui.graphics.Shape? = null,
) {
    val source = remember { MutableInteractionSource() }
    Surface(
        onClick = { app.talklive.sound.Tap.pop(); onClick() },
        enabled = !loading,
        shape = shape ?: CircleShape,
        color = if (shape == null) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surfaceVariant,
        border = if (shape == null) BorderStroke(1.dp, MaterialTheme.colorScheme.outline) else null,
        interactionSource = source,
        modifier = modifier.fillMaxWidth().height(56.dp).scale(pressScale(source)),
    ) {
        Row(horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            if (loading) {
                CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.5.dp)
            } else {
                leading?.let { it(); Spacer(Modifier.width(12.dp)) }
                Text(text, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}

@Composable
fun TalkTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    onIme: () -> Unit = {},
    password: Boolean = false,
    supporting: String? = null,
    focusRequester: FocusRequester? = null,
) {
    var visible by remember { mutableStateOf(false) }
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        shape = MaterialTheme.shapes.medium,
        supportingText = supporting?.let { { Text(it) } },
        visualTransformation = if (password && !visible) PasswordVisualTransformation() else VisualTransformation.None,
        trailingIcon = if (password) {
            {
                IconButton(onClick = { visible = !visible }) {
                    Icon(if (visible) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility, contentDescription = null)
                }
            }
        } else null,
        keyboardOptions = KeyboardOptions(
            keyboardType = if (password) KeyboardType.Password else keyboardType,
            imeAction = imeAction,
            autoCorrectEnabled = false,
        ),
        keyboardActions = KeyboardActions(onAny = { onIme() }),
        colors = OutlinedTextFieldDefaults.colors(
            unfocusedContainerColor = MaterialTheme.colorScheme.surface,
            focusedContainerColor = MaterialTheme.colorScheme.surface,
            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
        ),
        modifier = modifier.fillMaxWidth().let { m -> focusRequester?.let { m.focusRequester(it) } ?: m },
    )
}

/** Six boxes for the emailed code. Auto-focuses and submits when full. */
@Composable
fun OtpField(value: String, onValueChange: (String) -> Unit, onComplete: (String) -> Unit, error: Boolean, checking: Boolean = false) {
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) { focus.requestFocus() }
    // A wrong code shakes the row once.
    val shake = remember { androidx.compose.animation.core.Animatable(0f) }
    LaunchedEffect(error) {
        if (error) for (x in listOf(14f, -12f, 9f, -6f, 3f, 0f)) shake.animateTo(x, androidx.compose.animation.core.tween(45))
    }
    // While checking, the digits breathe.
    val pulse = if (checking) androidx.compose.animation.core.rememberInfiniteTransition(label = "otp").animateFloat(
        0.55f, 1f, androidx.compose.animation.core.infiniteRepeatable(androidx.compose.animation.core.tween(520), androidx.compose.animation.core.RepeatMode.Reverse), label = "p",
    ).value else 1f
    BasicTextField(
        value = value,
        onValueChange = { raw ->
            val digits = raw.filter(Char::isDigit).take(6)
            onValueChange(digits)
            if (digits.length == 6) onComplete(digits)
        },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
        modifier = Modifier.focusRequester(focus)
            // Lets the keyboard offer the code from a message ("one-time code" autofill).
            .semantics { contentType = androidx.compose.ui.autofill.ContentType.SmsOtpCode },
        decorationBox = {
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxWidth().graphicsLayer { translationX = shake.value * density },
            ) {
                repeat(6) { i ->
                    val ch = value.getOrNull(i)?.toString().orEmpty()
                    val active = i == value.length && !checking
                    val tint by animateColorAsState(
                        when {
                            error -> Danger.copy(alpha = 0.16f)
                            active -> BrandViolet.copy(alpha = 0.18f)
                            else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)
                        },
                        label = "otp",
                    )
                    // Each digit pops in as it is typed.
                    val pop = remember { androidx.compose.animation.core.Animatable(1f) }
                    LaunchedEffect(ch) { if (ch.isNotEmpty()) { pop.snapTo(0.6f); pop.animateTo(1f, spring(dampingRatio = 0.45f, stiffness = 600f)) } }
                    Box(
                        Modifier.weight(1f).height(62.dp).clip(RoundedCornerShape(16.dp)).background(tint),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (ch.isNotEmpty()) Text(
                            ch, style = TextStyle(fontSize = 26.sp, fontWeight = FontWeight.SemiBold, fontFeatureSettings = "tnum"),
                            color = if (error) Danger else MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.graphicsLayer { scaleX = pop.value; scaleY = pop.value; alpha = pulse },
                        ) else if (active) {
                            // A blinking caret in the next box.
                            val blink = androidx.compose.animation.core.rememberInfiniteTransition(label = "caret").animateFloat(
                                1f, 0f, androidx.compose.animation.core.infiniteRepeatable(androidx.compose.animation.core.tween(530), androidx.compose.animation.core.RepeatMode.Reverse), label = "c",
                            )
                            Box(Modifier.width(2.dp).height(26.dp).graphicsLayer { alpha = blink.value }.background(BrandViolet))
                        }
                    }
                }
            }
        },
    )
}

@Composable
fun ErrorBanner(message: String?) {
    AnimatedVisibility(
        visible = message != null,
        enter = fadeIn() + expandVertically(),
        exit = fadeOut() + shrinkVertically(),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(top = 12.dp).clip(MaterialTheme.shapes.medium)
                .background(Danger.copy(alpha = 0.1f)).padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.ErrorOutline, null, tint = Danger, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Text(message.orEmpty(), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
fun ScreenTitle(title: String, subtitle: String? = null) {
    Text(title, style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground)
    subtitle?.let {
        Spacer(Modifier.height(8.dp))
        Text(it, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Start)
    }
}
