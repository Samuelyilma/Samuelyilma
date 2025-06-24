package com.example.nexa.data.remote

import com.example.nexa.model.ConversationMemoryItem // To be defined, represents memory for API
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

// This data class represents the structure expected by the (mocked) server API for a memory item.
// It might be different from ConversationMemory Room entity, e.g., excluding 'id' or 'isSynced'.
data class ConversationMemoryItem(
    val timestamp: Long,
    val userPrompt: String,
    val aiResponse: String,
    val modelUsed: String
    // Add any other fields the server expects, e.g., a unique client-side ID if needed for idempotency
    // val clientMemoryId: String
)

interface SemanticMemoryApi {
    @POST("/api/sync/memories") // Example endpoint
    suspend fun syncMemories(@Body memories: List<ConversationMemoryItem>): Response<Unit> // Simple success/failure
}

// Helper extension to map Room entity to API item
fun com.example.nexa.data.local.ConversationMemory.toConversationMemoryItem(): ConversationMemoryItem {
    return ConversationMemoryItem(
        timestamp = this.timestamp,
        userPrompt = this.userPrompt,
        aiResponse = this.aiResponse,
        modelUsed = this.modelUsed
    )
}
