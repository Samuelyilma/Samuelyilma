package com.example.nexa.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.nexa.ui.screens.MainScreen
import com.example.nexa.ui.screens.SettingsScreen

object NexaRoutes {
    const val MAIN_SCREEN = "main"
    const val SETTINGS_SCREEN = "settings"
}

@Composable
fun NexaNavHost() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = NexaRoutes.MAIN_SCREEN) {
        composable(NexaRoutes.MAIN_SCREEN) {
            MainScreen(navController = navController)
        }
        composable(NexaRoutes.SETTINGS_SCREEN) {
            SettingsScreen(navController = navController)
        }
    }
}
