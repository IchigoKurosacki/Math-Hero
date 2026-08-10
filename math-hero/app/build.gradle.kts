import com.google.gms.googleservices.GoogleServicesPlugin.MissingGoogleServicesStrategy
import java.util.Properties
import java.io.FileInputStream

plugins {
  alias(libs.plugins.android.application)
  alias(libs.plugins.kotlin.compose)
  alias(libs.plugins.google.devtools.ksp)
  alias(libs.plugins.roborazzi)
  alias(libs.plugins.secrets)
  alias(libs.plugins.google.services)
}

android {
  namespace = "com.example"
  compileSdk { version = release(36) { minorApiLevel = 1 } }

  defaultConfig {
    applicationId = "com.aistudio.mathhero.abcd"
    minSdk = 24
    targetSdk = 36
    versionCode = 1
    versionName = "1.0"

    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
  }

  signingConfigs {
    create("release") {
      val keystorePropsFile = file("${rootDir}/key.properties")
      val keystoreProps = Properties()
      if (keystorePropsFile.exists()) {
        keystoreProps.load(FileInputStream(keystorePropsFile))
      }

      val keyPath = keystoreProps.getProperty("storeFile") ?: System.getenv("KEYSTORE_PATH") ?: "upload-keystore.jks"
      val keystoreFile = if (file(keyPath).isAbsolute) file(keyPath) else if (file("${rootDir}/$keyPath").exists()) file("${rootDir}/$keyPath") else file("${projectDir}/$keyPath")
      val storePass = keystoreProps.getProperty("storePassword") ?: System.getenv("STORE_PASSWORD") ?: "MathHeroRelease2026Pass"
      val alias = keystoreProps.getProperty("keyAlias") ?: System.getenv("KEY_ALIAS") ?: "mathhero_upload"
      val keyPass = keystoreProps.getProperty("keyPassword") ?: System.getenv("KEY_PASSWORD") ?: storePass

      if (keystoreFile.exists()) {
        storeFile = keystoreFile
        storePassword = storePass
        keyAlias = alias
        keyPassword = keyPass
      } else {
        storeFile = file("${rootDir}/debug.keystore")
        storePassword = "android"
        keyAlias = "androiddebugkey"
        keyPassword = "android"
      }
    }
    create("debugConfig") {
      storeFile = file("${rootDir}/debug.keystore")
      storePassword = "android"
      keyAlias = "androiddebugkey"
      keyPassword = "android"
    }
  }

  buildTypes {
    release {
      isCrunchPngs = false
      isMinifyEnabled = true
      isShrinkResources = true
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
      signingConfig = signingConfigs.getByName("release")
    }
    debug { 
      isCrunchPngs = false
      isMinifyEnabled = true
      isShrinkResources = true
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
      signingConfig = signingConfigs.getByName("debugConfig") 
    }
  }
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
  }
  buildFeatures {
    compose = true
    buildConfig = true
  }
  testOptions { unitTests { isIncludeAndroidResources = true } }
  dependenciesInfo {
    includeInApk = false
    includeInBundle = true
  }
}

// Configure the Secrets Gradle Plugin to use .env and .env.example files
// to match the convention used in Web projects.
secrets {
  propertiesFileName = ".env"
  defaultPropertiesFileName = ".env.example"
  ignoreList.add("FIREBASE_APPCHECK_DEBUG_TOKEN")
}

googleServices { missingGoogleServicesStrategy = MissingGoogleServicesStrategy.WARN }

// Some unused dependencies are commented out below instead of being removed.
// This makes it easy to add them back in the future if needed.
dependencies {
  implementation(platform(libs.androidx.compose.bom))
  implementation(platform(libs.firebase.bom))
  // implementation(libs.accompanist.permissions)
  implementation("androidx.webkit:webkit:1.11.0")
  implementation(libs.androidx.activity.compose)
  // implementation(libs.androidx.camera.camera2)
  // implementation(libs.androidx.camera.core)
  // implementation(libs.androidx.camera.lifecycle)
  // implementation(libs.androidx.camera.view)
  implementation(libs.androidx.compose.material.icons.core)
  implementation(libs.androidx.compose.material.icons.extended)
  implementation(libs.androidx.compose.material3)
  implementation(libs.androidx.compose.ui)
  implementation(libs.androidx.compose.ui.graphics)
  implementation(libs.androidx.compose.ui.tooling.preview)
  implementation(libs.androidx.core.ktx)
  // implementation(libs.androidx.datastore.preferences)
  implementation(libs.androidx.lifecycle.runtime.compose)
  implementation(libs.androidx.lifecycle.runtime.ktx)
  implementation(libs.androidx.lifecycle.viewmodel.compose)
  // implementation(libs.androidx.navigation.compose)
  implementation(libs.androidx.room.ktx)
  implementation(libs.androidx.room.runtime)
  // implementation(libs.coil.compose)
  implementation(libs.converter.moshi)
  implementation(libs.firebase.ai)
  // Uncomment to use Firestore:
  // implementation(libs.firebase.firestore)

  // Uncomment ALL FOUR of the following dependencies together to use Firebase Auth and Google
  // Sign-In via Credential Manager:
  // implementation(libs.firebase.auth)
  // implementation(libs.androidx.credentials)
  // implementation(libs.androidx.credentials.play.services)
  // implementation(libs.googleid)
  implementation(libs.firebase.appcheck.recaptcha)
  implementation(libs.kotlinx.coroutines.android)
  implementation(libs.kotlinx.coroutines.core)
  implementation(libs.logging.interceptor)
  implementation(libs.moshi.kotlin)
  implementation(libs.okhttp)
  // implementation(libs.play.services.location)
  implementation(libs.retrofit)
  testImplementation(libs.androidx.compose.ui.test.junit4)
  testImplementation(libs.androidx.core)
  testImplementation(libs.androidx.junit)
  testImplementation(libs.junit)
  testImplementation(libs.kotlinx.coroutines.test)
  testImplementation(libs.robolectric)
  testImplementation(libs.roborazzi)
  testImplementation(libs.roborazzi.compose)
  testImplementation(libs.roborazzi.junit.rule)
  androidTestImplementation(platform(libs.androidx.compose.bom))
  androidTestImplementation(libs.androidx.compose.ui.test.junit4)
  androidTestImplementation(libs.androidx.espresso.core)
  androidTestImplementation(libs.androidx.junit)
  androidTestImplementation(libs.androidx.runner)
  debugImplementation(libs.androidx.compose.ui.test.manifest)
  debugImplementation(libs.androidx.compose.ui.tooling)
  "ksp"(libs.androidx.room.compiler)
  "ksp"(libs.moshi.kotlin.codegen)
}

