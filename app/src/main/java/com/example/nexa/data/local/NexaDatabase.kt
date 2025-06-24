package com.example.nexa.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(entities = [ConversationMemory::class], version = 2, exportSchema = true) // Incremented version, enable exportSchema for migrations
abstract class NexaDatabase : RoomDatabase() {
    abstract fun conversationDao(): ConversationDao

    companion object {
        const val DATABASE_NAME = "nexa_database"
    }
}
