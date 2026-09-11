import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../../src/styles/widget-panels.css',import.meta.url),'utf8');

test('panel headings and states truncate instead of pushing controls out of view',()=>{
  assert.match(css,/\.widget-panels-heading h2\{[^}]*text-overflow:ellipsis[^}]*white-space:nowrap/);
  assert.match(css,/\.widget-panel-toggle \.panel-state\{[^}]*min-width:0[^}]*text-overflow:ellipsis[^}]*white-space:nowrap/);
  assert.match(css,/\.widget-panel-toggle::after\{[^}]*flex:none/);
});

test('file diff and terminal output wrap safely inside narrow inspectors',()=>{
  assert.match(css,/\.widget-panel-body pre\{[^}]*max-width:100%[^}]*overflow-wrap:anywhere[^}]*word-break:break-word/);
  assert.match(css,/\.widget-wing-empty\{[^}]*overflow-wrap:anywhere/);
  assert.match(css,/\.widget-wing-footer\{[^}]*overflow-wrap:anywhere/);
});

test('narrow layout stacks project controls and keeps panel actions usable',()=>{
  assert.match(css,/@media\(max-width:520px\)/);
  assert.match(css,/\.widget-project-row\{align-items:stretch;flex-direction:column\}/);
  assert.match(css,/\.widget-panel-body \.panel-actions>button\{flex:1 1 112px\}/);
  assert.match(css,/\.widget-panel-toggle \.panel-state\{max-width:42%\}/);
});
