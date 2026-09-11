import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const base=readFileSync(new URL('../../src/styles/base.css',import.meta.url),'utf8');

test('global controls consume shared design tokens',()=>{
  assert.match(base,/button \{[^}]*var\(--ds-surface-subtle/s);
  assert.match(base,/border-radius:var\(--ds-radius-md/);
  assert.match(base,/transition:background var\(--ds-transition-fast/);
  assert.match(base,/input,select,textarea \{[^}]*var\(--ds-surface-inset/s);
});

test('global focus treatment covers textareas and uses the shared focus ring',()=>{
  assert.match(base,/textarea:focus-visible/);
  assert.match(base,/box-shadow:var\(--ds-focus-ring/);
});

test('disabled global controls use a non-interactive cursor',()=>{
  assert.match(base,/button:disabled \{[^}]*cursor:not-allowed/s);
  assert.match(base,/input:disabled,select:disabled,textarea:disabled \{[^}]*cursor:not-allowed/s);
});

test('dialog and onboarding surfaces consume design-system tokens',()=>{
  assert.match(base,/dialog \{[^}]*var\(--ds-radius-2xl/s);
  assert.match(base,/#onboarding \{[^}]*var\(--ds-surface-raised/s);
  assert.match(base,/\.action-request \{[^}]*var\(--ds-warning/s);
});

test('legacy global hard-coded control surfaces stay removed',()=>{
  assert.doesNotMatch(base,/button \{[^}]*background:#ffffff06/s);
  assert.doesNotMatch(base,/input,select,textarea \{[^}]*background:#101618/s);
  assert.doesNotMatch(base,/#onboarding \{[^}]*background:#192124/s);
});
