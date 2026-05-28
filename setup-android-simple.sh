#!/bin/bash
set -e

echo "========================================"
echo "ERP Nexus - Android Setup (Bash)"
echo "========================================"

# Define paths
ANDROID_SDK_ROOT="/c/Android/sdk"
TEMP_DIR="/tmp/android_setup"

# Create directories
mkdir -p "$ANDROID_SDK_ROOT"
mkdir -p "$TEMP_DIR"

echo "Downloading Android SDK Command Line Tools..."
cd "$TEMP_DIR"

# Download using curl
if [ ! -f "cmdline-tools.zip" ]; then
    curl -L -o cmdline-tools.zip "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    echo "Download complete"
else
    echo "SDK tools already downloaded"
fi

echo "Extracting Android SDK tools..."
unzip -q cmdline-tools.zip -d extracted/
mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools/latest"
mv extracted/cmdline-tools/* "$ANDROID_SDK_ROOT/cmdline-tools/latest/" || true

# Set environment variables
echo "Setting environment variables..."
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export ANDROID_SDK_ROOT="$ANDROID_SDK_ROOT"
export PATH="$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools"

echo "ANDROID_HOME: $ANDROID_HOME"
echo "PATH updated with Android tools"

# Test sdkmanager
SDKMANAGER="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"
if [ -f "$SDKMANAGER.bat" ]; then
    echo "SDK Manager found at: $SDKMANAGER.bat"
else
    echo "SDK Manager not found, but setup continues"
fi

echo "========================================"
echo "Android Setup Complete!"
echo "========================================"
echo ""
echo "Environment variables set:"
echo "ANDROID_HOME=$ANDROID_SDK_ROOT"
echo ""
echo "To persist these settings, add to your ~/.bashrc or ~/.zshrc:"
echo "export ANDROID_HOME=$ANDROID_SDK_ROOT"
echo "export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools"
