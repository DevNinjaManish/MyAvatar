import test from 'node:test';
import assert from 'node:assert/strict';
import {ChatStore,shouldFollowScroll} from '../../src/conversation/chat-store.js';

const config=(botId,name)=>({type:'config',botId,config:{conversation:{persona:botId},bots:{[botId]:{name}}}});

test('streaming assistant message keeps one stable id through completion',()=>{
  const store=new ChatStore();store.applyRuntimeEvent(config('rivet','Rivet'));
  store.applyRuntimeEvent({type:'transcript',botId:'rivet',turn:4,text:'Hello'});
  store.applyRuntimeEvent({type:'token',botId:'rivet',turn:4,text:'First '});
  store.applyRuntimeEvent({type:'token',botId:'rivet',turn:4,text:'answer'});
  let messages=store.snapshot();
  assert.equal(messages[1].id,'turn-4-assistant');assert.equal(messages[1].text,'First answer');assert.equal(messages[1].status,'streaming');
  store.applyRuntimeEvent({type:'done',botId:'rivet',turn:4});messages=store.snapshot();
  assert.equal(messages[1].id,'turn-4-assistant');assert.equal(messages[1].status,'complete');
});

test('stop marks only the current unfinished assistant reply interrupted',()=>{
  const store=new ChatStore();store.applyRuntimeEvent({type:'token',turn:1,text:'Old'});store.applyRuntimeEvent({type:'done',turn:1});
  store.applyRuntimeEvent({type:'token',turn:2,text:'Partial'});store.interruptLatest();
  const messages=store.snapshot();assert.equal(messages[0].status,'complete');assert.equal(messages[1].status,'interrupted');
});

test('tts degradation annotates message without failing text answer',()=>{
  const store=new ChatStore();store.applyRuntimeEvent({type:'token',turn:3,text:'Text survives'});
  store.applyRuntimeEvent({type:'speech_unavailable',turn:3,message:'bad voice'});store.applyRuntimeEvent({type:'done',turn:3});
  const message=store.snapshot()[0];assert.equal(message.status,'complete');assert.equal(message.text,'Text survives');assert.equal(message.meta.voiceWarning,'bad voice');
});

test('drafts are isolated per bot and restored on switch',()=>{
  const store=new ChatStore();store.setDraft('Rivet draft','rivet');store.setBot('nova','Nova');store.setDraft('Nova draft');
  assert.equal(store.draft(),'Nova draft');store.setBot('rivet','Rivet');assert.equal(store.draft(),'Rivet draft');
});

test('history replaces only the active bot conversation',()=>{
  const store=new ChatStore();store.loadHistory([{role:'user',content:'Rivet memory'}],'rivet');store.setBot('nova','Nova');store.loadHistory([{role:'assistant',content:'Nova memory'}],'nova');
  assert.equal(store.snapshot()[0].text,'Nova memory');assert.equal(store.snapshot('rivet')[0].text,'Rivet memory');
});

test('session focus follows the latest user intent and survives bot switching',()=>{
  const store=new ChatStore();
  store.applyRuntimeEvent(config('nova','Nova'));store.applyRuntimeEvent({type:'transcript',botId:'nova',turn:1,text:'Help me plan tomorrow morning'});
  assert.equal(store.focus(),'Help me plan tomorrow morning');
  store.applyRuntimeEvent(config('pixel','Pixel'));store.applyRuntimeEvent({type:'transcript',botId:'pixel',turn:2,text:'Launch campaign for the new app'});
  assert.equal(store.focus(),'Launch campaign for the new app');
  store.applyRuntimeEvent(config('nova','Nova'));assert.equal(store.focus(),'Help me plan tomorrow morning');
});

test('history restores only the latest user focus and clear removes it',()=>{
  const store=new ChatStore();store.setBot('luma','Luma');
  store.loadHistory([{role:'user',content:'Old brief'},{role:'assistant',content:'Okay'},{role:'user',content:'Refine the settings screen'}],'luma');
  assert.equal(store.focus(),'Refine the settings screen');store.clear();assert.equal(store.focus(),'');
});

test('session focus is bounded and never stores the whole long request',()=>{
  const store=new ChatStore();store.setBot('sterling','Sterling');store.setFocus('x'.repeat(400));
  assert.ok(store.focus().length<=140);assert.match(store.focus(),/…$/);
});

