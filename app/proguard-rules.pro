# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep rules here:

# If you use reflection or JNI commands, add the appropriate keep rules.
# Failure to do so will likely result in an ObfuscationError.
# See http://proguard.sourceforge.net/documentation/troubleshooting.html#obfuscationerror

# Hilt
-keepclassmembers class * {
    @dagger.hilt.android.internal.managers.ActivityComponentManager$ActivityComponentBuilder *;
    @dagger.hilt.android.internal.managers.BroadcastReceiverComponentManager$BroadcastReceiverComponentBuilder *;
    @dagger.hilt.android.internal.managers.FragmentComponentManager$FragmentComponentBuilder *;
    @dagger.hilt.android.internal.managers.ServiceComponentManager$ServiceComponentBuilder *;
    @dagger.hilt.android.internal.managers.ViewComponentManager$ViewComponentBuilder *;
    @dagger.hilt.android.internal.managers.ViewWithFragmentComponentManager$ViewWithFragmentComponentBuilder *;
}
-keep class * {
    @dagger.hilt.android.HiltAndroidApp *;
}
-keep class * {
    @dagger.hilt.android.lifecycle.HiltViewModel *;
}
-dontwarn dagger.hilt.**

# Room
-keep class androidx.room.** { *; }
-dontwarn androidx.room.paging.LimitOffsetDataSource

# Gson (if using Retrofit with Gson)
-keepattributes Signature
-keepattributes *Annotation*
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class com.google.gson.examples.android.model.** { *; }
