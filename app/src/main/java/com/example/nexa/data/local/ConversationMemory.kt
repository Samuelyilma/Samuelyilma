package com.example.nexa.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

import androidx.room.ColumnInfo

@Entity(tableName = "conversation_history")
data class ConversationMemory(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val timestamp: Long = System.currentTimeMillis(),
    val userPrompt: String,
    val aiResponse: String,
    val modelUsed: String, // e.g., "llama3", "gemma:2b"

    @ColumnInfo(defaultValue = "0") // SQLite boolean: 0 for false, 1 for true
    val isSynced: Boolean = false
)
