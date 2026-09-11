import {chmodSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const app=resolve(root,'MyAvatar.app');
const macos=resolve(app,'Contents/MacOS');
const resources=resolve(app,'Contents/Resources');
const iconset=resolve(root,'.myavatar-icon.iconset');
const run=(command,args)=>{const result=spawnSync(command,args,{stdio:'inherit'});if(result.status!==0)throw Error(`${command} failed`);};

rmSync(app,{recursive:true,force:true});mkdirSync(macos,{recursive:true});mkdirSync(resources,{recursive:true});
writeFileSync(resolve(app,'Contents/Info.plist'),`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>CFBundleDisplayName</key><string>MyAvatar</string><key>CFBundleExecutable</key><string>MyAvatar</string><key>CFBundleIdentifier</key><string>com.manishtk.myavatar</string><key>CFBundleIconFile</key><string>MyAvatar</string><key>CFBundleName</key><string>MyAvatar</string><key>CFBundlePackageType</key><string>APPL</string><key>LSMinimumSystemVersion</key><string>13.0</string></dict></plist>`);
writeFileSync(resolve(macos,'MyAvatar'),`#!/bin/zsh
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
LOG="$HOME/Library/Logs/MyAvatar-launcher.log"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
mkdir -p "$HOME/Library/Logs"
START_PROCESS='[n]ode scripts/start\\.mjs'
ELECTRON_BIN="$ROOT/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
ELECTRON_PROCESS="$ROOT/node_modules/electron/dist/[E]lectron.app/Contents/MacOS/Electron $ROOT"
SERVICES_HEALTHY=false
if pgrep -f "$START_PROCESS" >/dev/null && \
   /usr/bin/curl -fsS --max-time 1 http://127.0.0.1:8765/health >/dev/null 2>&1 && \
   /usr/bin/curl -fsS --max-time 1 http://127.0.0.1:5173/ >/dev/null 2>&1; then
  SERVICES_HEALTHY=true
fi
if pgrep -f "$ELECTRON_PROCESS" >/dev/null && [ "$SERVICES_HEALTHY" = true ]; then
  # Launching Electron again triggers the existing instance's second-instance
  # handler, which restores/focuses the companion instead of silently exiting.
  nohup "$ELECTRON_BIN" "$ROOT" >> "$LOG" 2>&1 &
  exit 0
fi
if pgrep -f "$ELECTRON_PROCESS" >/dev/null; then
  # Electron without a healthy local stack is stale. Tear it down so this
  # launch can rebuild a coherent backend + Vite + renderer session.
  pkill -TERM -f "$ELECTRON_PROCESS"
fi
if pgrep -f "$START_PROCESS" >/dev/null; then
  pkill -TERM -f "$START_PROCESS"
fi
for _ in {1..30}; do
  if ! pgrep -f "$START_PROCESS" >/dev/null && ! pgrep -f "$ELECTRON_PROCESS" >/dev/null; then
    break
  fi
  sleep 0.1
done
cd "$ROOT" || exit 1
nohup /usr/bin/env npm start >> "$LOG" 2>&1 &
`);
chmodSync(resolve(macos,'MyAvatar'),0o755);

rmSync(iconset,{recursive:true,force:true});mkdirSync(iconset);
const source=resolve(root,'public/assets/app-icon.png');
for(const [pixels,name] of [[16,'icon_16x16.png'],[32,'icon_16x16@2x.png'],[32,'icon_32x32.png'],[64,'icon_32x32@2x.png'],[128,'icon_128x128.png'],[256,'icon_128x128@2x.png'],[256,'icon_256x256.png'],[512,'icon_256x256@2x.png'],[512,'icon_512x512.png'],[1024,'icon_512x512@2x.png']])run('sips',['-z',String(pixels),String(pixels),source,'--out',resolve(iconset,name)]);
run('iconutil',['-c','icns',iconset,'-o',resolve(resources,'MyAvatar.icns')]);
rmSync(iconset,{recursive:true,force:true});console.log(`Created ${app}. Double-click it to launch MyAvatar. Startup errors are written to ~/Library/Logs/MyAvatar-launcher.log.`);
