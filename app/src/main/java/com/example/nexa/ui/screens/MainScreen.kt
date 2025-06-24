package com.example.nexa.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.animation.core.*
import androidx.compose.runtime.Composable
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import com.example.nexa.R
import com.example.nexa.navigation.NexaRoutes
import com.example.nexa.ui.theme.NexaTheme
import com.example.nexa.ui.theme.WatermelonNeonGreen
import com.example.nexa.ui.theme.WatermelonNeonPink
import com.example.nexa.util.rememberPermissionRequester
import com.example.nexa.viewmodel.MainViewModel


// Enum for Nexa's state - ViewModel holds the source of truth
// This local enum can be removed if `NexaVisualState` is exposed from VM correctly,
// or if it's defined in a common place (e.g., viewmodel package).
/*
enum class NexaVisualState {
    IDLE, LISTENING, THINKING, SPEAKING, ERROR
}
*/

@Composable
fun MainScreen(
    navController: NavController,
    viewModel: MainViewModel = hiltViewModel()
) {
    val context = LocalContext.current

    // Collect states from ViewModel
    val nexaVisualState by viewModel.nexaVisualState.collectAsState()
    val transcribedText by viewModel.transcribedText.collectAsState()
    val aiResponseText by viewModel.aiResponseText.collectAsState()
    val lastError by viewModel.lastError.collectAsState()
    // val isListening by viewModel.isListening.collectAsState() // Used by ViewModel internally for now

    val recordAudioPermissionLauncher = rememberPermissionRequester(
        permission = Manifest.permission.RECORD_AUDIO,
        onResult = { isGranted ->
            // ViewModel's onMicTap will call startListening if permission granted
            // The ViewModel's onMicTap already has logic for this path.
            // We just need to inform it about the permission status if it was just requested.
            if (isGranted) {
                 viewModel.startListening() // Or let onMicTap handle it after permission check
            } else {
                // Inform ViewModel or handle UI feedback for permission denial
                 viewModel.handlePermissionDenied() // Example method to be added in ViewModel
            }
        }
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Top Section: Nexa State and Settings Button
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Nexa: ${nexaVisualState.name}", // Uses NexaVisualState from ViewModel
                color = if (nexaVisualState == com.example.nexa.ui.screens.NexaVisualState.ERROR) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onBackground,
                fontSize = 16.sp
            )
            IconButton(onClick = { navController.navigate(NexaRoutes.SETTINGS_SCREEN) }) {
                Icon(
                    imageVector = Icons.Filled.Settings,
                    contentDescription = "Settings",
                    tint = MaterialTheme.colorScheme.onBackground
                )
            }
        }

        // Middle Section: Transcription and AI Response
        Column(
            modifier = Modifier.weight(1f),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            AnimatedContent(
                targetState = transcribedText,
                transitionSpec = {
                    (slideInVertically { height -> height } + fadeIn()) togetherWith
                            (slideOutVertically { height -> -height } + fadeOut())
                },
                label = "TranscribedTextAnimation"
            ) { targetText ->
                Text(
                    text = targetText,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = if (nexaVisualState == com.example.nexa.ui.screens.NexaVisualState.THINKING) 0.5f else 0.8f),
                    fontSize = 18.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(bottom = 24.dp)
                )
            }

            val aiTextColor = if (nexaVisualState == com.example.nexa.ui.screens.NexaVisualState.ERROR) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onBackground
            val aiTextContent = if (nexaVisualState == com.example.nexa.ui.screens.NexaVisualState.ERROR && lastError != null) lastError!! else aiResponseText

            AnimatedContent(
                targetState = aiTextContent,
                transitionSpec = {
                    (slideInVertically { height -> height } + fadeIn()) togetherWith
                            (slideOutVertically { height -> -height } + fadeOut())
                },
                label = "AiResponseTextAnimation"
            ) { targetText ->
                Text(
                    text = targetText,
                    style = TextStyle(
                        color = aiTextColor,
                        fontSize = 20.sp,
                        fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        shadow = if (nexaVisualState != com.example.nexa.ui.screens.NexaVisualState.ERROR) {
                            Shadow(
                                color = GlowGreen, // Use GlowGreen or GlowPink based on desired effect
                                offset = Offset(0f, 0f),
                                blurRadius = 8f
                            )
                        } else null
                    )
                )
            }
        }

        // Bottom Section: Central Circle Button
        val watermelonGradient = Brush.horizontalGradient(
            colors = listOf(WatermelonNeonGreen, WatermelonNeonPink)
        )
        Button(
            onClick = {
                val hasPermission = ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.RECORD_AUDIO
                ) == PackageManager.PERMISSION_GRANTED
                viewModel.onMicTap(hasPermission, recordAudioPermissionLauncher)
            },
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
                .then(
                    if (nexaVisualState == com.example.nexa.ui.screens.NexaVisualState.LISTENING) {
                        Modifier.pulsateEffect() // Apply custom pulsate modifier
                    } else Modifier
                ),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color.Transparent
            ),
            contentPadding = PaddingValues(),
            enabled = nexaVisualState != com.example.nexa.ui.screens.NexaVisualState.THINKING &&
                    nexaVisualState != com.example.nexa.ui.screens.NexaVisualState.SPEAKING
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(watermelonGradient)
                    .padding(16.dp), // Inner padding for the icon inside the gradient circle
                contentAlignment = Alignment.Center
            ) {
                // Animated icon or visual cue for listening state
                val iconSize by animateDpAsState(
                    targetValue = if (nexaVisualState == com.example.nexa.ui.screens.NexaVisualState.LISTENING) 56.dp else 48.dp,
                    animationSpec = tween(durationMillis = 300, easing = FastOutSlowInEasing),
                    label = "MicIconSize"
                )

                val currentIcon = if (nexaVisualState == com.example.nexa.ui.screens.NexaVisualState.LISTENING) {
                    R.drawable.ic_stop_placeholder
                } else {
                    R.drawable.ic_mic_placeholder
                }

                Icon(
                    painter = painterResource(id = currentIcon),
                    contentDescription = when (nexaVisualState) {
                        com.example.nexa.ui.screens.NexaVisualState.LISTENING -> "Stop Listening"
                        else -> "Speak"
                    },
                    tint = WatermelonSeedBlack, // Use specific dark color for icon on bright gradient
                    modifier = Modifier.size(iconSize)
                )
            }
        }
    }
}

// Simple Pulsate Effect using Modifier.drawWithContent and scale animation
@Composable
fun Modifier.pulsateEffect(pulseFraction: Float = 0.95f): Modifier {
    val infiniteTransition = rememberInfiniteTransition(label = "PulsateTransition")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = pulseFraction,
        animationSpec = infiniteRepeatable(
            animation = tween(700, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "PulsateScale"
    )
    return this.graphicsLayer {
        scaleX = scale
        scaleY = scale
    }
}


// Add a method to ViewModel to handle permission denial if specific UI update is needed from there
fun MainViewModel.handlePermissionDenied() {
    // this._lastError.value = "Audio permission is required to use voice input."
    // this._nexaVisualState.value = NexaVisualState.ERROR // or a specific PERMISSION_DENIED state
    // For now, the existing error handling in startListening will likely trigger.
}


@Preview(showBackground = true, backgroundColor = 0xFF000000)
@Composable
fun MainScreenPreview() {
    NexaTheme(darkTheme = true) {
        // Previewing with Hilt ViewModel can be tricky.
        // hiltViewModel() should work in previews with appropriate setup.
        MainScreen(navController = rememberNavController())
    }
}
