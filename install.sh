#!/bin/bash
# 전역까지 앱 설치 (macOS, Linux): curl -fsSL https://raw.githubusercontent.com/ladog0113/jeonyeok/main/install.sh | bash
set -e
TMP="$(mktemp -d)"
echo "전역까지 최신 버전을 받는 중..."

if [ "$(uname)" = "Darwin" ]; then
  APP="$HOME/Applications/Jeonyeok.app"
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
  exit 0
fi

# Linux (x64)
DIR="$HOME/.local/share/jeonyeok"
curl -fL --progress-bar -o "$TMP/jy.zip" https://github.com/ladog0113/jeonyeok/releases/latest/download/Jeonyeok-linux.zip
pkill -f "$DIR/Jeonyeok" 2>/dev/null || true
sleep 1
rm -rf "$DIR"
mkdir -p "$(dirname "$DIR")"
if command -v unzip >/dev/null; then unzip -q "$TMP/jy.zip" -d "$TMP/x"; else python3 -m zipfile -e "$TMP/jy.zip" "$TMP/x"; fi
mv "$TMP/x/Jeonyeok" "$DIR"
find "$DIR" -maxdepth 1 -type f -exec chmod +x {} \;
rm -rf "$TMP"
mkdir -p "$HOME/.local/share/applications"
cat > "$HOME/.local/share/applications/jeonyeok.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=전역까지
Exec="$DIR/Jeonyeok" --no-sandbox
Icon=$DIR/resources/app/frames/icon/app.png
Terminal=false
Categories=Utility;
EOF
nohup "$DIR/Jeonyeok" --no-sandbox >/dev/null 2>&1 &
echo "설치 완료: $DIR"
