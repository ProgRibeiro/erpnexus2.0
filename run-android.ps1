# ============================================
# Run ERP Nexus on Android Emulator
# ============================================

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ERP Nexus - Run on Android Emulator   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Set paths
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $projectRoot "erp_frontend"
$androidHome = [Environment]::GetEnvironmentVariable("ANDROID_HOME", "User")

if (-not $androidHome) {
    $androidHome = "$env:USERPROFILE\AppData\Local\Android\Sdk"
}

Write-Host "📍 Project Path: $projectRoot" -ForegroundColor Gray
Write-Host "📍 Android SDK: $androidHome" -ForegroundColor Gray
Write-Host ""

# Check if emulator exists
$emulator = "$androidHome\emulator\emulator.exe"
if (-not (Test-Path $emulator)) {
    Write-Host "⚠️  Android SDK not found at: $androidHome" -ForegroundColor Red
    Write-Host "   Please run: install-android-fixed.ps1" -ForegroundColor Yellow
    exit 1
}

# Check for running emulator
Write-Host "🔍 Checking for running emulator..." -ForegroundColor Cyan

$adb = "$androidHome\platform-tools\adb.exe"
$devices = & $adb devices 2>&1 | Select-String "emulator"

if ($devices) {
    Write-Host "✓ Emulator already running" -ForegroundColor Green
} else {
    Write-Host "📱 Starting emulator 'NexusERP'..." -ForegroundColor Yellow
    Write-Host "   (This may take 2-5 minutes)" -ForegroundColor Cyan

    # Start emulator in background
    Start-Process -FilePath $emulator -ArgumentList "-avd", "NexusERP", "-memory", "2048", "-no-snapshot-save" -WindowStyle Minimized

    Write-Host "   Waiting for emulator to boot..." -ForegroundColor Cyan

    # Wait for emulator to be ready
    $maxWait = 60
    $waited = 0
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 2
        $devices = & $adb devices 2>&1 | Select-String "emulator"
        if ($devices) {
            Write-Host "✓ Emulator ready" -ForegroundColor Green
            break
        }
        $waited += 2
        Write-Host "   Still waiting... ($waited/$maxWait seconds)" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "🏗️  Building mobile app..." -ForegroundColor Cyan

Set-Location $frontendDir

Write-Host "   Building assets..." -ForegroundColor Gray
npm run mobile:build

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "   ✓ Build complete" -ForegroundColor Green

Write-Host ""
Write-Host "🔄 Syncing with Capacitor..." -ForegroundColor Cyan

npx cap sync android

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Sync warning (may still work)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "⚙️  Compiling Android APK..." -ForegroundColor Cyan
Write-Host "   This may take 3-5 minutes on first build..." -ForegroundColor Gray

cd android
./gradlew.bat assembleDebug 2>&1 | Select-String -Pattern "BUILD SUCCESSFUL", "BUILD FAILED", "error"

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Gradle build failed" -ForegroundColor Red
    Write-Host "   Check the build output above for details" -ForegroundColor Yellow
    cd ..
    exit 1
}

Write-Host "   ✓ APK compiled" -ForegroundColor Green

Write-Host ""
Write-Host "📲 Deploying to emulator..." -ForegroundColor Cyan

$apk = "app\build\outputs\apk\debug\app-debug.apk"
& $adb install -r $apk

Write-Host "✓ App installed" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Launching app on emulator..." -ForegroundColor Cyan

$adb shell am start -n "io.ionic.starter/.MainActivity"

cd ..

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ App is Running!                    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   • App will appear in emulator in a few seconds" -ForegroundColor Gray
Write-Host "   • To reload app: npm run mobile:build && npx cap sync android" -ForegroundColor Gray
Write-Host "   • To view logs: adb logcat" -ForegroundColor Gray
Write-Host "   • Press Ctrl+C here to stop watching logs" -ForegroundColor Gray
Write-Host ""

# Show live logs
Write-Host "📋 Live logs (Ctrl+C to stop):" -ForegroundColor Cyan
& $adb logcat "ERP*:V" "*:S"
