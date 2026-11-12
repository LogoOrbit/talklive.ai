import java.time.Duration

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.roborazzi)
}

// Push needs Firebase's config (google-services.json, from the Firebase
// console). Without it the app builds and runs, just without push. The file
// lists app.talklive (the Play app); app.talklive.debug is optional - without
// it, test builds simply have no push.
val firebaseConfig = file("google-services.json")
val firebaseText = if (firebaseConfig.exists()) firebaseConfig.readText() else ""
if (firebaseText.contains("\"app.talklive\"")) {
    apply(plugin = "com.google.gms.google-services")
    if (!firebaseText.contains("\"app.talklive.debug\"")) {
        tasks.configureEach {
            // -PtestBuild gives the release build the test id too (see below).
            val testId = name.contains("Debug") || (name.contains("Release") && project.hasProperty("testBuild"))
            if (name.startsWith("process") && testId && name.endsWith("GoogleServices")) enabled = false
        }
    }
}

// -PabiSplit builds one release APK per phone chip instead of one that carries
// both. The WebRTC library is most of the app, so the APK a phone actually
// installs is 16 MB (64-bit) or 11 MB (32-bit) instead of 23 MB. Google Play
// already does this from the bundle; this is for APKs handed out directly.
val abiSplit = project.hasProperty("abiSplit")

android {
    namespace = "app.talklive"
    compileSdk = 36

    defaultConfig {
        // Same id as the Capacitor app, so this ships as an update to the
        // existing Play listing.
        applicationId = "app.talklive"
        minSdk = 26
        targetSdk = 36
        versionCode = 128
        versionName = "3.9.8"
        buildConfigField("String", "SERVER_URL", "\"https://talklive.app\"")
    }

    signingConfigs {
        // Shared debug key, so test builds from CI and every machine have the same
        // SHA-1 (Google sign-in and Firebase need it registered). Not secret: debug only.
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
        create("release") {
            System.getenv("TALKLIVE_KEYSTORE")?.let { path ->
                storeFile = file(path)
                storePassword = System.getenv("TALKLIVE_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("TALKLIVE_KEY_ALIAS") ?: "upload"
                keyPassword = System.getenv("TALKLIVE_KEY_PASSWORD") ?: System.getenv("TALKLIVE_KEYSTORE_PASSWORD")
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            signingConfig = signingConfigs.getByName("debug")
            if (!abiSplit) ndk { abiFilters += listOf("arm64-v8a", "x86_64") }
            // Point a debug build at a local server with:
            //   ./gradlew installDebug -PserverUrl=http://10.0.2.2:5000
            (project.findProperty("serverUrl") as String?)?.let {
                buildConfigField("String", "SERVER_URL", "\"$it\"")
            }
        }
        release {
            // Phones only: without this the APK also carried the WebRTC library
            // for desktop-emulator chips, which made the download twice the size.
            if (!abiSplit) ndk { abiFilters += listOf("arm64-v8a", "armeabi-v7a") }
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (System.getenv("TALKLIVE_KEYSTORE") != null) signingConfig = signingConfigs.getByName("release")
            // -PtestBuild: the real, optimised app as a test install. It gets the
            // test id and test key, so it installs next to the Play Store app
            // instead of being refused for not matching its signature.
            if (project.hasProperty("testBuild")) {
                applicationIdSuffix = ".debug"
                signingConfig = signingConfigs.getByName("debug")
            }
        }
    }

    splits {
        abi {
            isEnable = abiSplit
            reset()
            include("arm64-v8a", "armeabi-v7a")
            isUniversalApk = false
        }
    }

    // Files libraries leave in the APK that nothing on a phone reads.
    packaging {
        resources {
            excludes += setOf(
                "META-INF/**/LICENSE.txt", "META-INF/AL2.0", "META-INF/LGPL2.1", "META-INF/*.version",
                "DebugProbesKt.bin", "kotlin-tooling-metadata.json",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    testOptions {
        unitTests.isIncludeAndroidResources = true
        // A screen that never settles must fail the run, not stall it.
        unitTests.all { it.timeout.set(Duration.ofMinutes(25)) }
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

kotlin {
    compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.service)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.animation.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)

    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.socketio.client) {
        // Android ships org.json already.
        exclude(group = "org.json", module = "json")
    }
    implementation(libs.okhttp)
    implementation(libs.webrtc)
    implementation(libs.coil.compose)
    implementation(libs.billing)
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)
    implementation(libs.androidx.lifecycle.process)
    implementation(libs.coil.gif)
    implementation(libs.credentials)
    implementation(libs.credentials.play)
    implementation(libs.googleid)

    testImplementation(libs.junit)
    testImplementation(libs.robolectric)
    testImplementation(libs.roborazzi)
    testImplementation(libs.roborazzi.compose)
    testImplementation(platform(libs.compose.bom))
    testImplementation(libs.compose.ui.test.junit4)
    debugImplementation(libs.compose.ui.test.manifest)
}