tasks.register<Copy>("copyWebAssets") {
    // The F:\math directory is one level above the rootProject.projectDir (which is f:\math\math-hero)
    val srcDir = file(rootProject.projectDir.parentFile)
    val destDir = file("src/main/assets/math")
    
    doFirst {
        destDir.deleteRecursively()
    }
    
    from(srcDir) {
        include("index.html")
        include("src/**")
        include("scripts/**")
    }
    
    from(file("${srcDir}/public")) {
        exclude("assets/**")
    }
    
    from(file("${rootProject.projectDir}/downscaled_assets")) {
        into("assets")
    }
    
    into(destDir)
    
    val assetManagerFile = layout.projectDirectory.file("src/main/assets/math/src/assets/assetManager.js").asFile
    val indexHtmlFile = layout.projectDirectory.file("src/main/assets/math/index.html").asFile
    
    doLast {
        if (assetManagerFile.exists()) {
            var content = assetManagerFile.readText()
            
            // Apply patch_assetmanager.js logic
            content = content.replace(
                "this._ready = false;\n  }",
                "this._ready = false;\n    // Fallback 1x1 transparent image\n    this.fallbackImage = new Image();\n    this.fallbackImage.src = \"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=\";\n  }"
            )
            content = content.replace(
                "get(key) {\n    return this.cache.get(key) || null;\n  }",
                "get(key) {\n    return this.cache.get(key) || this.fallbackImage;\n  }"
            )
            
            // Apply patch_assetmanager2.js logic (Kotlin's replace changes all occurrences by default)
            content = content.replace("return key ? this.get(key) : null;", "return key ? this.get(key) : this.fallbackImage;")
            content = content.replace("if (!key) return null;", "if (!key) return this.fallbackImage;")
            
            // Fix WebView CORS issue by removing crossOrigin requirement for local assets
            content = content.replace("img.crossOrigin = 'anonymous';", "// img.crossOrigin removed for Android WebView")
            
            assetManagerFile.writeText(content)
            println("AssetManager patched successfully!")
        }
        
        if (indexHtmlFile.exists()) {
            var html = indexHtmlFile.readText()
            val errorScript = """
            <script>
            window.onerror = function(msg, url, line, col, error) {
                var d = document.createElement("div");
                d.style.cssText = "position:absolute;z-index:99999;background:#8b0000;color:white;padding:20px;top:0;left:0;right:0;bottom:0;font-size:16px;overflow:auto;";
                d.innerHTML = "<b>CRASH DETECTED:</b><br><br>" + msg + "<br><br><b>File:</b> " + url + ":" + line + ":" + col + "<br><br><b>Stack:</b> " + (error ? error.stack : "");
                document.body.appendChild(d);
            };
            window.addEventListener("unhandledrejection", function(e) {
                var d = document.createElement("div");
                d.style.cssText = "position:absolute;z-index:99999;background:#8b0000;color:white;padding:20px;top:0;left:0;right:0;bottom:0;font-size:16px;overflow:auto;";
                d.innerHTML = "<b>PROMISE CRASH:</b><br><br>" + (e.reason && e.reason.stack ? e.reason.stack : e.reason);
                document.body.appendChild(d);
            });
            </script>
            """.trimIndent()
            
            if (!html.contains("window.onerror = function(msg")) {
                html = html.replace("<head>", "<head>\n" + errorScript)
                indexHtmlFile.writeText(html)
                println("Error reporter injected into index.html!")
            }
        }
    }
}

tasks.named("preBuild") {
    dependsOn("copyWebAssets")
}
