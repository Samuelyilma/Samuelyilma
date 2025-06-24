package com.example.nexa.data.repository

import android.util.Log
import com.example.nexa.data.remote.OllamaApiService
import com.example.nexa.model.OllamaRequest
import com.example.nexa.model.OllamaResponse
import javax.inject.Inject
import javax.inject.Singleton

// Define a simple Result wrapper for now
sealed class ApiResult<out T> {
    data class Success<out T>(val data: T) : ApiResult<T>()
    data class Error(val message: String, val statusCode: Int? = null) : ApiResult<Nothing>()
}

@Singleton
class OllamaRepository @Inject constructor(
    private val ollamaApiService: OllamaApiService
    // TODO: Inject SharedPreferences or DataStore to get the IP address later
) {

    // For now, use a default IP. This will be replaced by settings.
    private var currentOllamaIp: String = "http://127.0.0.1:11434" // Default from user input

    fun setOllamaIp(ip: String) {
        // Basic validation, can be improved
        if (ip.startsWith("http://") || ip.startsWith("https://")) {
            currentOllamaIp = ip
        } else {
            currentOllamaIp = "http://$ip" // Assume http if not specified
        }
        // Ensure it doesn't end with a slash for consistency if /api/generate is appended
        if (currentOllamaIp.endsWith('/')) {
            currentOllamaIp = currentOllamaIp.dropLast(1)
        }
        Log.d("OllamaRepository", "Ollama IP set to: $currentOllamaIp")
    }

    suspend fun generateText(
        prompt: String,
        model: String = "llama3", // Default model, can be made configurable
        ollamaIpOverride: String? = null // Allow overriding IP for one-off calls if needed
    ): ApiResult<OllamaResponse> {
        val targetIp = ollamaIpOverride ?: currentOllamaIp
        val apiUrl = if (targetIp.endsWith("/api/generate")) {
            targetIp
        } else {
            // Ensure we don't have double slashes if targetIp ends with / and path starts with /
            val baseIp = if (targetIp.endsWith('/')) targetIp else "$targetIp/"
            "${baseIp}api/generate"
        }

        val request = OllamaRequest(model = model, prompt = prompt, stream = false)
        Log.d("OllamaRepository", "Sending request to $apiUrl with prompt: '$prompt' on model '$model'")

        return try {
            val response = ollamaApiService.generate(url = apiUrl, request = request)
            if (response.isSuccessful && response.body() != null) {
                Log.i("OllamaRepository", "API call successful. Response: ${response.body()!!.response}")
                ApiResult.Success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                Log.e("OllamaRepository", "API call failed. Code: ${response.code()}, Error: $errorBody")
                ApiResult.Error("API Error: ${response.message()} - $errorBody", response.code())
            }
        } catch (e: Exception) {
            Log.e("OllamaRepository", "Network request failed: ${e.message}", e)
            ApiResult.Error("Network request failed: ${e.message}")
        }
    }

    // Temporary function for testing the API call directly
    suspend fun testApiCall() {
        Log.d("OllamaRepository", "--- Starting Test API Call ---")
        // Use the IP address provided by the user
        // setOllamaIp("http://127.0.0.1:11434") // Already default, but can be set explicitly if needed

        val testPrompt = "Why is the sky blue?"
        val result = generateText(prompt = testPrompt, model = "gemma:2b") // Using gemma:2b as it's small

        when (result) {
            is ApiResult.Success -> {
                Log.i("OllamaRepositoryTest", "Test Success: ${result.data.response}")
            }
            is ApiResult.Error -> {
                Log.e("OllamaRepositoryTest", "Test Error: ${result.message} (Code: ${result.statusCode})")
            }
        }
        Log.d("OllamaRepository", "--- Finished Test API Call ---")
    }
}
