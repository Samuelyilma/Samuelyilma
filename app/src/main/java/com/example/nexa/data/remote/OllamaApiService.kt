package com.example.nexa.data.remote

import com.example.nexa.model.OllamaRequest
import com.example.nexa.model.OllamaResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Url

interface OllamaApiService {

    @POST
    suspend fun generate(
        @Url url: String, // Full URL will be passed here, e.g., "http://<IP>:11434/api/generate"
        @Body request: OllamaRequest
    ): Response<OllamaResponse>

    // If we wanted to always use a base URL and just specify the path:
    // @POST("/api/generate")
    // suspend fun generate(@Body request: OllamaRequest): Response<OllamaResponse>
    // This would require setting a base URL for Retrofit, which can be dynamic.
    // For full dynamic IP, passing the @Url is simpler for this direct case.
}
