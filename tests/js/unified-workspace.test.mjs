import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceProfile,workspaceActivity,rivetWorkspaceState} from '../../src/workspace/unified-workspace.js';

test('all five companions map to one shared workspace profile model',()=>{
  const ids=['robot','nova','butler','pixel','luma'];
  const profiles=ids.map(workspaceProfile);
  assert.equal(profiles.length,5);
  assert.equal(new Set(profiles.map(item=>item.eyebrow)).size,5);
  assert.equal(workspaceProfile('unknown').name,'Nova');
  assert.equal(workspaceProfile('robot').mode,'coding');
  assert.equal(workspaceProfile('pixel').mode,'creative');
});

test('workspace activity uses authored observable phases only',()=>{
  assert.equal(workspaceActivity('thinking'),'Thinking');
  assert.equal(workspaceActivity('writing'),'Preparing reply');
  assert.equal(workspaceActivity('speaking'),'Speaking');
  assert.equal(workspaceActivity('SECRET_REASONING'),'Ready');
});

test('Rivet workspace state follows observable coding events without granting authority',()=>{
  let state=rivetWorkspaceState({type:'coding_workspace',workspace:{name:'MyAvatar'}});
  assert.equal(state.project,'MyAvatar');
  state=rivetWorkspaceState({type:'coding_context'},state);
  assert.equal(state.task,'Inspecting project context');
  state=rivetWorkspaceState({type:'coding_patch'},state);
  assert.equal(state.task,'Change ready for review');
  state=rivetWorkspaceState({type:'coding_verification',status:'running'},state);
  assert.equal(state.verification,'Verification running');
  state=rivetWorkspaceState({type:'coding_edit_result',result:{ok:true},verification:{status:'passed'}},state);
  assert.equal(state.task,'Latest change applied');
  assert.equal(state.verification,'Verification passed');
});
