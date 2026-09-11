import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=()=>readFileSync(new URL('../../src/styles/widget-components.css',import.meta.url),'utf8');

test('More menu keeps controls compact and stateful',()=>{
  const source=css();
  assert.match(source,/#widget-menu>button\{[^}]*min-height:34px[^}]*font-size:var\(--ds-text-sm\)/);
  assert.match(source,/#widget-menu>button:hover:not\(:disabled\)\{background:var\(--ds-surface-hover\)\}/);
  assert.match(source,/#widget-menu>button\[aria-expanded=true\]/);
  assert.match(source,/\.menu-control-row\{[^}]*grid-template-columns:minmax\(0,1fr\) auto/);
});

test('companion picker gives selected robot a compact truthful active marker',()=>{
  const source=css();
  assert.match(source,/\.bot-card\{[^}]*grid-template-columns:25px minmax\(0,1fr\) auto/);
  assert.match(source,/\.bot-card\[aria-pressed=true\]::after\{content:'ACTIVE'/);
  assert.match(source,/color:var\(--bot-card-accent,#a5e2ce\)/);
  assert.match(source,/\.bot-card:hover:not\(:disabled\)/);
});

test('picker descriptions can use the available row width without changing shell geometry',()=>{
  const source=css();
  assert.match(source,/\.bot-card small\{[^}]*max-width:none/);
  assert.doesNotMatch(source,/#bot-library\{[^}]*position:fixed/);
  assert.doesNotMatch(source,/#bot-library\{[^}]*width:\s*\d+px/);
});

test('menu and picker respect reduced motion',()=>{
  const source=css();
  assert.match(source,/@media \(prefers-reduced-motion:reduce\)[\s\S]*#widget-menu>button[\s\S]*\.bot-card/);
});
