package com.example.nexa.util

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.util.Locale

class TextToSpeechManager(
    context: Context,
    private val onSpeakingStateChanged: (Boolean) -> Unit,
    private val onError: (String) -> Unit
) : TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = null
    private val _isInitialized = MutableStateFlow(false)
    val isInitialized: StateFlow<Boolean> = _isInitialized

    private val _isSpeaking = MutableStateFlow(false)
    val isSpeaking: StateFlow<Boolean> = _isSpeaking

    companion object {
        private const val TAG = "TextToSpeechManager"
    }

    init {
        try {
            tts = TextToSpeech(context, this)
            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    _isSpeaking.value = true
                    onSpeakingStateChanged(true)
                }

                override fun onDone(utteranceId: String?) {
                    _isSpeaking.value = false
                    onSpeakingStateChanged(false)
                }

                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) {
                    _isSpeaking.value = false
                    onSpeakingStateChanged(false)
                    onError("TTS Error for utterance: $utteranceId")
                }

                override fun onError(utteranceId: String?, errorCode: Int) {
                    super.onError(utteranceId, errorCode)
                    _isSpeaking.value = false
                    onSpeakingStateChanged(false)
                    onError("TTS Error for utterance: $utteranceId, code: $errorCode")
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "TTS Initialization failed", e)
            onError("TTS Initialization failed: ${e.message}")
            _isInitialized.value = false
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale.US) // Or Locale.getDefault()
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Log.e(TAG, "TTS language not supported or missing data.")
                onError("TTS language not supported or missing data.")
                _isInitialized.value = false
            } else {
                Log.i(TAG, "TTS Initialized successfully.")
                _isInitialized.value = true
            }
        } else {
            Log.e(TAG, "TTS Initialization failed with status: $status")
            onError("TTS Initialization failed with status: $status")
            _isInitialized.value = false
        }
    }

    fun speak(text: String, utteranceId: String = "NexaUtterance") {
        if (!_isInitialized.value || tts == null) {
            onError("TTS not initialized or unavailable.")
            return
        }
        if (text.isBlank()) {
            onError("Cannot speak empty text.")
            return
        }
        if (_isSpeaking.value) {
            Log.w(TAG, "TTS is already speaking. Ignoring new request or consider queuing.")
            // Optionally, stop current speech and start new one:
            // tts?.stop()
            // Or queue: TextToSpeech.QUEUE_ADD
        }
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
    }

    fun stop() {
        if (_isSpeaking.value) {
            tts?.stop()
            _isSpeaking.value = false
            onSpeakingStateChanged(false)
        }
    }

    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        _isInitialized.value = false
        _isSpeaking.value = false
    }
}
