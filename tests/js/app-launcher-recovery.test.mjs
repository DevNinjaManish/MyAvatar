import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const appSource=readFileSync(new URL('../../scripts/make-app.mjs',import.meta.url),'utf8');
const launcher=readFileSync(new URL('../../scripts/launch-macos.zsh',import.meta.url),'utf8');

test('generated app delegates to the live launcher script',()=>{
  assert.match(appSource,/exec \/bin\/zsh \"\$ROOT\/scripts\/launch-macos\.zsh\"/);
  assert.doesNotMatch(appSource,/SERVICES_HEALTHY=true/);
});

test('macOS launcher health-checks both backend and renderer services',()=>{
  assert.match(launcher,/127\.0\.0\.1:8765\/health/);
  assert.match(launcher,/127\.0\.0\.1:5173\//);
  assert.match(launcher,/SERVICES_HEALTHY=true/);
});

test('healthy existing Electron instance is actively surfaced',()=>{
  assert.match(launcher,/nohup \"\$ELECTRON_BIN\" \"\$ROOT\"/);
});

test('stale Electron and launcher processes escalate from TERM to KILL',()=>{
  assert.match(launcher,/pkill -TERM -f \"\$ELECTRON_PROCESS\"/);
  assert.match(launcher,/pkill -TERM -f \"\$START_PROCESS\"/);
  assert.match(launcher,/pkill -KILL -f \"\$ELECTRON_PROCESS\"/);
  assert.match(launcher,/pkill -KILL -f \"\$START_PROCESS\"/);
});

test('missing local prerequisites surface a visible macOS error instead of hanging',()=>{
  assert.match(launcher,/display alert \\"MyAvatar could not start\\"/);
  assert.match(launcher,/\.venv\/bin\/python/);
  assert.match(launcher,/node_modules\/electron/);
});
