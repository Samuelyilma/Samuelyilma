package com.example.nexa.ui.theme

import androidx.compose.ui.graphics.Color

// Base Palette (Material You defaults, can be removed if not used for light theme)
val Purple80 = Color(0xFFD0BCFF)
val PurpleGrey80 = Color(0xFFCCC2DC)
val Pink80 = Color(0xFFEFB8C8)

val Purple40 = Color(0xFF6650a4)
val PurpleGrey40 = Color(0xFF625b71)
val Pink40 = Color(0xFF7D5260)

// Nexa Watermelon Cyber Theme
val NexaBlack = Color(0xFF0A0A0A) // Slightly off-black for depth
val NexaDarkGray = Color(0xFF1A1A1A) // For subtle panels or secondary backgrounds

val NeonGreen = Color(0xFF39FF14)   // Bright, pure neon green
val NeonPink = Color(0xFFFF00FF)     // Bright, pure neon pink
val LightNeonGreen = Color(0xFFAFFF7A) // Lighter shade for glows or highlights
val LightNeonPink = Color(0xFFFF7AFF)   // Lighter shade for glows or highlights

val WatermelonSeedBlack = Color(0xFF050505) // For accents or deep contrast

// Text Colors
val PrimaryText = Color(0xFFE0E0E0) // Slightly off-white for better readability
val SecondaryText = Color(0xFFB0B0B0) // For less important text
val HighlightTextGreen = NeonGreen
val HighlightTextPink = NeonPink

// Glow Colors (can be the same as neons or slightly lighter/more transparent)
val GlowGreen = LightNeonGreen.copy(alpha = 0.5f)
val GlowPink = LightNeonPink.copy(alpha = 0.5f)

// Button Gradient
val WatermelonButtonStart = NeonPink
val WatermelonButtonEnd = NeonGreen
