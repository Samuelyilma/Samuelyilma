package com.example.nexa.viewmodel

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.nexa.data.local.ConversationDao
import com.example.nexa.data.local.ConversationMemory
import com.example.nexa.data.repository.ApiResult
import com.example.nexa.data.repository.OllamaRepository
import com.example.nexa.ui.screens.NexaVisualState
import com.example.nexa.util.SpeechRecognizerManager
import com.example.nexa.util.TextToSpeechManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject
import androidx.work.*
import com.example.nexa.data.UserPreferencesRepository
import com.example.nexa.worker.MemorySyncWorker
import java.util.concurrent.TimeUnit

@HiltViewModel
class MainViewModel @Inject constructor(
    application: Application, // For context
    private val ollamaRepository: OllamaRepository,
    private val conversationDao: ConversationDao,
    private val userPreferencesRepository: UserPreferencesRepository
) : AndroidViewModel(application) {

    private val _nexaVisualState = MutableStateFlow(NexaVisualState.IDLE)
    val nexaVisualState: StateFlow<NexaVisualState> = _nexaVisualState.asStateFlow()

    private val _transcribedText = MutableStateFlow("Tap to speak")
    val transcribedText: StateFlow<String> = _transcribedText.asStateFlow()

    private val _aiResponseText = MutableStateFlow("")
    val aiResponseText: StateFlow<String> = _aiResponseText.asStateFlow()

    private val _lastError = MutableStateFlow<String?>(null)
    val lastError: StateFlow<String?> = _lastError.asStateFlow()

    private val _isTtsInitialized = MutableStateFlow(false)
    // val isTtsInitialized: StateFlow<Boolean> = _isTtsInitialized.asStateFlow()

    private val _isListening = MutableStateFlow(false)
    val isListening: StateFlow<Boolean> = _isListening.asStateFlow()

    // User preferences states
    private val _currentOllamaIp = MutableStateFlow(UserPreferencesRepository.DEFAULT_OLLAMA_IP)
    private val _isTtsUserEnabled = MutableStateFlow(UserPreferencesRepository.DEFAULT_TTS_ENABLED)
    val isTtsUserEnabled: StateFlow<Boolean> = _isTtsUserEnabled.asStateFlow() // Expose for UI if needed

    init {
        viewModelScope.launch {
            userPreferencesRepository.ollamaIpAddressFlow.collect { ip ->
                _currentOllamaIp.value = ip
                ollamaRepository.setOllamaIp(ip) // Update repository with the loaded IP
                Log.d("MainViewModel", "Ollama IP loaded: $ip")
            }
        }
        viewModelScope.launch {
            userPreferencesRepository.isTtsEnabledFlow.collect { enabled ->
                _isTtsUserEnabled.value = enabled
                Log.d("MainViewModel", "TTS Enabled loaded: $enabled")
            }
        }
    }

    val speechRecognizerManager: SpeechRecognizerManager = SpeechRecognizerManager(
        context = application.applicationContext,
        onResult = { result ->
            _transcribedText.value = result
            _nexaVisualState.value = NexaVisualState.THINKING
            processTranscription(result)
        },
        onError = { error ->
            Log.e("MainViewModel", "Speech Error: $error")
            _lastError.value = "Speech Error: $error"
            _transcribedText.value = "Error: $error"
            _nexaVisualState.value = NexaVisualState.ERROR
            _isListening.value = false
        },
        onPartialResult = { partial ->
            _transcribedText.value = partial
             if (_nexaVisualState.value != NexaVisualState.LISTENING && (partial == "Listening..." || partial.isNotBlank() && _nexaVisualState.value == NexaVisualState.IDLE) ) {
                 _nexaVisualState.value = NexaVisualState.LISTENING
                 _isListening.value = true
            }
        }
    ).also {
        // Collect isListening state from speechRecognizerManager if it exposes one
        // For now, setting it directly in callbacks.
    }

    val ttsManager: TextToSpeechManager = TextToSpeechManager(
        context = application.applicationContext,
        onSpeakingStateChanged = { isSpeaking ->
            if (isSpeaking) {
                _nexaVisualState.value = NexaVisualState.SPEAKING
            } else {
                // Only transition to IDLE if we were indeed speaking.
                // Avoids overriding ERROR state if TTS finishes after an error.
                if (_nexaVisualState.value == NexaVisualState.SPEAKING) {
                    _nexaVisualState.value = NexaVisualState.IDLE
                    // _transcribedText.value = "Tap to speak" // Reset for next interaction
                }
            }
        },
        onError = { error ->
            Log.e("MainViewModel", "TTS Error: $error")
            _lastError.value = "TTS Error: $error"
            // Avoid setting state to ERROR here if it's just a TTS playback issue
            // unless it's critical. If it was SPEAKING, let it transition to IDLE.
            if (_nexaVisualState.value == NexaVisualState.SPEAKING) {
                 _nexaVisualState.value = NexaVisualState.IDLE
            }
        }
    ).also {
        viewModelScope.launch {
            it.isInitialized.collect { initialized ->
                _isTtsInitialized.value = initialized
            }
        }
    }


    private fun processTranscription(text: String) {
        if (text.isBlank()) {
            _nexaVisualState.value = NexaVisualState.IDLE
            _isListening.value = false
            return
        }
        _isListening.value = false // Finished listening phase
        _nexaVisualState.value = NexaVisualState.THINKING
        _aiResponseText.value = "Thinking..." // Show thinking state in UI

        viewModelScope.launch {
            val currentModel = "gemma:2b" // TODO: Make this configurable later
            // TODO: Get IP from settings eventually
            // ollamaRepository.setOllamaIp("USER_CONFIGURED_IP")
            val result = ollamaRepository.generateText(prompt = text, model = currentModel)
            when (result) {
                is ApiResult.Success -> {
                    val aiResponse = result.data.response
                    _aiResponseText.value = aiResponse

                    // Save to database
                    if (text.isNotBlank() && aiResponse.isNotBlank()) {
                        try {
                            conversationDao.insertMemory(
                                ConversationMemory(
                                    userPrompt = text,
                                    aiResponse = aiResponse,
                                    modelUsed = result.data.model // Use model from response
                                )
                            )
                            Log.i("MainViewModel", "Memory saved: Prompt: '$text', Response: '$aiResponse'")
                            scheduleMemorySync() // Schedule sync after saving
                        } catch (e: Exception) {
                            Log.e("MainViewModel", "Error saving memory to database", e)
                            _lastError.value = "DB Error: Failed to save memory."
                            // Optionally, don't let this db error disrupt the user flow too much
                        }
                    }

                    if (_isTtsUserEnabled.value && _isTtsInitialized.value && aiResponse.isNotBlank()) {
                        ttsManager.speak(aiResponse)
                        // TTS onSpeakingStateChanged will set state to SPEAKING then IDLE
                    } else if (aiResponse.isBlank()){
                         _aiResponseText.value = "Received empty response from AI."
                        _nexaVisualState.value = NexaVisualState.IDLE
                    }
                    else {
                         _aiResponseText.value = aiResponse + "\n(TTS not ready or response empty)"
                        _nexaVisualState.value = NexaVisualState.IDLE // No TTS, so go to IDLE
                    }
                }
                is ApiResult.Error -> {
                    _lastError.value = "AI Error: ${result.message}"
                    _aiResponseText.value = "Error: ${result.message}"
                    _nexaVisualState.value = NexaVisualState.ERROR
                }
            }
        }
    }

    fun startListening() {
        _lastError.value = null // Clear previous error
        _aiResponseText.value = "" // Clear previous AI response
        _transcribedText.value = "Listening..." // Initial prompt before STT provides its own
        // Permission should be handled in UI before calling this
        speechRecognizerManager.startListening()
        // speechRecognizerManager.isListening will be true and collected by UI
        // _nexaVisualState will be set by onPartialResult callback
    }

    fun stopListening() {
        speechRecognizerManager.stopListening()
        _isListening.value = false
        if (_nexaVisualState.value == NexaVisualState.LISTENING) {
            _nexaVisualState.value = NexaVisualState.IDLE
            _transcribedText.value = "Tap to speak"
        }
    }


    override fun onCleared() {
        speechRecognizerManager.destroy()
        ttsManager.shutdown()
        super.onCleared()
    }

    // Called from UI when the main button is tapped
    fun onMicTap(hasAudioPermission: Boolean, requestPermission: () -> Unit) {
        if (!hasAudioPermission) {
            requestPermission()
            return
        }

        if (_nexaVisualState.value == NexaVisualState.LISTENING) {
            stopListening()
        } else if (_nexaVisualState.value == NexaVisualState.IDLE || _nexaVisualState.value == NexaVisualState.ERROR) {
            startListening()
        }
        // If SPEAKING or THINKING, button might be disabled or tap ignored by UI logic based on state
    }

    // Temporary: remove the test call from NexaApplication if this VM is used.
    // This VM is now responsible for calling the repository.

    fun handlePermissionDenied() {
        _lastError.value = "Audio permission is required to use voice input."
        _nexaVisualState.value = NexaVisualState.ERROR
        _transcribedText.value = "Permission Denied" // Update text to reflect this
    }

    private fun scheduleMemorySync() {
        val workManager = WorkManager.getInstance(getApplication())

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            // Optionally, add other constraints like battery not low, etc.
            // .setRequiresBatteryNotLow(true)
            .build()

        val syncWorkRequest = OneTimeWorkRequestBuilder<MemorySyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria( // Optional: Define retry strategy
                BackoffPolicy.EXPONENTIAL,
                OneTimeWorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            // .addTag(MemorySyncWorker.WORK_NAME) // Optional tag for observing or cancelling
            .build()

        // Enqueue the work as unique to prevent duplicate syncs if one is already pending
        workManager.enqueueUniqueWork(
            MemorySyncWorker.WORK_NAME,
            ExistingWorkPolicy.KEEP, // Keep existing work if pending, or REPLACE/APPEND
            syncWorkRequest
        )
        Log.d("MainViewModel", "MemorySyncWorker enqueued.")
    }
}
