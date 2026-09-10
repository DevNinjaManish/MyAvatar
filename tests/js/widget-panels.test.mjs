import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialPanelState, reducePanelState, readPanelPreferences, savePanelPreferences, PANEL_IDS} from '../../src/widget/panel-model.js';
import {agentPlanSteps,agentStepObservation,agentStepVerification} from '../../src/widget/panels.js';
import layoutAPI from '../../electron/widget-layout.cjs';
const {widgetLayout,validPanelsRequest,UTILITY_HEIGHT,CALENDAR_HEIGHT}=layoutAPI;
const area={x:0,y:24,width:1440,height:820};

test('panels start closed with only Task expanded',()=>assert.deepEqual(initialPanelState(),{open:false,expanded:['task'],wide:null}));
test('all five agreed panels exist in the agreed order',()=>assert.deepEqual(PANEL_IDS,['task','changes','terminal','tests','diff']));
test('local agent plans expose bounded ordered steps without commands',()=>{
  const steps=agentPlanSteps([{kind:'gitStatus'},{kind:'test'}]);
  assert.deepEqual(steps,[{id:'step-1',label:'Read Git status',status:'pending'},{id:'step-2',label:'Run JavaScript tests',status:'pending'}]);
  assert.equal(Object.hasOwn(steps[0],'command'),false);
});
test('bounded agent steps expose authored observations and verification summaries',()=>{
  assert.equal(agentStepObservation({kind:'test'},{ok:true}),'test completed.');
  assert.deepEqual(agentStepVerification({kind:'testJs'},{ok:true}),{status:'passed',ok:true,checks:[{id:'testJs',ok:true}],message:'testJs completed.'});
  assert.deepEqual(agentStepVerification({kind:'build'},{ok:false}),{status:'failed',ok:false,checks:[{id:'build',ok:false}],message:'build reported a failure.'});
  assert.equal(agentStepVerification({kind:'gitDiff'},{ok:true}),null);
});
test('at most two panels are expanded; oldest collapses first',()=>{
  let state=initialPanelState();
  for(const id of PANEL_IDS.slice(1))state=reducePanelState(state,{type:'toggle-panel',id});
  assert.deepEqual(state.expanded,['tests','diff']);assert.equal(state.open,true);
});
test('collapsing a panel preserves the others and does not mutate the previous state',()=>{
  const before={open:true,expanded:['task','terminal'],wide:null};
  const after=reducePanelState(before,{type:'toggle-panel',id:'task'});
  assert.deepEqual(after.expanded,['terminal']);assert.deepEqual(before.expanded,['task','terminal']);
});
test('invalid panels and wide targets cannot enter state',()=>{
  const state=initialPanelState();
  assert.equal(reducePanelState(state,{type:'toggle-panel',id:'shell'}),state);
  assert.equal(reducePanelState(state,{type:'open-wide',id:'terminal'}),state);
});
test('closing tools also closes the wide view and preserves disclosure preferences',()=>{
  const state=reducePanelState(initialPanelState(),{type:'open-wide',id:'diff'});
  assert.deepEqual(reducePanelState(state,{type:'close-tools'}),{open:false,expanded:['task'],wide:null});
});
test('collapse all retains the tools container',()=>{
  const state=reducePanelState({...initialPanelState(),open:true},{type:'collapse-all'});
  assert.equal(state.open,true);assert.deepEqual(state.expanded,[]);
});
for(const data of ['{bad', 'null', '{"expanded":"task"}'])test(`bad preferences recover (${data})`,()=>{
  assert.deepEqual(readPanelPreferences({getItem:()=>data}),initialPanelState());
});
test('stored IDs are sanitised, deduplicated, limited and never reopen a window on launch',()=>{
  const state=readPanelPreferences({getItem:()=>JSON.stringify({open:true,wide:'diff',expanded:['bad','task','task','terminal','diff']})});
  assert.deepEqual(state,{open:false,wide:null,expanded:['terminal','diff']});
});
test('denied browser storage never breaks the widget',()=>{
  assert.deepEqual(readPanelPreferences({getItem(){throw Error('denied');}}),initialPanelState());
  assert.doesNotThrow(()=>savePanelPreferences({setItem(){throw Error('denied');}},initialPanelState()));
});
test('only disclosure preferences are persisted, never task or project content',()=>{
  let saved;savePanelPreferences({setItem:(_key,value)=>saved=JSON.parse(value)},{...initialPanelState(),brief:'secret',project:'/private'});
  assert.deepEqual(saved,{expanded:['task']});
});
test('compact dimensions are unchanged',()=>assert.deepEqual(widgetLayout({x:1170,y:100},{},area).bounds,{x:1170,y:64,width:260,height:370}));
test('chat uses the shared utility height',()=>assert.equal(widgetLayout({x:1170,y:100},{chat:true},area).bounds.height,UTILITY_HEIGHT));
test('coding uses the shared utility height',()=>assert.equal(widgetLayout({x:1170,y:100},{tools:true},area).bounds.height,UTILITY_HEIGHT));
test('calendar leaves room for month controls and event entries',()=>assert.equal(widgetLayout({x:1170,y:24},{calendar:true},area).bounds.height,CALENDAR_HEIGHT));
test('chat+tools size is clamped to the work area',()=>{
  const result=widgetLayout({x:1170,y:100},{chat:true,tools:true},area);
  assert.equal(result.bounds.height,UTILITY_HEIGHT);assert.equal(result.bounds.y,64);
});
test('right edge opens the wide panel on the left without moving the compact column',()=>{
  const result=widgetLayout({x:1170,y:100},{tools:true,wide:true},area);
  assert.equal(result.side,'left');assert.equal(result.bounds.x+result.offset,1170);
  assert.equal(result.wingWidth,440);
});
test('left edge opens the wide panel on the right',()=>{
  const result=widgetLayout({x:12,y:40},{tools:true,wide:true},area);
  assert.equal(result.side,'right');assert.equal(result.bounds.x,12);assert.equal(result.offset,0);
});
test('closing a large stack restores the original anchor',()=>{
  const anchor={x:1170,y:64};widgetLayout(anchor,{chat:true,tools:true,wide:true},area);
  assert.deepEqual(widgetLayout(anchor,{},area).bounds,{...anchor,width:260,height:370});
});
test('negative display coordinates are supported',()=>{
  const monitor={x:-1920,y:-100,width:1920,height:1080};
  const result=widgetLayout({x:-300,y:200},{tools:true,wide:true},monitor);
  assert.equal(result.side,'left');assert.ok(result.bounds.x>=-1920);
  assert.ok(result.bounds.x+result.bounds.width<=0);
});
test('narrow monitors use an inline wide view instead of offscreen windows',()=>{
  const result=widgetLayout({x:20,y:20},{tools:true,wide:true},{x:0,y:0,width:500,height:600});
  assert.equal(result.side,'inline');assert.equal(result.bounds.width,260);
});
test('all tested layouts stay within work area bounds',()=>{
  for(const width of [260,400,600,800,1440])for(const height of [370,480,600,900]){
    const monitor={x:-400,y:24,width,height};
    for(const anchor of [{x:-900,y:-100},{x:999,y:900},{x:0,y:100}]){
      const {bounds:b}=widgetLayout(anchor,{tools:true,chat:true,wide:true},monitor);
      assert.ok(b.x>=monitor.x&&b.y>=monitor.y);
      assert.ok(b.x+b.width<=monitor.x+width&&b.y+b.height<=monitor.y+height);
    }
  }
});
for(const request of [null,[],{},'wide',{open:1,wide:false},{open:false,wide:true},{open:true,wide:false,command:'rm'}]){
  test(`reject invalid panel IPC: ${JSON.stringify(request)}`,()=>assert.equal(validPanelsRequest(request),false));
}
test('accept only the small boolean panel IPC contract',()=>{
  assert.equal(validPanelsRequest({open:true,wide:true}),true);
  assert.equal(validPanelsRequest({open:false,wide:false}),true);
});
test('markup has unique IDs, five persistent controls and separate Stop',()=>{
  const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length);
  const toolbar=html.match(/<div class="widget-toolbar">([\s\S]*?)<\/div>/)[1];
  assert.deepEqual([...toolbar.matchAll(/<button id="([^"]+)"/g)].map(match=>match[1]),['widget-mic','widget-chat-toggle','widget-specialist-toggle','widget-more']);
  assert.ok(html.includes('id="widget-coding-tools"')&&html.includes('id="widget-calendar-toggle"')&&html.includes('id="widget-creative-toggle"'));
  assert.ok(!toolbar.includes('widget-stop'));assert.ok(ids.includes('widget-stop'));
  assert.equal((html.match(/id="stage"/g)||[]).length,1);
});
test('every panel disclosure references an existing element',()=>{
  const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
  for(const match of html.matchAll(/aria-controls="([^"]+)"/g))assert.ok(html.includes(`id="${match[1]}"`),match[1]);
});
