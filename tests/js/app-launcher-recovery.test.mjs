import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../../scripts/make-app.mjs',import.meta.url),'utf8');

test('macOS launcher health-checks both backend and renderer services',()=>{
  assert.match(source,/127\.0\.0\.1:8765\/health/);
  assert.match(source,/127\.0\.0\.1:5173\//);
  assert.match(source,/SERVICES_HEALTHY=true/);
});

test('healthy existing Electron instance is actively surfaced',()=>{
  assert.match(source,/nohup \"\$ELECTRON_BIN\" \"\$ROOT\"/);
  assert.match(source,/second-instance/);
});

test('stale Electron and launcher processes are terminated before restart',()=>{
  assert.match(source,/pkill -TERM -f \"\$ELECTRON_PROCESS\"/);
  assert.match(source,/pkill -TERM -f \"\$START_PROCESS\"/);
  assert.match(source,/nohup \/usr\/bin\/env npm start/);
});
