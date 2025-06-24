package com.example.nexa.di

import com.example.nexa.data.remote.OllamaApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    // Default base URL - Retrofit requires one, even if we override with @Url.
    // It can be any valid URL. Using a placeholder.
    private const val PLACEHOLDER_BASE_URL = "http://localhost/"

    @Provides
    @Singleton
    fun provideHttpLoggingInterceptor(): HttpLoggingInterceptor {
        val loggingInterceptor = HttpLoggingInterceptor()
        loggingInterceptor.level = HttpLoggingInterceptor.Level.BODY // Log request and response bodies
        return loggingInterceptor
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(loggingInterceptor: HttpLoggingInterceptor): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            // Add other configurations like timeouts if needed
            // .connectTimeout(30, TimeUnit.SECONDS)
            // .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(PLACEHOLDER_BASE_URL) // Base URL is required but can be overridden by @Url
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideOllamaApiService(retrofit: Retrofit): OllamaApiService {
        return retrofit.create(OllamaApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideGson(): com.google.gson.Gson { // Fully qualify to avoid ambiguity if other Gson exists
        return com.google.gson.GsonBuilder().create() // Default Gson instance
        // Can customize with .setPrettyPrinting() etc. if needed for export.
    }

    @Provides
    @Singleton
    fun provideSemanticMemoryApi(retrofit: Retrofit): com.example.nexa.data.remote.SemanticMemoryApi {
        // Note: The Retrofit instance uses PLACEHOLDER_BASE_URL.
        // If SemanticMemoryApi had a different base URL, a named Retrofit instance would be needed.
        // For now, assuming it could share the same placeholder or its calls will be fully mocked.
        return retrofit.create(com.example.nexa.data.remote.SemanticMemoryApi::class.java)
    }
}
