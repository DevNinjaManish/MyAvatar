import test from 'node:test';
import assert from 'node:assert/strict';
import {addNovaItem,emptyNovaWorkspace,normalizeNovaWorkspace,removeNovaItem,toggleNovaItem} from '../../src/nova/workspace-store.js';

test('Nova workspace normalizes only meaningful local items',()=>{
  const workspace=normalizeNovaWorkspace({focus:'  Plan the week ',reminders:[{text:'  '},{text:'Call Mum',due:'2026-09-14T09:00'}]});
  assert.equal(workspace.focus,'Plan the week');assert.equal(workspace.reminders.length,1);assert.equal(workspace.reminders[0].text,'Call Mum');
});

test('Nova workspace adds, completes, and removes local reminders',()=>{
  const added=addNovaItem(emptyNovaWorkspace(),'reminder',{text:'Review the prototype'});
  const done=toggleNovaItem(added,'reminder',added.reminders[0].id);
  assert.equal(done.reminders[0].done,true);assert.equal(removeNovaItem(done,'reminder',done.reminders[0].id).reminders.length,0);
});
