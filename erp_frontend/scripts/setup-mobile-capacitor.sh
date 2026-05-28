#!/usr/bin/env bash
# ============================================================
# ERP Nexus - Setup de App Mobile (Android + iOS) com Capacitor
# Reaproveita o frontend React (Vite) existente.
# ============================================================
set -euo pipefail

APP_NAME="ERP Nexus"
APP_ID="br.com.erpnexus.app"
WEB_DIR="../erp_backend/frontend_dist"

echo "==> 1/8 Verificando pre-requisitos..."
command -v node >/dev/null 2>&1 || { echo "ERRO: Node.js nao encontrado. Instale antes."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "ERRO: npm nao encontrado."; exit 1; }
echo "    Node: $(node -v) | npm: $(npm -v)"

echo "==> 2/8 Instalando Capacitor e plugins nativos..."
npm install \
  @capacitor/core \
  @capacitor/cli \
  @capacitor/android \
  @capacitor/ios \
  @capacitor/camera \
  @capacitor/geolocation \
  @capacitor/push-notifications \
  @capacitor/preferences \
  @capacitor/network \
  @capacitor/app \
  @capacitor/splash-screen \
  @capacitor/status-bar \
  --legacy-peer-deps

echo "==> 3/8 Garantindo capacitor.config.ts..."
if [ ! -f "capacitor.config.ts" ]; then
  npx cap init "$APP_NAME" "$APP_ID" --web-dir="$WEB_DIR"
else
  echo "    capacitor.config.ts ja existe."
fi

echo "==> 4/8 Buildando o frontend React..."
npm run build

echo "==> 5/8 Adicionando Android..."
[ ! -d "android" ] && npx cap add android || echo "    Android ja adicionado."

echo "==> 6/8 Adicionando iOS quando estiver em macOS..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  [ ! -d "ios" ] && npx cap add ios || echo "    iOS ja adicionado."
else
  echo "    iOS pulado: precisa de macOS com Xcode."
fi

echo "==> 7/8 Sincronizando codigo web -> nativo..."
npx cap sync

echo "==> 8/8 Pronto."
cat <<EOF

============================================================
SETUP CONCLUIDO
============================================================

ANDROID:
  npm run mobile:open:android
  npm run mobile:run:android

iOS:
  npm run mobile:open:ios
  npm run mobile:run:ios

LIVE RELOAD:
  1) Edite o bloco server em capacitor.config.ts
  2) Rode: npm run dev -- --host
  3) Rode: npm run mobile:run:android

Depois de mudancas no React:
  npm run mobile:sync

============================================================
EOF
