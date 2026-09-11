import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rivetWorkspaceModel} from '../../src/widget/rivet-workspace.js';

test('Rivet workspace exposes bounded investigation evidence',()=>{
  const model=rivetWorkspaceModel({
    phase:'PLANNING',status:'active',toolSummary:'Searching code',observation:'Found relevant UI code.',
    contextRefs:['src/a.js','src/b.js','src/c.js','src/d.js','src/e.js','src/f.js','src/g.js','src/h.js','src/i.js'],
    steps:[{id:'context',label:'Gather context',status:'active'}],
  });
  assert.equal(model.toolSummary,'Searching code');
  assert.equal(model.observation,'Found relevant UI code.');
  assert.deepEqual(model.refs,['src/a.js','src/b.js','src/c.js','src/d.js','src/e.js','src/f.js','src/g.js','src/h.js']);
});

test('Rivet evidence UI is compact and text-safe',()=>{
  const code=readFileSync(new URL('../../src/widget/rivet-workspace.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../../src/workspace/agent-task.css',import.meta.url),'utf8');
  assert.match(code,/activityTrail\.at\(-1\)\?\.label \|\| model\.toolSummary/);
  assert.match(code,/activity\.textContent = activeLabel/);
  assert.match(code,/item\.textContent = path/);
  assert.match(code,/aria-label', 'Rivet investigation evidence'/);
  assert.match(css,/\.rivet-evidence-list code/);
  assert.match(css,/text-overflow:ellipsis/);
});
