import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const a11y=fs.readFileSync(new URL('../../src/widget/accessibility-controller.js',import.meta.url),'utf8');
const rivet=fs.readFileSync(new URL('../../src/widget/rivet-task-presentation.js',import.meta.url),'utf8');

test('true overlays trap Tab focus',()=>{
  assert.match(a11y,/bot-library[^\n]+trap:true/);
  assert.match(a11y,/widget-menu[^\n]+trap:true/);
  assert.match(a11y,/widget-code-wing[^\n]+trap:true/);
  assert.match(a11y,/event\.key!=='Tab'/);
  assert.match(a11y,/event\.shiftKey&&current===first/);
  assert.match(a11y,/!event\.shiftKey&&current===last/);
});

test('focusable filtering skips hidden and disabled descendants',()=>{
  assert.match(a11y,/button:not\(\[disabled\]\)/);
  assert.match(a11y,/closest\?\.\('\[hidden\],\[aria-hidden="true"\]'\)/);
});

test('normal attached workspaces are not focus trapped',()=>{
  assert.doesNotMatch(a11y,/widget-coding-panels[^\n]+trap:true/);
  assert.doesNotMatch(a11y,/widget-mini-calendar[^\n]+trap:true/);
  assert.doesNotMatch(a11y,/widget-creative-workspace[^\n]+trap:true/);
});

test('Rivet locks competing controls while running or awaiting approval',()=>{
  assert.match(rivet,/const locked = state\.working \|\| state\.awaitingApproval/);
  assert.match(rivet,/root\.setAttribute\('aria-busy', String\(state\.working\)\)/);
  assert.match(rivet,/quickButtons\.forEach\(button => \{ button\.disabled = locked; \}\)/);
  assert.match(rivet,/trusted\.disabled = locked/);
  assert.match(rivet,/brief\.readOnly = locked/);
});
