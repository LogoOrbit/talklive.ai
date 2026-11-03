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
    background = Color(0xFFEEF1F9),
    onBackground = Color(0xFF1A2033),
    surface = Color.White,
    onSurface = Color(0xFF1A2033),
    surfaceVariant = Color(0xFFE7EAF4),
    onSurfaceVariant = Color(0xFF5A617A),
    surfaceContainerHighest = Color(0xFFE7EAF4),
    outline = Color(0x241A2033),
    outlineVariant = Color(0x141A2033),
    error = Danger,
)

private val Dark = darkColorScheme(
    primary = BrandViolet,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF2B2560),
    onPrimaryContainer = Color(0xFFE2DDFF),
    secondary = BrandCyan,
    onSecondary = Color.Black,
    background = Color(0xFF0B0F1A),
    onBackground = Color(0xFFF2F4FF),
    surface = Color(0xFF111729),
    onSurface = Color(0xFFF2F4FF),
    surfaceVariant = Color(0xFF1D2438),
    onSurfaceVariant = Color(0xFF8A90A8),
    outline = Color(0x17FFFFFF),
    error = Danger,
)

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

/** Light by default, like the website's light theme. */
@Composable
fun TalkLiveTheme(dark: Boolean = false, content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (dark) Dark else Light, typography = Type, shapes = AppShapes, content = content)
}
