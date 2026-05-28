# 📱 ERP Nexus - Android & iOS Setup Guide

## ✅ Completed Setup Steps

✓ Android build configured  
✓ Capacitor synchronized with Android  
✓ iOS project structure created (but requires macOS)  
✓ Mobile assets built and optimized  

---

## 🤖 Android Setup (Windows)

### Option 1: Using Android Studio (Recommended)

1. **Download Android Studio**
   - Go to [developer.android.com/studio](https://developer.android.com/studio)
   - Download and install Android Studio

2. **First Run Setup**
   - Android Studio will prompt to install SDK components
   - Install SDK API 34+ and create virtual device

3. **Create Virtual Device (AVD)**
   - Open Android Studio → Device Manager
   - Click "Create Device"
   - Select: **Pixel 6 Pro** or similar
   - Select: **Android API 34** or higher
   - Click "Finish"

4. **Start Your Virtual Device**
   - In Device Manager, click the Play button next to your device
   - Wait for emulator to fully boot (~2-5 minutes)

5. **Build and Run App**
   ```bash
   cd erp_frontend
   npm run mobile:run:android
   ```
   This will:
   - Build the mobile assets
   - Sync with Capacitor
   - Compile Android APK
   - Deploy to running emulator

### Option 2: Manual Android SDK Setup (Advanced)

If you prefer command-line setup:

```bash
# Download and extract Android SDK
# Set ANDROID_HOME environment variable
$env:ANDROID_HOME = "C:\Android\sdk"

# Use sdkmanager to install components
$sdkmanager --install "platforms;android-35" "build-tools;35.0.0" "emulator"

# Create AVD
$avdmanager create avd -n "NexusERP" -k "system-images;android-34;google_apis;x86_64"

# Start emulator
$emulator -avd NexusERP
```

---

## 🍎 iOS Setup (macOS Only)

### Prerequisites
- **Must have a Mac** (iOS development cannot be done on Windows)
- Xcode 14+ installed
- CocoaPods installed

### Steps (on macOS)

```bash
# Install dependencies
npm install -g @capacitor/cli

# Open iOS project in Xcode
npx cap open ios

# Build and run in simulator
npm run mobile:run:ios
```

### On Windows?
If you need to test iOS without a Mac, consider:
- **AWS Device Farm** - Cloud-based iOS testing
- **BrowserStack** - Remote device testing
- **Hiring remote Mac** from MacStadium or similar
- **Future: Boot Camp or Virtual Mac** (complex setup)

---

## 🚀 Running Commands

### Web Development Server (already running)
```bash
# Frontend on http://localhost:5173
npm run dev

# Backend on http://localhost:8000
cd ../erp_backend
python manage.py runserver
```

### Mobile Android

```bash
# Build mobile app
npm run mobile:build

# Sync with Android project
npm run mobile:sync

# Open Android Studio to edit code
npm run mobile:open:android

# Build and deploy to emulator (full cycle)
npm run mobile:run:android
```

### Mobile iOS (macOS only)

```bash
# Build mobile app
npm run mobile:build

# Sync with iOS project
npm run mobile:sync

# Open Xcode to edit code
npm run mobile:open:ios

# Build and deploy to simulator
npm run mobile:run:ios
```

---

## 📋 Troubleshooting

### Emulator won't start
```bash
# Check if emulator exists
$env:ANDROID_HOME\emulator\emulator.exe -list-avds

# If empty, create one:
$avdmanager create avd -n "NexusERP" -k "system-images;android-34;google_apis;x86_64"

# Force hardware acceleration (if available)
$emulator -avd NexusERP -feature GLESDynamicVersion,Vulkan
```

### Build errors
```bash
# Clean gradle cache
cd erp_frontend/android
./gradlew clean

# Rebuild
npm run mobile:run:android
```

### Port conflicts
```bash
# Check ports in use
netstat -ano | findstr :8000
netstat -ano | findstr :5173

# Kill process by PID (if needed)
taskkill /PID <PID> /F
```

### Dependencies not syncing
```bash
# Clear node modules and reinstall
rm -r node_modules
npm install --legacy-peer-deps

# Rebuild and sync
npm run mobile:build
npm run mobile:sync
```

---

## 🎯 Project Structure

```
erp_frontend/
├── src/                    # React source
├── android/               # Android native code (created by Capacitor)
├── ios/                   # iOS native code (created by Capacitor)
├── frontend_dist/         # Web build output
├── frontend_dist_mobile/  # Mobile build output
├── capacitor.config.ts    # Capacitor configuration
└── package.json           # Dependencies and scripts

erp_backend/
├── manage.py              # Django management
├── apps/                  # Django apps
├── config/                # Django settings
└── requirements.txt       # Python dependencies
```

---

## 📞 System Requirements

| Platform | Requirements | Status |
|----------|-------------|--------|
| **Web** | Node.js 18+, Python 3.8+ | ✅ Ready |
| **Android** | Windows/Mac/Linux, Android Studio or SDK | ✅ Configured |
| **iOS** | macOS 12+, Xcode 14+ | ⚠️ Requires Mac |

---

## 🔄 Development Workflow

### Edit & Test Cycle

```bash
# Terminal 1: Backend
cd erp_backend
python manage.py runserver

# Terminal 2: Frontend Dev Server
cd erp_frontend
npm run dev

# Terminal 3: Android (if needed)
cd erp_frontend
npm run mobile:build
npm run mobile:sync
# Then in Android Studio, run emulator → Click Run

# Or start emulator first
$emulator -avd NexusERP
# Then deploy
npm run mobile:run:android
```

---

## 📱 Testing on Device

### Real Android Phone

```bash
# Enable USB Debugging on phone:
# Settings → Developer Options → USB Debugging → Enable

# Connect phone via USB
# Check connected devices:
adb devices

# Deploy app
npm run mobile:build
npm run mobile:sync
npm run mobile:run:android  # Will deploy to connected device if available
```

### Real iOS iPhone

Requires:
- Apple Developer Account ($99/year)
- Mac with Xcode
- Physical iPhone or simulator on Mac

```bash
# On Mac:
npm run mobile:run:ios
```

---

## 🛠️ Next Steps

1. ✅ Backend running: http://localhost:8000
2. ✅ Frontend running: http://localhost:5173
3. 📦 **Install Android Studio** (if testing on Android)
4. 🔧 **Create Android Virtual Device** in Android Studio
5. 🚀 **Run app on emulator**: `npm run mobile:run:android`

---

## 📚 Documentation

- [Capacitor Docs](https://capacitorjs.com)
- [Android Studio Guide](https://developer.android.com/studio/intro)
- [Xcode Guide](https://developer.apple.com/xcode/)
- [React Native vs Capacitor](https://capacitorjs.com/docs)

---

**Status**: ✅ Ready for Android testing on Windows  
**Last Updated**: 2026-05-28  
**Next Phase**: iOS setup requires macOS
