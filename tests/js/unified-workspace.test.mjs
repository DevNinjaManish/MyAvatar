import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceProfile,workspaceActivity,rivetWorkspaceState,rivetPatchSummary,rivetActionAvailability} from '../../src/workspace/unified-workspace.js';

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

test('Rivet patch summaries are compact and metadata-only',()=>{
  assert.equal(rivetPatchSummary({files:[{path:'a.js',additions:8,deletions:2},{path:'b.py',additions:3,deletions:1}]}),'2 files · +11/-3');
  assert.equal(rivetPatchSummary({files:[]}), 'Change ready for review');
});

test('Rivet workspace tracks repo files patch verification repair and rollback lifecycle',()=>{
  let state=rivetWorkspaceState({type:'coding_workspace',workspace:{name:'MyAvatar'}});
  assert.equal(state.project,'MyAvatar');
  state=rivetWorkspaceState({type:'coding_context',paths:['src/a.js','tests/a.test.js']},state);
  assert.deepEqual(state.files,['src/a.js','tests/a.test.js']);
  assert.equal(state.task,'Inspecting 2 project files');
  state=rivetWorkspaceState({type:'coding_patch',transaction:{id:'tx1',files:[{path:'src/a.js',additions:4,deletions:1}],repairRound:0}},state);
  assert.equal(state.task,'Change ready for review');
  assert.equal(state.diffSummary,'1 file · +4/-1');
  assert.deepEqual(rivetActionAvailability(state),{approve:true,reject:true,repair:false,rollback:false});
  state=rivetWorkspaceState({type:'coding_verification',status:'running'},state);
  assert.equal(state.verification,'Verification running');
  assert.equal(rivetActionAvailability(state).approve,false);
  state=rivetWorkspaceState({type:'coding_edit_result',result:{id:'tx1',rollbackAvailable:true},verification:{status:'failed'},repairRound:0},state);
  assert.equal(state.task,'Change needs repair');
  assert.equal(state.verification,'Verification needs attention');
  assert.deepEqual(rivetActionAvailability(state),{approve:false,reject:false,repair:true,rollback:true});
  state=rivetWorkspaceState({type:'coding_patch',transaction:{id:'tx2',files:[{path:'src/a.js',additions:2,deletions:1}],repairRound:1}},state);
  assert.equal(state.task,'Repair ready for review');
  assert.equal(state.repairUsed,true);
  state=rivetWorkspaceState({type:'coding_edit_result',result:{id:'tx2',rollbackAvailable:true,repairRound:1},verification:{status:'failed'},repairRound:1},state);
  assert.equal(state.task,'Repair attempt used · review manually');
  assert.equal(rivetActionAvailability(state).repair,false);
  assert.equal(rivetActionAvailability(state).rollback,true);
});

test('successful Rivet verification clears repair and keeps rollback when offered',()=>{
  let state=rivetWorkspaceState({type:'coding_patch',transaction:{id:'tx3',files:[{path:'a.js',additions:1,deletions:0}]}},undefined);
  state=rivetWorkspaceState({type:'coding_edit_result',result:{id:'tx3',rollbackAvailable:true},verification:{status:'passed'}},state);
  assert.equal(state.task,'Latest change applied');
  assert.equal(state.verification,'Verification passed');
  assert.deepEqual(rivetActionAvailability(state),{approve:false,reject:false,repair:false,rollback:true});
});
