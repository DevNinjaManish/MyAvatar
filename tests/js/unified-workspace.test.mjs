import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {workspaceProfile,workspaceActivity,agentTaskSummary,companionWorkspaceState,rivetWorkspaceState,rivetPatchSummary,rivetActionAvailability} from '../../src/workspace/unified-workspace.js';

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

test('agent task activity exposes only the bounded runtime summary',()=>{
  assert.equal(agentTaskSummary({toolSummary:'Prepared a safe patch proposal for approval.'}),'Prepared a safe patch proposal for approval.');
  assert.equal(agentTaskSummary({toolSummary:'  '}),'');
  assert.equal(agentTaskSummary({toolSummary:'x'.repeat(200)}),'x'.repeat(119)+'…');
});

test('Nova workspace uses only session focus, conversation output, and available calendar context',()=>{
  const state=companionWorkspaceState('nova',{focus:'Plan tomorrow morning',draft:'Message to Sam',messages:[{role:'assistant',type:'message',text:'Start with the appointment.',status:'complete'}],calendar:{available:true,label:'2 upcoming events',events:[{title:'Appointment'}]}});
  assert.equal(state.focusLabel,'Current goal');
  assert.equal(state.focus,'Plan tomorrow morning');
  assert.deepEqual(state.modules.map(([label])=>label),['Practical next action','Active plan','Useful output','Planning context']);
  assert.match(state.modules[2][1],/Draft in progress/);
  assert.equal(state.calendar.events.length,1);
});

test('Nova workspace marks whether a current goal is active',()=>{
  const source=readFileSync(new URL('../../src/workspace/unified-workspace.js',import.meta.url),'utf8');
  assert.match(source,/shell\.dataset\.focusActive=String\(Boolean\(focusText\(\)/);
});

test('Nova workspace gives active focus and planning context a restrained visual emphasis',()=>{
  const css=readFileSync(new URL('../../src/workspace/unified-workspace.css',import.meta.url),'utf8');
  assert.match(css,/data-focus-active=true\].*uws-focus\{box-shadow/);
  assert.match(css,/data-bot=nova\].*uws-modules>div:last-child/);
});

test('Sterling workspace isolates priorities and does not invent decisions or schedule data',()=>{
  const state=companionWorkspaceState('butler',{focus:'Finish the launch brief',messages:[],calendar:{available:false}});
  assert.equal(state.focusLabel,'Current priority');
  assert.equal(state.modules[0][1],'Captured from this session');
  assert.equal(state.modules[1][1],'No active decision captured');
  assert.match(state.modules[3][1],/unavailable/);
  const other=companionWorkspaceState('nova',{focus:'Plan a trip'});
  assert.notEqual(state.focus,other.focus);
});

test('Pixel workspace keeps campaign modules in the shared shell',()=>{
  const state=companionWorkspaceState('pixel',{focus:'Launch the spring collection',draft:'Three-word launch hook',messages:[{role:'assistant',type:'message',text:'Try a warmer opening.',status:'complete'}]});
  assert.equal(state.kind,'pixel');
  assert.equal(state.focusLabel,'Campaign objective');
  assert.equal(state.focus,'Launch the spring collection');
  assert.deepEqual(state.modules.map(([label])=>label),['Current message / hook','Next marketing experiment','Copy / output','Campaign status']);
  assert.match(state.modules[2][1],/Draft in progress/);
  assert.match(state.modules[3][1],/Direction captured/);
});

test('Luma workspace keeps design modules isolated from Pixel output',()=>{
  const luma=companionWorkspaceState('luma',{focus:'Improve onboarding hierarchy',messages:[{role:'assistant',type:'message',text:'Reduce competing emphasis.',status:'complete'}]});
  const pixel=companionWorkspaceState('pixel',{focus:'Launch the spring collection'});
  assert.equal(luma.kind,'luma');
  assert.equal(luma.focusLabel,'Active design brief');
  assert.deepEqual(luma.modules.map(([label])=>label),['Key design decision','Critique status','Visual output','Image tools']);
  assert.match(luma.modules[1][1],/captured/);
  assert.equal(luma.modules[3][1],'Not connected in this session');
  assert.notEqual(luma.focus,pixel.focus);
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
