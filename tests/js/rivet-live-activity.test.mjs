import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const edits=readFileSync(new URL('../../src/conversation/coding-edits.js',import.meta.url),'utf8');
const workspace=readFileSync(new URL('../../src/widget/rivet-workspace.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../../src/workspace/agent-task.css',import.meta.url),'utf8');

test('backend agent state is forwarded into the Rivet workspace event',()=>{
  assert.match(edits,/event\.type==='agent_state'/);
  assert.match(edits,/myavatar:agent-task/);
  assert.match(edits,/event\.agentState/);
});

test('coding lifecycle emits bounded live activity labels',()=>{
  for(const type of ['coding_context','coding_patch','coding_verification','coding_edit_result'])assert.match(edits,new RegExp(`event\\.type==='${type}'`));
  assert.match(edits,/myavatar:rivet-activity/);
  assert.match(edits,/\.slice\(0,8\)/);
});

test('workspace keeps only a short session activity history',()=>{
  assert.match(workspace,/activityTrail = \[\]/);
  assert.match(workspace,/\.slice\(-8\)/);
  assert.match(workspace,/Session activity/);
  assert.match(workspace,/myavatar:rivet-activity/);
});

test('live activity presentation stays compact and text safe',()=>{
  assert.match(workspace,/row\.textContent = item\.label/);
  assert.doesNotMatch(workspace,/row\.innerHTML/);
  assert.match(css,/\.rivet-activity-history/);
  assert.match(css,/text-overflow:ellipsis/);
});
