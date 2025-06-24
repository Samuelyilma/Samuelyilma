package com.example.nexa.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import com.example.nexa.ui.theme.NexaTheme
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.nexa.viewmodel.SettingsViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    navController: NavController,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    // val context = LocalContext.current // Not directly needed now
    val snackbarHostState = remember { SnackbarHostState() }
    // val coroutineScope = rememberCoroutineScope() // Not directly needed now

    // Collect states from ViewModel
    val operationStatus by viewModel.operationStatus.collectAsState()
    val errorStatus by viewModel.errorStatus.collectAsState()
    val currentOllamaIp by viewModel.ollamaIpAddress.collectAsState()
    val isTtsEnabled by viewModel.isTtsEnabled.collectAsState()

    // Local state for the TextField, synced with ViewModel's collected state
    var tempOllamaIpAddress by remember(currentOllamaIp) { mutableStateOf(currentOllamaIp) }


    LaunchedEffect(operationStatus) {
        operationStatus?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearStatusMessages() // ViewModel clears its own status
        }
    }
    LaunchedEffect(errorStatus) {
        errorStatus?.let {
            snackbarHostState.showSnackbar("Error: $it", duration = SnackbarDuration.Long)
            viewModel.clearStatusMessages() // ViewModel clears its own status
        }
    }

    // SAF Launcher for exporting memories
    val exportMemoriesLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("application/json"),
        onResult = { uri: Uri? ->
            uri?.let { viewModel.exportMemories(it) }
        }
    )

    // SAF Launcher for importing memories
    val importMemoriesLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent(),
        onResult = { uri: Uri? ->
            uri?.let { viewModel.importMemories(it) }
        }
    )

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Settings", color = MaterialTheme.colorScheme.onPrimary) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(
                            imageVector = Icons.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                "Configure Nexa Settings",
                fontSize = 20.sp,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            OutlinedTextField(
                value = tempOllamaIpAddress,
                onValueChange = { tempOllamaIpAddress = it },
                label = { Text("Ollama Server IP Address") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                colors = TextFieldDefaults.outlinedTextFieldColors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                    textColor = MaterialTheme.colorScheme.onBackground,
                    cursorColor = MaterialTheme.colorScheme.primary,
                    focusedLabelColor = MaterialTheme.colorScheme.primary,
                    unfocusedLabelColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
            )

            // Placeholder for other settings
            // Dark Mode Toggle (though theme is hardcoded dark for now)
            // Voice Mode Toggle
            // Export Memories Button
            // Import Memories Button
            // Voice Mode Toggle (Placeholder for now)
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Enable Voice Output (TTS)", color = MaterialTheme.colorScheme.onBackground)
                Switch(
                    checked = isTtsEnabled,
                    onCheckedChange = { viewModel.saveTtsEnabled(it) },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = MaterialTheme.colorScheme.primary,
                        checkedTrackColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f),
                        uncheckedThumbColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        uncheckedTrackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f)
                    )
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
            Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
            Spacer(modifier = Modifier.height(16.dp))

            Text(
                "Memory Management",
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Button(
                onClick = { exportMemoriesLauncher.launch("Nexa_Memories.json") },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
            ) {
                Text("Export Memories (.json)", color = MaterialTheme.colorScheme.onSecondary)
            }

            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = { importMemoriesLauncher.launch("application/json") },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
            ) {
                Text("Import Memories (.json)", color = MaterialTheme.colorScheme.onSecondary)
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Confirmation Dialog for Reset
            var showResetDialog by remember { mutableStateOf(false) }
            if (showResetDialog) {
                AlertDialog(
                    onDismissRequest = { showResetDialog = false },
                    title = { Text("Confirm Reset") },
                    text = { Text("Are you sure you want to delete all memories? This action cannot be undone.") },
                    confirmButton = {
                        Button(
                            onClick = {
                                viewModel.resetMemory()
                                showResetDialog = false
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                        ) {
                            Text("Reset", color = MaterialTheme.colorScheme.onError)
                        }
                    },
                    dismissButton = {
                        Button(onClick = { showResetDialog = false }) {
                            Text("Cancel")
                        }
                    }
                )
            }

            Button(
                onClick = { showResetDialog = true },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer)
            ) {
                Text("Reset All Memories", color = MaterialTheme.colorScheme.onErrorContainer)
            }


            Spacer(modifier = Modifier.weight(1f)) // Push Save button to bottom

            Button(
                onClick = {
                    viewModel.saveOllamaIpAddress(tempOllamaIpAddress)
                    // Optionally, wait for confirmation or just pop. Snackbar will show status.
                    navController.popBackStack()
                },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Save & Close", color = MaterialTheme.colorScheme.onPrimary)
            }
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF000000)
@Composable
fun SettingsScreenPreview() {
    NexaTheme(darkTheme = true) {
        SettingsScreen(navController = rememberNavController())
    }
}
