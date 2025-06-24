package com.example.nexa

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.example.nexa.navigation.NexaNavHost
//import com.example.nexa.ui.screens.MainScreen // No longer directly used here for preview
import com.example.nexa.ui.theme.NexaTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            NexaTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    NexaNavHost()
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun DefaultPreview() {
    NexaTheme {
        // Previewing NavHost directly can be tricky if it relies on deep Hilt injections.
        // For now, we can preview a specific screen or keep it simple.
        // For simplicity, let's assume NavHost can be previewed or we'd preview MainScreen.
        // However, MainScreen will soon require NavController.
        // A better preview for this stage might be:
        // MainScreen(navController = rememberNavController()) // if MainScreen is adapted
        // For now, let's see if NexaNavHost previews fine.
        NexaNavHost()
    }
}
