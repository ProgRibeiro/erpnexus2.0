# ============================================
# Android Studio Auto-Installer for Windows
# ============================================

Write-Host "================================" -ForegroundColor Cyan
Write-Host "ERP Nexus - Android Auto-Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Paths
$androidStudioPath = "C:\Program Files\Android\Android Studio"
$androidHomeDefault = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"

# Check Android Studio
if (Test-Path "$androidStudioPath\bin\studio.exe") {
    Write-Host "✓ Android Studio already installed" -ForegroundColor Green
} else {
    Write-Host "📥 Downloading Android Studio (~1.5 GB)..." -ForegroundColor Yellow
    Write-Host "   This will take 10-15 minutes depending on your internet speed" -ForegroundColor Cyan

    $studioUrl = "https://redirector.gvt1.com/edgedl/android/studio/install/2024.1.1/android-studio-2024.1.1-windows.exe"
    $studioInstaller = "$env:TEMP\android-studio-installer.exe"

    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $studioUrl -OutFile $studioInstaller -TimeoutSec 600

        Write-Host "   ✓ Download complete. Installing..." -ForegroundColor Green

        # Run installer silently
        Start-Process -FilePath $studioInstaller -ArgumentList "/S /D=$androidStudioPath" -Wait

        Write-Host "   ✓ Installation complete" -ForegroundColor Green
    } catch {
        Write-Host "✗ Installation failed: $_" -ForegroundColor Red
        Write-Host "   Please install manually from: https://developer.android.com/studio" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "🔧 Configuring Android SDK..." -ForegroundColor Cyan

# Set ANDROID_HOME
$ANDROID_HOME = $androidHomeDefault
New-Item -ItemType Directory -Force -Path $ANDROID_HOME | Out-Null

# Set permanent environment variables
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $ANDROID_HOME, "User")
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $ANDROID_HOME, "User")

# Set for current session
$env:ANDROID_HOME = $ANDROID_HOME
$env:ANDROID_SDK_ROOT = $ANDROID_HOME
$env:PATH = "$env:PATH;$ANDROID_HOME\cmdline-tools\latest\bin;$ANDROID_HOME\platform-tools;$ANDROID_HOME\emulator"

Write-Host "✓ ANDROID_HOME=$ANDROID_HOME" -ForegroundColor Green

Write-Host ""
Write-Host "📱 Setting up emulator..." -ForegroundColor Cyan

# List available AVDs
$avdListOutput = & cmd /c "$ANDROID_HOME\cmdline-tools\latest\bin\avdmanager.bat list avd 2>&1" | Select-String "Name:" | Out-String

if ($avdListOutput -match "NexusERP") {
    Write-Host "✓ Virtual device 'NexusERP' already exists" -ForegroundColor Green
} else {
    Write-Host "   Creating 'NexusERP' virtual device..." -ForegroundColor Yellow

    # Create new AVD
    & cmd /c "$ANDROID_HOME\cmdline-tools\latest\bin\avdmanager.bat create avd -n NexusERP -k `"system-images;android-34;google_apis;x86_64`" --force" 2>&1 | Out-Null

    Write-Host "   ✓ Virtual device created" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✅ Android Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 READY TO BUILD FOR MOBILE!" -ForegroundColor Green
Write-Host ""

Write-Host "Next step - Run from PowerShell:" -ForegroundColor Cyan
Write-Host ""
Write-Host "cd 'C:\Users\$env:USERNAME\Documents\ERP NOVO EM PRODUÇÃO\erp_frontend'" -ForegroundColor Magenta
Write-Host "npm run mobile:run:android" -ForegroundColor Magenta
Write-Host ""

Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Build the mobile app" -ForegroundColor Gray
Write-Host "  2. Sync with Android" -ForegroundColor Gray
Write-Host "  3. Compile APK" -ForegroundColor Gray
Write-Host "  4. Start emulator" -ForegroundColor Gray
Write-Host "  5. Deploy app" -ForegroundColor Gray
Write-Host ""

Write-Host "⏱️  First build: 5-10 minutes" -ForegroundColor Yellow
Write-Host "Subsequent builds: 2-3 minutes" -ForegroundColor Yellow
