import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialPanelState, reducePanelState, readPanelPreferences, savePanelPreferences, PANEL_IDS} from '../../src/widget/panel-model.js';
import {agentPlanSteps,agentStepObservation,agentStepVerification} from '../../src/widget/panels.js';
import layoutAPI from '../../electron/widget-layout.cjs';
const {widgetLayout,validPanelsRequest,WIDTH,COMPACT_WIDTH,COMPACT_HEIGHT,UTILITY_HEIGHT,CALENDAR_HEIGHT}=layoutAPI;
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
test('the closed companion owns only its visible right column',()=>assert.deepEqual(widgetLayout({x:1170,y:100},{},area).bounds,{x:area.x+area.width-COMPACT_WIDTH,y:100,width:COMPACT_WIDTH,height:COMPACT_HEIGHT}));
test('chat uses the shared utility height up to available screen space',()=>assert.equal(widgetLayout({x:1170,y:100},{chat:true},area).bounds.height,Math.min(UTILITY_HEIGHT,area.height)));
test('coding uses the shared utility height up to available screen space',()=>assert.equal(widgetLayout({x:1170,y:100},{tools:true},area).bounds.height,Math.min(UTILITY_HEIGHT,area.height)));
test('calendar leaves room for month controls and event entries within the display',()=>assert.equal(widgetLayout({x:1170,y:24},{calendar:true},area).bounds.height,Math.min(CALENDAR_HEIGHT,area.height)));
test('chat+tools size is clamped to the work area',()=>{
  const result=widgetLayout({x:1170,y:100},{chat:true,tools:true},area);
  assert.equal(result.bounds.height,Math.min(UTILITY_HEIGHT,area.height));assert.equal(result.bounds.y,24);
});
test('specialists never expand or offset the native companion frame',()=>{
  const result=widgetLayout({x:1170,y:100},{tools:true,wide:true},area);
  assert.equal(result.side,'none');assert.equal(result.bounds.x,area.x+area.width-WIDTH);assert.equal(result.bounds.width,WIDTH);assert.equal(result.offset,0);assert.equal(result.wingWidth,0);
});
test('specialist states expand from the same right-edge anchor',()=>{
  const anchor={x:40,y:100};
  const closed=widgetLayout(anchor,{},area).bounds;
  for(const view of [{calendar:true,wide:true},{tools:true,wide:true},{chat:true},{chat:true,tools:true,wide:true}]){const open=widgetLayout(anchor,view,area).bounds;assert.equal(open.x+open.width,closed.x+closed.width);assert.equal(open.width,WIDTH);}
});
test('opening and closing a stack leaves the anchor unchanged',()=>{
  const anchor={x:1100,y:24};widgetLayout(anchor,{chat:true,tools:true,wide:true},area);
  assert.deepEqual(widgetLayout(anchor,{},area).bounds,{x:area.x+area.width-COMPACT_WIDTH,y:anchor.y,width:COMPACT_WIDTH,height:COMPACT_HEIGHT});
});
test('negative display coordinates are supported',()=>{
  const monitor={x:-1920,y:-100,width:1920,height:1080};
  const result=widgetLayout({x:-300,y:200},{tools:true,wide:true},monitor);
  assert.equal(result.side,'none');assert.ok(result.bounds.x>=-1920);
  assert.ok(result.bounds.x+result.bounds.width<=0);
});
test('narrow monitors keep specialist views inside the fixed companion frame',()=>{
  const result=widgetLayout({x:20,y:20},{tools:true,wide:true},{x:0,y:0,width:500,height:600});
  assert.equal(result.side,'none');assert.equal(result.bounds.width,500);
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
test('widget geometry uses fixed layers and a modal specialist surface',()=>{
  const css=readFileSync(new URL('../../src/styles/widget-stack.css',import.meta.url),'utf8');
  assert.ok(css.includes('Fixed companion shell'));
  assert.ok(css.includes('background: transparent !important;'));
  assert.ok(css.includes('body.widget main {'));
  assert.ok(css.includes('width: var(--widget-shell-column-width) !important;'));
  assert.ok(css.includes('Specialists occupy the reserved left rail'));
  assert.ok(css.includes('top: 24px !important;'));
  assert.ok(css.includes('bottom: 10px;'));
  assert.ok(css.includes('z-index: 60 !important;'));
});
test('markup has unique IDs, five persistent controls and separate Stop',()=>{
  const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length);
  const toolbar=html.match(/<div class="widget-toolbar">([\s\S]*?)<\/div>/)[1];
  assert.deepEqual([...toolbar.matchAll(/<button id="([^"]+)"/g)].map(match=>match[1]),['widget-mic','widget-chat-toggle','widget-specialist-toggle','widget-more']);
  assert.ok(html.includes('id="widget-coding-tools"')&&html.includes('id="widget-calendar-toggle"')&&html.includes('id="widget-creative-toggle"'));
  assert.ok(html.includes('id="widget-creative-workspace"')&&html.includes('id="widget-creative-content"'));
  assert.ok(!toolbar.includes('widget-stop'));assert.ok(ids.includes('widget-stop'));
  assert.equal((html.match(/id="stage"/g)||[]).length,1);
});
test('every panel disclosure references an existing element',()=>{
  const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
  for(const match of html.matchAll(/aria-controls="([^"]+)"/g))assert.ok(html.includes(`id="${match[1]}"`),match[1]);
});
test('the widget keeps platform and chat geometry independent from specialists',()=>{
  const css=readFileSync(new URL('../../src/styles/widget-stack.css',import.meta.url),'utf8');
  assert.match(css,/body\.widget main \{[\s\S]*top: var\(--widget-shell-platform-top\)/);
  assert.match(css,/body\.widget #widget-chat \{[\s\S]*top: var\(--widget-shell-stack-top\)/);
  assert.ok(css.includes('body.widget.widget-wide-open #widget-code-wing'));
  assert.ok(css.includes('display: none !important;'));
  assert.ok(css.includes('left: var(--widget-shell-pad) !important;'));
});
test('chat has one stable scrolling region so its controls never shift with a long transcript',()=>{
  const css=readFileSync(new URL('../../src/styles/widget-stack.css',import.meta.url),'utf8');
  assert.ok(css.includes('overflow: hidden !important;'));
  assert.ok(css.includes('overflow-y: auto !important;'));
  assert.ok(css.includes('scrollbar-gutter: stable !important;'));
  assert.ok(css.includes('padding-right: var(--widget-scrollbar-gutter) !important;'));
});
test('specialists assign scrolling to their content rather than nested panel shells',()=>{
  const stack=readFileSync(new URL('../../src/styles/widget-stack.css',import.meta.url),'utf8');
  const panels=readFileSync(new URL('../../src/styles/widget-panels.css',import.meta.url),'utf8');
  assert.match(panels,/\.widget-panels-scroll\{flex:1;overflow:auto;/);
  assert.match(stack,/#widget-coding-panels,\s*body\.widget #widget-mini-calendar,[\s\S]*#widget-code-wing \{[\s\S]*overflow: hidden !important;/);
  assert.match(stack,/#widget-creative-workspace \{ overflow-y: auto !important; scrollbar-gutter: stable !important;/);
});
test('each companion picker card uses its own accent when selected',()=>{
  const css=readFileSync(new URL('../../src/styles/base.css',import.meta.url),'utf8');
  assert.ok(css.includes('var(--bot-card-accent,#a5e2ce)'));
  for(const accent of ['#79d8ef','#f0a8d0','#d1b26f','#c9ff55','#9fe7ff'])assert.ok(css.includes(`--bot-card-accent:${accent}`));
});
test('the visible specialist icon follows calendar coding and creative panel state',()=>{
  const runtime=readFileSync(new URL('../../src/app/widget-runtime.js',import.meta.url),'utf8');
  const panels=readFileSync(new URL('../../src/widget/panels.js',import.meta.url),'utf8');
  assert.match(runtime,/function syncSpecialistState\(kind,open\)/);
  assert.match(runtime,/syncSpecialistState\('calendar',opening\)/);
  assert.match(runtime,/widget-mini-calendar-close'\)\.onclick=.*syncSpecialistState\('calendar',false\)/);
  assert.match(runtime,/syncSpecialistState\('creative',opening\)/);
  assert.match(runtime,/widget-creative-close'\)\.onclick=.*syncSpecialistState\('creative',false\)/);
  assert.match(runtime,/myavatar:specialist-state/);
  assert.match(panels,/myavatar:specialist-state.*kind: 'coding', open: visible/);
});
test('calendar and creative specialists request state without side-layout mutations',()=>{
  const runtime=readFileSync(new URL('../../src/app/widget-runtime.js',import.meta.url),'utf8');
  assert.match(runtime,/function requestCalendarLayout\(open\).*widgetCalendar/);
  assert.match(runtime,/function requestCreativeLayout\(open\).*widgetSpecialist/);
  assert.match(runtime,/requestCalendarLayout\(opening\)/);
  assert.match(runtime,/requestCreativeLayout\(opening\)/);
  assert.doesNotMatch(runtime,/panelSide/);
});
test('platform and chat headings reserve control space instead of shifting it for long labels',()=>{
  const cockpit=readFileSync(new URL('../../src/styles/widget-cockpit.css',import.meta.url),'utf8');
  const polish=readFileSync(new URL('../../src/styles/widget-polish.css',import.meta.url),'utf8');
  assert.match(cockpit,/\.cockpit-heading\{[^}]*grid-template-columns:minmax\(0,1fr\) 28px/);
  assert.match(cockpit,/#widget-stop-slot\{position:static;width:28px/);
  assert.match(cockpit,/#widget-status\{min-width:0;overflow:hidden;text-overflow:ellipsis/);
  assert.match(polish,/widget-chat-heading > div:first-child \{[^}]*min-width:0/);
  assert.match(polish,/#widget-chat-state \{ min-width:0; overflow:hidden; text-overflow:ellipsis;/);
  assert.match(polish,/\.widget-chat-actions \{ flex:none; white-space:nowrap; \}/);
});
test('the platform decorative rail stays below the bot selector text',()=>{
  const polish=readFileSync(new URL('../../src/styles/widget-polish.css',import.meta.url),'utf8');
  assert.match(polish,/#widget-tools::before \{ top:31px; \}/);
  assert.match(polish,/#widget-tools::after \{ top:37px; \}/);
});
test('bot changes clear every attached widget surface before rendering the next companion',()=>{
  const runtime=readFileSync(new URL('../../src/app/widget-runtime.js',import.meta.url),'utf8');
  const panels=readFileSync(new URL('../../src/widget/panels.js',import.meta.url),'utf8');
  assert.match(runtime,/function syncBotUI\(\)\{\s*closeWidgetUtilities\(\);/);
  assert.match(runtime,/function closeWidgetUtilities\(keep=''\)\{[\s\S]*widget-mini-calendar[\s\S]*widget-creative-workspace[\s\S]*closeCodingWorkspace/);
  assert.match(panels,/win\.closeCodingWorkspace = \(\) => dispatch\(\{type: 'close-tools'\}\);/);
});
