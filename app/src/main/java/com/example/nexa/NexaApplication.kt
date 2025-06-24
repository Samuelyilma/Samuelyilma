package com.example.nexa

import android.app.Application
import android.util.Log
import com.example.nexa.data.repository.OllamaRepository
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration

@HiltAndroidApp
class NexaApplication : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    // ollamaRepository injection is no longer needed here as test call was removed
    // @Inject
    // lateinit var ollamaRepository: OllamaRepository

    // private val applicationScope = CoroutineScope(Dispatchers.Main)

    override fun getWorkManagerConfiguration(): Configuration =
        Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .setMinimumLoggingLevel(Log.DEBUG) // Optional: for WorkManager logging
            .build()

    override fun onCreate() {
        super.onCreate()
        Log.d("NexaApplication", "NexaApplication onCreate. WorkManager Hilt configured.")
        // Initialization code if needed
    }
}
