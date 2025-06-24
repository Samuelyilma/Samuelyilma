package com.example.nexa.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface ConversationDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMemory(memory: ConversationMemory): Long

    @Query("SELECT * FROM conversation_history ORDER BY timestamp DESC")
    fun getAllMemoriesFlow(): Flow<List<ConversationMemory>>

    @Query("SELECT * FROM conversation_history ORDER BY timestamp DESC")
    suspend fun getAllMemoriesList(): List<ConversationMemory>

    @Query("DELETE FROM conversation_history")
    suspend fun clearAllMemories()

    @Query("SELECT * FROM conversation_history WHERE id = :id")
    suspend fun getMemoryById(id: Int): ConversationMemory?

    // Optional: Delete specific memory
    @Query("DELETE FROM conversation_history WHERE id = :id")
    suspend fun deleteMemoryById(id: Int)

    @Query("SELECT * FROM conversation_history WHERE isSynced = 0 ORDER BY timestamp ASC") // Get oldest unsynced first
    suspend fun getUnsyncedMemories(): List<ConversationMemory>

    @Query("UPDATE conversation_history SET isSynced = 1 WHERE id IN (:memoryIds)")
    suspend fun markMemoriesAsSynced(memoryIds: List<Int>)
}
