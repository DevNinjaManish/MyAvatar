import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rivetWorkspaceModel} from '../../src/widget/rivet-workspace.js';

test('Rivet timeline maps task states to stable visual glyphs', () => {
  const model = rivetWorkspaceModel({phase:'WORKING',status:'active',steps:[
    {id:'1',label:'Inspect repo',status:'complete'},
    {id:'2',label:'Run tests',status:'active'},
    {id:'3',label:'Commit',status:'pending'},
  ]});
  assert.equal(model.phase,'WORKING');
  assert.deepEqual(model.steps.map(step=>step.glyph),['✓','●','○']);
});

test('approval and blocked steps stay visually distinct', () => {
  const waiting = rivetWorkspaceModel({steps:[{id:'1',label:'Build',status:'waiting'}]});
  const blocked = rivetWorkspaceModel({steps:[{id:'1',label:'Build',status:'blocked'}]});
  assert.equal(waiting.steps[0].glyph,'◌');
  assert.equal(blocked.steps[0].glyph,'!');
});

test('workspace model is safe with missing task data', () => {
  assert.deepEqual(rivetWorkspaceModel(),{phase:'IDLE',status:'idle',steps:[]});
});

test('agent workspace CSS keeps advanced tools secondary', () => {
  const css=readFileSync(new URL('../../src/workspace/agent-task.css',import.meta.url),'utf8');
  assert.match(css,/\.rivet-details-toggle/);
  assert.match(css,/#widget-task-run/);
  assert.match(css,/\.rivet-timeline/);
});

test('Rivet workspace mounts after task controller', () => {
  const code=readFileSync(new URL('../../src/app/entry.js',import.meta.url),'utf8');
  assert.ok(code.indexOf('mountRivetWorkspace(window,document)') > code.indexOf('mountRivetTaskController(window,document,window.desktop)'));
});
