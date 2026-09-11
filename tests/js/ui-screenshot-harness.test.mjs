import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(`../../${path}`,import.meta.url),'utf8');

test('entry gates live runtime behind explicit fixture mode',()=>{
  const source=read('src/app/entry.js');
  assert.match(source,/new URLSearchParams\(window\.location\.search\)\.has\('fixture'\)/);
  assert.match(source,/if\(fixtureMode\)[\s\S]*mountUiFixture/);
  assert.match(source,/else\{[\s\S]*widget-runtime\.js/);
  assert.ok(source.indexOf("import '../styles/base.css'")<source.indexOf("import '../styles/design-tokens.css'"));
});

test('fixture defines the canonical screenshot state set without backend startup',()=>{
  const source=read('src/app/ui-fixture.js');
  for(const state of ['compact','chat','rivet','chat-rivet','menu','picker','running','approval','complete','offline','limited']){
    assert.match(source,new RegExp(`['\"]${state}['\"]`));
  }
  assert.doesNotMatch(source,/WebSocket|startLive|captureScreen|calendar-events/);
  assert.match(source,/assets\/bots\/rivet\/bust\.png/);
  assert.match(source,/fixtureReady/);
});

test('screenshot runner captures deterministic Electron fixtures to ignored artifacts',()=>{
  const runner=read('scripts/capture-ui.cjs');
  const pkg=JSON.parse(read('package.json'));
  const ignore=read('.gitignore');
  assert.match(runner,/width:640,height:820/);
  assert.match(runner,/capturePage\(\)/);
  assert.match(runner,/artifacts','ui-regression/);
  assert.equal(pkg.scripts['test:ui:screenshots'],'npm run build && electron scripts/capture-ui.cjs');
  assert.match(ignore,/artifacts\/ui-regression\//);
});

test('fixture CSS disables motion and waits for the ready marker',()=>{
  const css=read('src/styles/ui-fixture.css');
  assert.match(css,/animation:none!important/);
  assert.match(css,/transition:none!important/);
  assert.match(css,/data-fixture-ready='true'/);
});
