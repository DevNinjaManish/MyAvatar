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

test('Rivet hierarchy has a branded agent header and compact project treatment', () => {
  const code=readFileSync(new URL('../../src/widget/rivet-workspace.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../../src/workspace/agent-task.css',import.meta.url),'utf8');
  assert.match(code,/LOCAL CODING AGENT/);
  assert.match(code,/rivet-project-main/);
  assert.match(code,/Open project/);
  assert.match(css,/\.rivet-heading-copy/);
  assert.match(css,/\.rivet-project-dot/);
  assert.match(css,/\.rivet-agent-workspace #widget-panel-notice/);
});

test('Rivet visual hierarchy avoids boxed timeline and advanced cards', () => {
  const css=readFileSync(new URL('../../src/workspace/agent-task.css',import.meta.url),'utf8');
  assert.match(css,/\.rivet-timeline[\s\S]*border-top:1px solid/);
  assert.match(css,/\.rivet-details-body > \.widget-panel[\s\S]*border-radius:0/);
  assert.match(css,/#widget-task-run,[\s\S]*#widget-view-changes[\s\S]*box-shadow/);
});

test('Rivet workspace mounts after task controller and presentation mounts after workspace', () => {
  const code=readFileSync(new URL('../../src/app/entry.js',import.meta.url),'utf8');
  assert.ok(code.indexOf('mountRivetWorkspace(window,document)') > code.indexOf('mountRivetTaskController(window,document,window.desktop)'));
  assert.ok(code.indexOf('mountRivetTaskPresentation(window,document)') > code.indexOf('mountRivetWorkspace(window,document)'));
});
