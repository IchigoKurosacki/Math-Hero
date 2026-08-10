$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition

$AndroidSdkDir = Join-Path $ScriptDir ".android_sdk"
$GradleHomeDir = Join-Path $ScriptDir ".gradle_home"
$GradleVersion = "9.3.1"
$GradleInstallDir = Join-Path $ScriptDir "gradle-$GradleVersion"
$CmdLineToolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
$GradleUrl = "https://services.gradle.org/distributions/gradle-$GradleVersion-bin.zip"

# Create directories
if (-not (Test-Path $AndroidSdkDir)) { New-Item -ItemType Directory -Force -Path $AndroidSdkDir | Out-Null }
if (-not (Test-Path $GradleHomeDir)) { New-Item -ItemType Directory -Force -Path $GradleHomeDir | Out-Null }

$JdkDir = Join-Path $ScriptDir ".jdk"
$JdkUrl = "https://aka.ms/download-jdk/microsoft-jdk-17.0.12-windows-x64.zip"

if (-not (Test-Path $JdkDir)) {
    Write-Host "Downloading Microsoft OpenJDK 17..."
    New-Item -ItemType Directory -Force -Path $JdkDir | Out-Null
    $JdkZip = Join-Path $ScriptDir "jdk.zip"
    Invoke-WebRequest -Uri $JdkUrl -OutFile $JdkZip
    Write-Host "Extracting OpenJDK 17..."
    Expand-Archive -Path $JdkZip -DestinationPath $JdkDir -Force
    Remove-Item $JdkZip
}

$JavaExe = Get-ChildItem -Path $JdkDir -Filter "java.exe" -Recurse | Select-Object -First 1
if ($JavaExe) {
    $env:JAVA_HOME = $JavaExe.Directory.Parent.FullName
} else {
    Write-Host "Could not find java.exe in downloaded JDK" -ForegroundColor Red
    exit 1
}

# Download and extract Android Command Line Tools
$CmdLineToolsZip = Join-Path $ScriptDir "cmdline-tools.zip"
$CmdLineToolsLatestDir = Join-Path $AndroidSdkDir "cmdline-tools\latest"
if (-not (Test-Path (Join-Path $CmdLineToolsLatestDir "bin\sdkmanager.bat"))) {
    Write-Host "Downloading Android Command Line Tools..."
    Invoke-WebRequest -Uri $CmdLineToolsUrl -OutFile $CmdLineToolsZip
    Write-Host "Extracting Command Line Tools..."
    Expand-Archive -Path $CmdLineToolsZip -DestinationPath (Join-Path $AndroidSdkDir "cmdline-tools") -Force
    # Rename cmdline-tools to latest (required by newer sdkmanager)
    Rename-Item -Path (Join-Path $AndroidSdkDir "cmdline-tools\cmdline-tools") -NewName "latest"
    Remove-Item $CmdLineToolsZip
}

# Set env vars
$env:ANDROID_HOME = $AndroidSdkDir
$env:GRADLE_USER_HOME = $GradleHomeDir

# Accept licenses
Write-Host "Accepting Android SDK licenses..."
$SdkManager = Join-Path $CmdLineToolsLatestDir "bin\sdkmanager.bat"
$yes = "y`n" * 20
$yes | & $SdkManager --licenses | Out-Null

# Download and extract Gradle
$GradleZip = Join-Path $ScriptDir "gradle.zip"
if (-not (Test-Path (Join-Path $GradleInstallDir "bin\gradle.bat"))) {
    Write-Host "Downloading Gradle $GradleVersion..."
    Invoke-WebRequest -Uri $GradleUrl -OutFile $GradleZip
    Write-Host "Extracting Gradle..."
    Expand-Archive -Path $GradleZip -DestinationPath $ScriptDir -Force
    Remove-Item $GradleZip
}

$GradleBat = Join-Path $GradleInstallDir "bin\gradle.bat"

# Generate debug.keystore if it doesn't exist
$KeystoreFile = Join-Path $ScriptDir "debug.keystore"
if (-not (Test-Path $KeystoreFile)) {
    Write-Host "Generating debug.keystore..."
    $Keytool = Join-Path $env:JAVA_HOME "bin\keytool.exe"
    & $Keytool -genkey -v -keystore $KeystoreFile -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
}

# Build the project
Write-Host "Building the APK..."
Set-Location $ScriptDir
& $GradleBat assembleDebug

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful! APK is located at: app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Green
} else {
    Write-Host "Build failed." -ForegroundColor Red
}
