package com.example.nexa.model

import com.google.gson.annotations.SerializedName

data class OllamaRequest(
    @SerializedName("model")
    val model: String,
    @SerializedName("prompt")
    val prompt: String,
    @SerializedName("stream")
    val stream: Boolean = false, // As per requirements
    // Optional: Add other parameters like system, template, context, options if needed later
    // @SerializedName("system") val system: String? = null,
    // @SerializedName("template") val template: String? = null,
    // @SerializedName("context") val context: List<Int>? = null,
    // @SerializedName("options") val options: Map<String, Any>? = null
)