test('old bot runtime output is ignored after companion switch',()=>{
  const store=new ChatStore();store.applyRuntimeEvent(config('nova','Nova'));store.applyRuntimeEvent({type:'token',botId:'rivet',turn:1,text:'stale'});assert.equal(store.snapshot().length,0);
});

test('scroll follow policy follows only near the bottom',()=>{
  assert.equal(shouldFollowScroll({scrollTop:440,clientHeight:500,scrollHeight:980}),true);
  assert.equal(shouldFollowScroll({scrollTop:100,clientHeight:500,scrollHeight:1200}),false);
});

test('approval request and result update the same canonical message',()=>{
  const store=new ChatStore();
  store.applyRuntimeEvent({type:'transcript',turn:8,text:'Open Xcode'});
  store.applyRuntimeEvent({type:'token',turn:8,text:'I can do that.'});
  store.applyRuntimeEvent({type:'action_request',turn:8,requestId:'abc',action:{kind:'open_app',value:'Xcode'}});
  let items=store.snapshot();const approval=items.find(item=>item.type==='approval');
  assert.equal(approval.id,'approval-abc');assert.equal(approval.meta.approvalState,'pending');
  assert.equal(items.find(item=>item.role==='assistant').meta.sideEffect,true);
  store.applyRuntimeEvent({type:'action_result',turn:8,requestId:'abc',ok:true});
  items=store.snapshot();assert.equal(items.find(item=>item.id==='approval-abc').meta.approvalState,'approved');
});

test('denied approval is recorded without creating retryable side effects',()=>{
  const store=new ChatStore();store.applyRuntimeEvent({type:'transcript',turn:9,text:'Close Xcode'});store.applyRuntimeEvent({type:'token',turn:9,text:'Okay.'});
  store.applyRuntimeEvent({type:'action_request',turn:9,requestId:'deny-me',action:{kind:'close_app',value:'Xcode'}});
  store.applyRuntimeEvent({type:'action_result',turn:9,requestId:'deny-me',ok:false,denied:true});
  const approval=store.snapshot().find(item=>item.type==='approval');assert.equal(approval.meta.approvalState,'denied');
});

test('retry is allowed only for failed or interrupted non-side-effecting responses',()=>{
  const safe=new ChatStore();safe.applyRuntimeEvent({type:'transcript',turn:3,text:'Explain this'});safe.applyRuntimeEvent({type:'token',turn:3,text:'Partial'});safe.applyRuntimeEvent({type:'error',turn:3,message:'model failed'});
  assert.equal(safe.canRetry(safe.snapshot().find(item=>item.role==='assistant')),true);assert.equal(safe.userTextForTurn(3),'Explain this');
  const unsafe=new ChatStore();unsafe.applyRuntimeEvent({type:'transcript',turn:4,text:'Open Xcode'});unsafe.applyRuntimeEvent({type:'token',turn:4,text:'Working'});unsafe.applyRuntimeEvent({type:'action_request',turn:4,requestId:'x',action:{kind:'open_app',value:'Xcode'}});unsafe.applyRuntimeEvent({type:'error',turn:4,message:'later failure'});
  assert.equal(unsafe.canRetry(unsafe.snapshot().find(item=>item.role==='assistant')),false);
});

test('standalone action result becomes typed tool result when approval record is absent',()=>{
  const store=new ChatStore();store.applyRuntimeEvent({type:'action_result',turn:5,requestId:'missing',ok:false});
  const item=store.snapshot()[0];assert.equal(item.type,'tool-result');assert.equal(item.meta.sideEffect,true);assert.equal(item.text,'Action failed.');
});

test('delegation and background work become visible chat banners',()=>{
  const store=new ChatStore();
  store.applyRuntimeEvent({type:'delegation',sequence:11,specialistBot:'rivit',goal:'Inspect the project',status:'working'});
  store.applyRuntimeEvent({type:'job',sequence:12,message:'Rivit finished checking the project.',status:'complete'});
  const items=store.snapshot();
  assert.equal(items[0].type,'banner');assert.equal(items[0].meta.specialistBot,'rivit');
  assert.equal(items[1].type,'banner');assert.match(items[1].text,/finished/);
});
