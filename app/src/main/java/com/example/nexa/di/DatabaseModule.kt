package com.example.nexa.di

import android.content.Context
import androidx.room.Room
import com.example.nexa.data.local.ConversationDao
import com.example.nexa.data.local.NexaDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideNexaDatabase(@ApplicationContext context: Context): NexaDatabase {
        return Room.databaseBuilder(
            context.applicationContext,
            NexaDatabase::class.java,
            NexaDatabase.DATABASE_NAME
        )
        .fallbackToDestructiveMigration() // For simplicity in this dev phase. Real app needs proper migration.
        .build()
    }

    @Provides
    @Singleton
    fun provideConversationDao(database: NexaDatabase): ConversationDao {
        return database.conversationDao()
    }
}
