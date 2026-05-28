# ============================================
# Android Studio & Emulator Auto-Installer
# For Windows 11
# ============================================

param(
    [switch]$SkipStudio = $false
)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "ERP Nexus - Android Auto-Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Detect existing installations
$androidStudioPath = "C:\Program Files\Android\Android Studio"
$androidHomeDefault = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"

# Check if Android Studio already exists
if (Test-Path $androidStudioPath) {
    Write-Host "✓ Android Studio already installed at: $androidStudioPath" -ForegroundColor Green
} else {
    if (-not $SkipStudio) {
        Write-Host "📥 Downloading Android Studio..." -ForegroundColor Yellow
        $studioUrl = "https://redirector.gvt1.com/edgedl/android/studio/install/2024.1.1/android-studio-2024.1.1-windows.exe"
        $studioInstaller = "$env:TEMP\android-studio-installer.exe"

        try {
            $ProgressPreference = 'SilentlyContinue'
            Write-Host "   Downloading (this may take 5-10 minutes)..." -ForegroundColor Cyan
            Invoke-WebRequest -Uri $studioUrl -OutFile $studioInstaller -TimeoutSec 300

            Write-Host "   Download complete. Installing..." -ForegroundColor Green
            & $studioInstaller /S /D=$androidStudioPath

            Write-Host "   Waiting for installation to complete..." -ForegroundColor Cyan
            Start-Sleep -Seconds 30

            if (Test-Path $androidStudioPath) {
                Write-Host "✓ Android Studio installed successfully" -ForegroundColor Green
            } else {
                Write-Host "⚠ Android Studio installation may still be in progress" -ForegroundColor Yellow
                Write-Host "   Please wait a few minutes and check: $androidStudioPath" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "✗ Failed to download Android Studio" -ForegroundColor Red
            Write-Host "   Error: $_" -ForegroundColor Red
            Write-Host "   Please install manually from: https://developer.android.com/studio" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "📦 Setting up Android SDK..." -ForegroundColor Cyan

# Set ANDROID_HOME
$ANDROID_HOME = $androidHomeDefault
if (-not (Test-Path $ANDROID_HOME)) {
    New-Item -ItemType Directory -Force -Path $ANDROID_HOME | Out-Null
}

# Set environment variables
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $ANDROID_HOME, "User")
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $ANDROID_HOME, "User")

# Update PATH for current session
$env:ANDROID_HOME = $ANDROID_HOME
$env:ANDROID_SDK_ROOT = $ANDROID_HOME
$env:PATH = "$env:PATH;$ANDROID_HOME\cmdline-tools\latest\bin;$ANDROID_HOME\platform-tools;$ANDROID_HOME\emulator"

Write-Host "✓ ANDROID_HOME: $ANDROID_HOME" -ForegroundColor Green

Write-Host ""
Write-Host "⏳ Initializing Android SDK (may take a few minutes)..." -ForegroundColor Cyan

# Create marker file to indicate setup completed
$setupMarker = "$ANDROID_HOME\.setup-complete"
if (-not (Test-Path $setupMarker)) {
    Write-Host "   Downloading essential components..." -ForegroundColor Yellow

    try {
        # Wait for Android Studio to finish initialization
        Write-Host "   Waiting for Android Studio to initialize SDK location..." -ForegroundColor Cyan
        Start-Sleep -Seconds 60

        # Check if SDK Manager exists and run it
        $sdkManager = "$ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat"

        if (Test-Path $sdkManager) {
            Write-Host "   SDK Manager found, installing components..." -ForegroundColor Green

            # Accept licenses
            & cmd /c "echo y | $sdkManager --licenses" 2>&1 | Out-Null

            # Install essential components
            $components = @(
                "platforms;android-35",
                "platforms;android-34",
                "build-tools;35.0.0",
                "platform-tools",
                "tools",
                "emulator",
                "system-images;android-34;google_apis;x86_64"
            )

            foreach ($component in $components) {
                Write-Host "   Installing: $component" -ForegroundColor Cyan
                & $sdkManager $component 2>&1 | Out-Null
            }
        } else {
            Write-Host "   ℹ SDK Manager will be available after Android Studio first run" -ForegroundColor Yellow
        }

        New-Item -Path $setupMarker -ItemType File -Force | Out-Null
    } catch {
        Write-Host "   ⚠ Could not auto-install components: $_" -ForegroundColor Yellow
        Write-Host "   Android Studio will guide you on first launch" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "📱 Creating Android Emulator..." -ForegroundColor Cyan

# Wait a bit more for SDK to settle
Start-Sleep -Seconds 10

$avdManager = "$ANDROID_HOME\cmdline-tools\latest\bin\avdmanager.bat"
$emulator = "$ANDROID_HOME\emulator\emulator.exe"

# Check if we can create AVD
if ((Test-Path $sdkManager) -or (Test-Path $avdManager)) {
    try {
        Write-Host "   Creating 'NexusERP' virtual device..." -ForegroundColor Cyan

        # Try with avdmanager first
        if (Test-Path $avdManager) {
            & $avdManager delete avd -n "NexusERP" 2>&1 | Out-Null
            & $avdManager create avd -n "NexusERP" -k "system-images;android-34;google_apis;x86_64" --force 2>&1 | Out-Null

            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Virtual device 'NexusERP' created successfully" -ForegroundColor Green
            }
        } else {
            Write-Host "   ℹ AVD Manager not available yet, will create after SDK setup" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ⚠ Could not create AVD: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠ SDK tools not yet available, they will be installed on first Android Studio launch" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✅ Android Setup Initialization Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Show instructions
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "$androidStudioPath\bin\studio.exe")) {
    Write-Host "1️⃣  LAUNCH ANDROID STUDIO" -ForegroundColor White
    Write-Host "   • Android Studio should open automatically" -ForegroundColor Gray
    Write-Host "   • Or manually run: $androidStudioPath\bin\studio.exe" -ForegroundColor Gray
    Write-Host "   • Complete the setup wizard" -ForegroundColor Gray
    Write-Host "   • Close Android Studio when done" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "2️⃣  BUILD & RUN ANDROID APP" -ForegroundColor White
Write-Host "   Run in PowerShell:" -ForegroundColor Gray
Write-Host "   cd 'C:\Users\$env:USERNAME\Documents\ERP NOVO EM PRODUÇÃO\erp_frontend'" -ForegroundColor Magenta
Write-Host "   npm run mobile:run:android" -ForegroundColor Magenta
Write-Host ""

Write-Host "   This will:" -ForegroundColor Gray
Write-Host "   • Build the mobile app" -ForegroundColor Gray
Write-Host "   • Sync with Capacitor" -ForegroundColor Gray
Write-Host "   • Compile Android APK" -ForegroundColor Gray
Write-Host "   • Launch emulator automatically" -ForegroundColor Gray
Write-Host "   • Deploy app to emulator" -ForegroundColor Gray
Write-Host ""

Write-Host "⏱️  First build will take 5-10 minutes. Subsequent builds are faster." -ForegroundColor Yellow
Write-Host ""

Write-Host "Environment Variables Set:" -ForegroundColor Cyan
Write-Host "   ANDROID_HOME=$ANDROID_HOME" -ForegroundColor Green
Write-Host "   ANDROID_SDK_ROOT=$ANDROID_HOME" -ForegroundColor Green
Write-Host ""

Write-Host "✨ Ready to build for mobile!" -ForegroundColor Green
