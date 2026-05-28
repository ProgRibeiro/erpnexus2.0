# Android SDK Setup Script for Windows

Write-Host "================================" -ForegroundColor Cyan
Write-Host "ERP Nexus - Android Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Define paths
$ANDROID_SDK_ROOT = "C:\Android\sdk"
$ANDROID_SDK_URL = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
$TEMP_DIR = "$env:TEMP\android_setup"

# Create Android SDK directory
if (-not (Test-Path $ANDROID_SDK_ROOT)) {
    Write-Host "Creating Android SDK directory: $ANDROID_SDK_ROOT" -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $ANDROID_SDK_ROOT | Out-Null
}

# Download Command Line Tools
Write-Host "Downloading Android Command Line Tools..." -ForegroundColor Yellow
if (-not (Test-Path $TEMP_DIR)) {
    New-Item -ItemType Directory -Force -Path $TEMP_DIR | Out-Null
}

$ZIP_FILE = "$TEMP_DIR\cmdline-tools.zip"

if (-not (Test-Path $ZIP_FILE)) {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $ANDROID_SDK_URL -OutFile $ZIP_FILE
    Write-Host "Download complete" -ForegroundColor Green
} else {
    Write-Host "SDK tools already downloaded, skipping download" -ForegroundColor Green
}

# Extract
Write-Host "Extracting Android SDK tools..." -ForegroundColor Yellow
Expand-Archive -Path $ZIP_FILE -DestinationPath "$TEMP_DIR\extracted" -Force
Move-Item -Path "$TEMP_DIR\extracted\cmdline-tools\*" -Destination "$ANDROID_SDK_ROOT\cmdline-tools\latest" -Force

# Set environment variables
Write-Host "Setting environment variables..." -ForegroundColor Yellow
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $ANDROID_SDK_ROOT, "User")
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $ANDROID_SDK_ROOT, "User")
[Environment]::SetEnvironmentVariable("PATH", "$env:PATH;$ANDROID_SDK_ROOT\cmdline-tools\latest\bin;$ANDROID_SDK_ROOT\platform-tools", "User")

# Refresh PATH in current session
$env:ANDROID_HOME = $ANDROID_SDK_ROOT
$env:PATH = "$env:PATH;$ANDROID_SDK_ROOT\cmdline-tools\latest\bin;$ANDROID_SDK_ROOT\platform-tools"

Write-Host "ANDROID_HOME set to: $env:ANDROID_HOME" -ForegroundColor Green

# Install Android SDK components
Write-Host "Installing Android SDK components..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Cyan

$sdkmanager = "$ANDROID_SDK_ROOT\cmdline-tools\latest\bin\sdkmanager.bat"

# Accept licenses
Write-Host "Accepting Android licenses..." -ForegroundColor Yellow
echo "y" | & $sdkmanager --licenses 2>&1 | Out-Null

# Install SDKs and tools
$components = @(
    "platforms;android-35",
    "platforms;android-34",
    "build-tools;35.0.0",
    "build-tools;34.0.0",
    "platform-tools",
    "tools",
    "emulator",
    "system-images;android-35;google_apis;x86_64",
    "system-images;android-34;google_apis;x86_64"
)

foreach ($component in $components) {
    Write-Host "Installing: $component" -ForegroundColor Cyan
    & $sdkmanager $component 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $component installed" -ForegroundColor Green
    }
}

# Create Android Virtual Device (AVD)
Write-Host "Creating Android Virtual Device..." -ForegroundColor Yellow
$avdmanager = "$ANDROID_SDK_ROOT\cmdline-tools\latest\bin\avdmanager.bat"

# Clean old AVD if exists
& $avdmanager delete avd -n "NexusERP" 2>&1 | Out-Null

# Create new AVD
& $avdmanager create avd -n "NexusERP" -k "system-images;android-34;google_apis;x86_64" --force 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Android Virtual Device 'NexusERP' created" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to create AVD" -ForegroundColor Red
}

# Cleanup
Remove-Item -Recurse -Force $TEMP_DIR -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "Android Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your terminal/PowerShell" -ForegroundColor White
Write-Host "2. Run: npm run mobile:run:android" -ForegroundColor White
Write-Host ""
Write-Host "To manually start emulator:" -ForegroundColor Cyan
Write-Host "$env:ANDROID_HOME\emulator\emulator.exe -avd NexusERP" -ForegroundColor White
