import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('cockpit keeps companion controls visually primary',()=>{
  const css=readFileSync(new URL('../../src/styles/widget-cockpit.css',import.meta.url),'utf8');
  assert.match(css,/Four primary controls read as one compact instrument cluster/);
  assert.match(css,/#widget-mic\.active/);
  assert.match(css,/button\[aria-expanded=true\]/);
  assert.match(css,/Telemetry is intentionally subordinate/);
});

test('cockpit respects bot accent theming',()=>{
  const css=readFileSync(new URL('../../src/styles/widget-cockpit.css',import.meta.url),'utf8');
  for(const bot of ['robot','nova','butler','pixel','luma']) assert.match(css,new RegExp(`data-bot=${bot}`));
  assert.match(css,/color-mix\(in srgb,var\(--accent\)/);
});

test('fixed toolbar geometry remains owned by widget-stack',()=>{
  const cockpit=readFileSync(new URL('../../src/styles/widget-cockpit.css',import.meta.url),'utf8');
  const stack=readFileSync(new URL('../../src/styles/widget-stack.css',import.meta.url),'utf8');
  assert.doesNotMatch(cockpit,/--widget-toolbar-slot-[1-4]/);
  assert.doesNotMatch(cockpit,/\.widget-toolbar #widget-(mic|chat-toggle|specialist-toggle|more)\s*\{[^}]*left\s*:/s);
  assert.match(stack,/--widget-toolbar-slot-1/);
  assert.match(stack,/--widget-toolbar-slot-4/);
});

test('cockpit includes reduced-motion fallback',()=>{
  const css=readFileSync(new URL('../../src/styles/widget-cockpit.css',import.meta.url),'utf8');
  assert.match(css,/prefers-reduced-motion/);
});
