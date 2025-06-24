package com.example.nexa.model

import com.google.gson.annotations.SerializedName

data class OllamaResponse(
    @SerializedName("model")
    val model: String,
    @SerializedName("created_at")
    val createdAt: String,
    @SerializedName("response")
    val response: String,
    @SerializedName("done")
    val done: Boolean,

    // These fields are part of the response when not streaming.
    // If streaming, the structure might differ per chunk.
    // For stream=false, these should be present in the final response.
    @SerializedName("context")
    val context: List<Int>? = null, // Context for follow-up messages
    @SerializedName("total_duration")
    val totalDuration: Long? = null,
    @SerializedName("load_duration")
    val loadDuration: Long? = null,
    @SerializedName("prompt_eval_count")
    val promptEvalCount: Int? = null,
    @SerializedName("prompt_eval_duration")
    val promptEvalDuration: Long? = null,
    @SerializedName("eval_count")
    val evalCount: Int? = null,
    @SerializedName("eval_duration")
    val evalDuration: Long? = null
)

// Example of a streaming response chunk (if stream=true was used)
// data class OllamaStreamResponseChunk(
//    @SerializedName("model")
//    val model: String,
//    @SerializedName("created_at")
//    val createdAt: String,
//    @SerializedName("response")
//    val response: String, // This would be a part of the full response
//    @SerializedName("done")
//    val done: Boolean // True only for the last chunk
//    // Other fields like context, durations, counts usually appear in the last chunk when done is true.
// )
