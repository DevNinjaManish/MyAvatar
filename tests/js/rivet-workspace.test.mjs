import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rivetWorkspaceModel} from '../../src/widget/rivet-workspace.js';
import {rivetTaskPresentation} from '../../src/widget/rivet-task-presentation.js';

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

test('task presentation exposes contextual actions', () => {
  const active=rivetTaskPresentation({phase:'WORKING',status:'active'});
  const waiting=rivetTaskPresentation({phase:'NEEDS_APPROVAL',status:'waiting'});
  const complete=rivetTaskPresentation({phase:'COMPLETE',status:'success'});
  const blocked=rivetTaskPresentation({phase:'BLOCKED',status:'blocked'});
  assert.equal(active.showStop,true);
  assert.equal(waiting.showStop,true);
  assert.equal(complete.showViewChanges,true);
  assert.equal(blocked.showRetry,true);
  assert.equal(waiting.tone,'warning');
  assert.equal(blocked.tone,'error');
});

test('agent workspace CSS keeps advanced tools secondary', () => {
  const css=readFileSync(new URL('../../src/workspace/agent-task.css',import.meta.url),'utf8');
  assert.match(css,/\.rivet-details-toggle/);
  assert.match(css,/#widget-task-run/);
  assert.match(css,/\.rivet-timeline/);
  assert.match(css,/#widget-view-changes/);
  assert.match(css,/data-task-tone/);
});

test('Rivet workspace mounts after task controller and presentation mounts after workspace', () => {
  const code=readFileSync(new URL('../../src/app/entry.js',import.meta.url),'utf8');
  assert.ok(code.indexOf('mountRivetWorkspace(window,document)') > code.indexOf('mountRivetTaskController(window,document,window.desktop)'));
  assert.ok(code.indexOf('mountRivetTaskPresentation(window,document)') > code.indexOf('mountRivetWorkspace(window,document)'));
});
