package com.example.nexa.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "nexa_settings")

@Singleton
class UserPreferencesRepository @Inject constructor(@ApplicationContext private val context: Context) {

    companion object {
        val OLLAMA_IP_ADDRESS = stringPreferencesKey("ollama_ip_address")
        val IS_TTS_ENABLED = booleanPreferencesKey("is_tts_enabled")

        const val DEFAULT_OLLAMA_IP = "http://127.0.0.1:11434" // Default from user earlier
        const val DEFAULT_TTS_ENABLED = true
    }

    val ollamaIpAddressFlow: Flow<String> = context.dataStore.data
        .map { preferences ->
            preferences[OLLAMA_IP_ADDRESS] ?: DEFAULT_OLLAMA_IP
        }

    suspend fun saveOllamaIpAddress(ipAddress: String) {
        context.dataStore.edit { settings ->
            settings[OLLAMA_IP_ADDRESS] = ipAddress
        }
    }

    val isTtsEnabledFlow: Flow<Boolean> = context.dataStore.data
        .map { preferences ->
            preferences[IS_TTS_ENABLED] ?: DEFAULT_TTS_ENABLED
        }

    suspend fun saveTtsEnabled(isEnabled: Boolean) {
        context.dataStore.edit { settings ->
            settings[IS_TTS_ENABLED] = isEnabled
        }
    }
}
