package com.example.nexa.data.local

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.IOException

@RunWith(AndroidJUnit4::class)
class ConversationDaoTest {

    private lateinit var conversationDao: ConversationDao
    private lateinit var db: NexaDatabase

    @Before
    fun createDb() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, NexaDatabase::class.java)
            .allowMainThreadQueries() // Allowing main thread queries for simplicity in tests
            .build()
        conversationDao = db.conversationDao()
    }

    @After
    @Throws(IOException::class)
    fun closeDb() {
        db.close()
    }

    @Test
    @Throws(Exception::class)
    fun insertAndGetMemory() = runBlocking {
        val memory = ConversationMemory(userPrompt = "Hello", aiResponse = "Hi there", modelUsed = "test-model")
        val id = conversationDao.insertMemory(memory)
        assertTrue(id > 0)

        val retrievedMemory = conversationDao.getMemoryById(id.toInt())
        assertNotNull(retrievedMemory)
        assertEquals("Hello", retrievedMemory?.userPrompt)
        assertEquals("Hi there", retrievedMemory?.aiResponse)
    }

    @Test
    @Throws(Exception::class)
    fun getAllMemoriesFlowRetrievesData() = runBlocking {
        val memory1 = ConversationMemory(userPrompt = "Prompt 1", aiResponse = "Response 1", modelUsed = "model1")
        val memory2 = ConversationMemory(userPrompt = "Prompt 2", aiResponse = "Response 2", modelUsed = "model2", timestamp = System.currentTimeMillis() + 1000) // ensure different timestamp for order
        conversationDao.insertMemory(memory1)
        conversationDao.insertMemory(memory2)

        val memoriesFlow = conversationDao.getAllMemoriesFlow()
        val memoriesList = memoriesFlow.first() // Get the first emitted list

        assertEquals(2, memoriesList.size)
        // Check order (DESC by timestamp)
        assertEquals("Prompt 2", memoriesList[0].userPrompt)
        assertEquals("Prompt 1", memoriesList[1].userPrompt)
    }

    @Test
    @Throws(Exception::class)
    fun getAllMemoriesListRetrievesData() = runBlocking {
        val memory1 = ConversationMemory(userPrompt = "Prompt 1", aiResponse = "Response 1", modelUsed = "model1")
        val memory2 = ConversationMemory(userPrompt = "Prompt 2", aiResponse = "Response 2", modelUsed = "model2", timestamp = System.currentTimeMillis() + 1000)
        conversationDao.insertMemory(memory1)
        conversationDao.insertMemory(memory2)

        val memoriesList = conversationDao.getAllMemoriesList()

        assertEquals(2, memoriesList.size)
        assertEquals("Prompt 2", memoriesList[0].userPrompt)
        assertEquals("Prompt 1", memoriesList[1].userPrompt)
    }

    @Test
    @Throws(Exception::class)
    fun clearAllMemoriesDeletesAllData() = runBlocking {
        val memory1 = ConversationMemory(userPrompt = "Test 1", aiResponse = "Resp 1", modelUsed = "m1")
        val memory2 = ConversationMemory(userPrompt = "Test 2", aiResponse = "Resp 2", modelUsed = "m2")
        conversationDao.insertMemory(memory1)
        conversationDao.insertMemory(memory2)

        var memories = conversationDao.getAllMemoriesList()
        assertEquals(2, memories.size)

        conversationDao.clearAllMemories()
        memories = conversationDao.getAllMemoriesList()
        assertTrue(memories.isEmpty())
    }

    @Test
    @Throws(Exception::class)
    fun deleteMemoryByIdRemovesCorrectMemory() = runBlocking {
        val memory1 = ConversationMemory(userPrompt = "To Delete", aiResponse = "Delete Me", modelUsed = "delete_model")
        val memory2 = ConversationMemory(userPrompt = "To Keep", aiResponse = "Keep Me", modelUsed = "keep_model")

        val id1 = conversationDao.insertMemory(memory1)
        val id2 = conversationDao.insertMemory(memory2)

        assertNotNull(conversationDao.getMemoryById(id1.toInt()))
        assertNotNull(conversationDao.getMemoryById(id2.toInt()))

        conversationDao.deleteMemoryById(id1.toInt())

        assertNull(conversationDao.getMemoryById(id1.toInt()))
        assertNotNull(conversationDao.getMemoryById(id2.toInt()))

        val remainingMemories = conversationDao.getAllMemoriesList()
        assertEquals(1, remainingMemories.size)
        assertEquals("To Keep", remainingMemories[0].userPrompt)
    }
}
