#!/bin/zsh
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$HOME/Library/Logs/MyAvatar-launcher.log"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
mkdir -p "$HOME/Library/Logs"

log(){ print -r -- "[$(/bin/date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }
fail(){
  log "ERROR: $*"
  /usr/bin/osascript -e "display alert \"MyAvatar could not start\" message \"$*\" as critical" >/dev/null 2>&1 || true
  exit 1
}

log "Launch requested from $ROOT"
[[ -f "$ROOT/package.json" ]] || fail "MyAvatar project files were not found. Move MyAvatar.app back inside the repository folder and try again."
[[ -x "$ROOT/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" ]] || fail "Electron is not installed. Run npm install in the MyAvatar repository, then launch again."
[[ -x "$ROOT/.venv/bin/python" ]] || fail "Python environment is missing. Run the setup commands from README, then launch again."
command -v npm >/dev/null 2>&1 || fail "npm is not available in PATH. Install Node.js, then launch again."

START_PROCESS='[n]ode scripts/start\.mjs'
ELECTRON_BIN="$ROOT/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
ELECTRON_PROCESS="$ROOT/node_modules/electron/dist/[E]lectron.app/Contents/MacOS/Electron $ROOT"
SERVICES_HEALTHY=false
if pgrep -f "$START_PROCESS" >/dev/null && \
   /usr/bin/curl -fsS --max-time 1 http://127.0.0.1:8765/health >/dev/null 2>&1 && \
   /usr/bin/curl -fsS --max-time 1 http://127.0.0.1:5173/ >/dev/null 2>&1; then
  SERVICES_HEALTHY=true
fi

if pgrep -f "$ELECTRON_PROCESS" >/dev/null && [[ "$SERVICES_HEALTHY" == true ]]; then
  log "Healthy runtime already active; surfacing existing companion."
  nohup "$ELECTRON_BIN" "$ROOT" >> "$LOG" 2>&1 &
  exit 0
fi

if pgrep -f "$ELECTRON_PROCESS" >/dev/null; then
  log "Stopping stale Electron process."
  pkill -TERM -f "$ELECTRON_PROCESS" || true
fi
if pgrep -f "$START_PROCESS" >/dev/null; then
  log "Stopping stale launcher/service supervisor."
  pkill -TERM -f "$START_PROCESS" || true
fi

for _ in {1..30}; do
  if ! pgrep -f "$START_PROCESS" >/dev/null && ! pgrep -f "$ELECTRON_PROCESS" >/dev/null; then
    break
  fi
  sleep 0.1
done

if pgrep -f "$ELECTRON_PROCESS" >/dev/null; then
  log "Electron ignored SIGTERM; forcing stale process shutdown."
  pkill -KILL -f "$ELECTRON_PROCESS" || true
fi
if pgrep -f "$START_PROCESS" >/dev/null; then
  log "Launcher ignored SIGTERM; forcing stale process shutdown."
  pkill -KILL -f "$START_PROCESS" || true
fi

cd "$ROOT" || fail "Could not enter the MyAvatar repository folder."
log "Starting local runtime supervisor."
nohup /usr/bin/env npm start >> "$LOG" 2>&1 &
