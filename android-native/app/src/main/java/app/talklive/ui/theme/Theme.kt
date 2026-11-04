package app.talklive.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.talklive.R

// Brand colours, the same values as public/chat.css.
val BrandViolet = Color(0xFF6C5CE7)
val BrandTeal = Color(0xFF0086B3)
val BrandCyan = Color(0xFF00D4FF)
val Danger = Color(0xFFFF5470)
val Success = Color(0xFF17A862)

private val Light = lightColorScheme(
    primary = BrandViolet,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE9E6FC),
    onPrimaryContainer = Color(0xFF2A1F8F),
    secondary = BrandTeal,
    onSecondary = Color.White,
    // Softer than the website's near-white, so a full-screen app is easy on the eyes.
    background = Color(0xFFE3E7F1),
    onBackground = Color(0xFF1A2033),
    surface = Color(0xFFF0F2F8),
    onSurface = Color(0xFF1A2033),
    surfaceVariant = Color(0xFFD7DCEA),
    onSurfaceVariant = Color(0xFF545B74),
    surfaceContainerHighest = Color(0xFFD7DCEA),
    surfaceContainer = Color(0xFFEAEDF5),
    surfaceContainerLow = Color(0xFFEDEFF6),
    surfaceContainerHigh = Color(0xFFE6E9F2),
    outline = Color(0x2E1A2033),
    outlineVariant = Color(0x1A1A2033),
    error = Danger,
)

/** The website's themes (public/style.css): dark is the default, as on talklive.app. */
enum class AppTheme(val wire: String, val isDark: Boolean) {
    Dark("dark", true), Light("light", false), Ocean("ocean", true), Sunset("sunset", true);
    companion object { fun of(s: String?) = entries.firstOrNull { it.wire == s } ?: Dark }
}

/** Accent pair per theme, for gradients (buttons, the talk orb, own bubbles). */
data class Accents(val a: Color, val b: Color, val glow: Color)

private fun darkScheme(bg1: Long, bg2: Long, glow: Long, accent: Long, accent2: Long) = darkColorScheme(
    primary = Color(accent),
    onPrimary = Color.White,
    primaryContainer = Color(glow).copy(alpha = 1f),
    onPrimaryContainer = Color(0xFFE2DDFF),
    secondary = Color(accent2),
    onSecondary = Color.Black,
    background = Color(bg1),
    onBackground = Color(0xFFF2F4FF),
    surface = Color(bg2),
    onSurface = Color(0xFFF2F4FF),
    surfaceVariant = Color(glow),
    onSurfaceVariant = Color(0xFF9AA0B8),
    surfaceContainerLowest = Color(bg1),
    surfaceContainerLow = Color(bg2),
    surfaceContainer = Color(bg2),
    surfaceContainerHigh = Color(glow),
    surfaceContainerHighest = Color(glow),
    outline = Color(0x24FFFFFF),
    outlineVariant = Color(0x17FFFFFF),
    error = Danger,
)

private val Dark = darkScheme(0xFF0B0F1A, 0xFF141B30, 0xFF1C2240, 0xFF6C5CE7, 0xFF00D4FF)
private val Ocean = darkScheme(0xFF03151F, 0xFF072330, 0xFF0A3648, 0xFF00B4D8, 0xFF90E0EF)
private val Sunset = darkScheme(0xFF1A0B14, 0xFF2A1220, 0xFF3D1A2E, 0xFFFF6B6B, 0xFFFFA94D)

fun accentsFor(t: AppTheme) = when (t) {
    AppTheme.Dark -> Accents(BrandViolet, BrandCyan.copy(red = 0f, green = 0.62f, blue = 0.86f), Color(0xFF1C2240))
    AppTheme.Light -> Accents(BrandViolet, BrandTeal, Color(0xFFDDE4F5))
    AppTheme.Ocean -> Accents(Color(0xFF00B4D8), Color(0xFF0077B6), Color(0xFF0A3648))
    AppTheme.Sunset -> Accents(Color(0xFFFF6B6B), Color(0xFFFFA94D), Color(0xFF3D1A2E))
}

/** True when the phone asks for no animations (Accessibility > Remove animations), and in screenshot tests. */
val LocalReduceMotion = androidx.compose.runtime.staticCompositionLocalOf { false }

val LocalAccents = androidx.compose.runtime.staticCompositionLocalOf { accentsFor(AppTheme.Dark) }
val LocalAppTheme = androidx.compose.runtime.staticCompositionLocalOf { AppTheme.Dark }

val Jakarta = FontFamily(
    Font(R.font.pjs_400, FontWeight.Normal),
    Font(R.font.pjs_500, FontWeight.Medium),
    Font(R.font.pjs_600, FontWeight.SemiBold),
    Font(R.font.pjs_700, FontWeight.Bold),
    Font(R.font.pjs_800, FontWeight.ExtraBold),
)

private fun style(size: Int, weight: FontWeight, line: Int, tracking: Double = 0.0) =
    TextStyle(fontFamily = Jakarta, fontSize = size.sp, fontWeight = weight, lineHeight = line.sp, letterSpacing = tracking.sp)

private val Type = Typography(
    displaySmall = style(34, FontWeight.ExtraBold, 40, -0.5),
    headlineMedium = style(28, FontWeight.Bold, 34, -0.3),
    headlineSmall = style(24, FontWeight.Bold, 30, -0.2),
    titleLarge = style(20, FontWeight.Bold, 26),
    titleMedium = style(16, FontWeight.SemiBold, 22),
    bodyLarge = style(16, FontWeight.Normal, 24),
    bodyMedium = style(14, FontWeight.Normal, 20),
    labelLarge = style(16, FontWeight.SemiBold, 20),
    labelMedium = style(12, FontWeight.Medium, 16),
)

private val AppShapes = Shapes(
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(24.dp),
)

/** Dark by default, like talklive.app. */
@Composable
fun TalkLiveTheme(theme: AppTheme = AppTheme.Dark, content: @Composable () -> Unit) {
    val scheme = when (theme) { AppTheme.Dark -> Dark; AppTheme.Light -> Light; AppTheme.Ocean -> Ocean; AppTheme.Sunset -> Sunset }
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val reduce = androidx.compose.runtime.remember {
        runCatching { android.provider.Settings.Global.getFloat(ctx.contentResolver, android.provider.Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }.getOrDefault(false)
    }
    androidx.compose.runtime.CompositionLocalProvider(LocalAccents provides accentsFor(theme), LocalAppTheme provides theme, LocalReduceMotion provides (reduce || LocalReduceMotion.current)) {
        MaterialTheme(colorScheme = scheme, typography = Type, shapes = AppShapes, content = content)
    }
}

/** Kept for screenshots and previews. */
@Composable
fun TalkLiveTheme(dark: Boolean, content: @Composable () -> Unit) = TalkLiveTheme(if (dark) AppTheme.Dark else AppTheme.Light, content)
