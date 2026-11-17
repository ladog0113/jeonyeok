#!/bin/bash
# 전역까지 앱 설치: curl -fsSL https://raw.githubusercontent.com/ladog0113/jeonyeok/main/install.sh | bash
set -e
APP="$HOME/Applications/Jeonyeok.app"
TMP="$(mktemp -d)"
echo "전역까지 최신 버전을 받는 중..."
curl -fL --progress-bar -o "$TMP/jy.zip" https://github.com/ladog0113/jeonyeok/releases/latest/download/Jeonyeok-mac.zip
pkill -f "Jeonyeok.app/Contents/MacOS" 2>/dev/null || true
sleep 1
mkdir -p "$HOME/Applications"
rm -rf "$APP"
ditto -xk "$TMP/jy.zip" "$TMP/x"
mv "$TMP/x/Jeonyeok.app" "$APP"
xattr -cr "$APP"
codesign -f --deep -s - "$APP" 2>/dev/null
rm -rf "$TMP"
open "$APP"
echo "설치 완료: $APP"
