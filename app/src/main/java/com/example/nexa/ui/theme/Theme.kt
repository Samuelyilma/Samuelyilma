package com.example.nexa.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// Updated DarkColorScheme using the new Watermelon Cyber Theme colors
private val NexaDarkColorScheme = darkColorScheme(
    primary = NeonGreen, // Main interactive elements, buttons
    onPrimary = NexaBlack, // Text/icons on primary elements
    primaryContainer = NeonPink, // Larger containers using primary theme color
    onPrimaryContainer = NexaBlack, // Text/icons on primaryContainer

    secondary = NeonPink, // Accent, secondary interactive elements
    onSecondary = NexaBlack, // Text/icons on secondary elements
    secondaryContainer = LightNeonPink.copy(alpha = 0.2f), // Larger containers for secondary elements
    onSecondaryContainer = PrimaryText,

    tertiary = LightNeonGreen, // Other accents
    onTertiary = NexaBlack,
    tertiaryContainer = LightNeonGreen.copy(alpha = 0.2f),
    onTertiaryContainer = PrimaryText,

    error = Color(0xFFFF5252), // Standard error red, can be themed later
    onError = Color.Black,
    errorContainer = Color(0xFFFF5252).copy(alpha = 0.2f),
    onErrorContainer = PrimaryText,

    background = NexaBlack, // Main app background
    onBackground = PrimaryText, // Main text color on background

    surface = NexaDarkGray, // Cards, sheets, menus
    onSurface = PrimaryText, // Text on surfaces
    surfaceVariant = Color(0xFF2C2C2C), // Slightly different surfaces
    onSurfaceVariant = SecondaryText,

    outline = NeonGreen.copy(alpha = 0.5f), // Borders, dividers
    inverseOnSurface = NexaBlack, // For elements on an inverted surface (rarely used in dark themes)
    inverseSurface = PrimaryText, // For elements needing high contrast against dark (rarely used)
    inversePrimary = NeonGreen, // Inverse of primary, for specific high-contrast needs
    surfaceTint = Color.Transparent, // No tint needed for dark surfaces
    outlineVariant = NeonPink.copy(alpha = 0.3f)
)

// Light theme is not the focus, but defining it minimally
private val NexaLightColorScheme = lightColorScheme(
    primary = NeonGreen,
    onPrimary = NexaBlack,
    secondary = NeonPink,
    onSecondary = NexaBlack,
    background = Color(0xFFF0F0F0),
    onBackground = NexaBlack,
    surface = Color.White,
    onSurface = NexaBlack
    // Define other colors as needed if light theme becomes a requirement
)

@Composable
fun NexaTheme(
    darkTheme: Boolean = true, // Forcing dark theme as per Watermelon style
    dynamicColor: Boolean = false, // Disable dynamic color to enforce Watermelon theme
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) NexaDarkColorScheme else NexaLightColorScheme
    // Dynamic color handling removed to strictly enforce the custom theme.
    // if (dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
    //     val context = LocalContext.current
    //     colorScheme = if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
    // }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb() // Match background
            window.navigationBarColor = colorScheme.background.toArgb() // Match background
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
            WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
