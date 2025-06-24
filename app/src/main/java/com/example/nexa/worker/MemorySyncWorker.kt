package com.example.nexa.worker

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.nexa.data.local.ConversationDao
import com.example.nexa.data.remote.SemanticMemoryApi
import com.example.nexa.data.remote.toConversationMemoryItem
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.delay

@HiltWorker
class MemorySyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val conversationDao: ConversationDao,
    private val semanticMemoryApi: SemanticMemoryApi // This will be the mocked API
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        const val WORK_NAME = "MemorySyncWorker"
        private const val TAG = "MemorySyncWorker"
    }

    override suspend fun doWork(): Result {
        Log.d(TAG, "MemorySyncWorker started.")
        try {
            val unsyncedMemories = conversationDao.getUnsyncedMemories()
            if (unsyncedMemories.isEmpty()) {
                Log.d(TAG, "No memories to sync.")
                return Result.success()
            }

            Log.d(TAG, "Found ${unsyncedMemories.size} unsynced memories. Preparing to sync.")
            val memoryItemsToSync = unsyncedMemories.map { it.toConversationMemoryItem() }

            // --- Mocked Network Call ---
            // In a real scenario, this would be:
            // val response = semanticMemoryApi.syncMemories(memoryItemsToSync)
            // if (response.isSuccessful) { ... } else { ... }

            // Mock implementation:
            Log.d(TAG, "Simulating network call to sync ${memoryItemsToSync.size} items...")
            delay(2000) // Simulate network latency
            val mockSuccess = true // Change to false to test retry/failure

            if (mockSuccess) {
                Log.d(TAG, "Mock sync successful for ${memoryItemsToSync.size} items.")
                val syncedIds = unsyncedMemories.map { it.id }
                conversationDao.markMemoriesAsSynced(syncedIds)
                Log.d(TAG, "Marked ${syncedIds.size} memories as synced in local DB.")
                return Result.success()
            } else {
                Log.w(TAG, "Mock sync failed. Worker will retry if configured.")
                return Result.retry() // Or Result.failure() if no retry is desired
            }
            // --- End Mocked Network Call ---

        } catch (e: Exception) {
            Log.e(TAG, "Error during memory sync: ${e.message}", e)
            return Result.failure() // Or Result.retry() depending on the exception
        }
    }
}
