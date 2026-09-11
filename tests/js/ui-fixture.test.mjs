import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

const canonical=['compact','chat','rivet','chat-rivet','menu','picker','running','approval','complete','offline','limited'];

test('fixture mode is explicitly query gated and isolated from live runtime startup',()=>{
  const entry=read('../../src/app/entry.js');
  const gate=entry.indexOf("has('fixture')");
  const fixture=entry.indexOf("import('./ui-fixture.js')");
  const runtime=entry.indexOf("import('./widget-runtime.js')");
  assert.ok(gate>=0&&fixture>gate&&runtime>fixture);
  assert.match(entry,/if\(fixtureMode\)[\s\S]*mountUiFixture/);
  assert.match(entry,/else\{[\s\S]*installSocketBridge/);
});

test('fixture module owns the canonical visual states and readiness marker',()=>{
  const code=read('../../src/app/ui-fixture.js');
  for(const state of canonical)assert.ok(code.includes(`'${state}'`),`missing fixture ${state}`);
  assert.match(code,/dataset\.fixtureReady='true'/);
  assert.match(code,/myavatar:agent-task/);
  assert.match(code,/myavatar:readiness/);
  assert.match(code,/myavatar:socket-close/);
});

test('capture runner waits for fixture readiness and writes local PNG artifacts',()=>{
  const code=read('../../scripts/capture-ui.cjs');
  assert.match(code,/data-fixture-ready/);
  assert.match(code,/capturePage\(\)/);
  assert.match(code,/artifacts','ui-regression/);
  assert.match(code,/toPNG\(\)/);
  const pkg=JSON.parse(read('../../package.json'));
  assert.equal(pkg.scripts['test:ui:screenshots'],'npm run build && electron scripts/capture-ui.cjs');
});

test('fixture captures are deterministic and remain untracked',()=>{
  const css=read('../../src/styles/ui-fixture.css');
  const ignore=read('../../.gitignore');
  assert.match(css,/animation:none!important;transition:none!important/);
  assert.match(css,/caret-color:transparent!important/);
  assert.match(css,/data-rail-cpu.*18%/s);
  assert.match(css,/data-rail-memory.*42%/s);
  assert.match(ignore,/artifacts\/ui-regression\//);
});
