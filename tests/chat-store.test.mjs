import test from 'node:test';
import assert from 'node:assert/strict';
import {ChatStore,shouldFollowScroll} from '../src/conversation/chat-store.js';

const config=(botId,name)=>({type:'config',botId,config:{conversation:{persona:botId},bots:{[botId]:{name}}}});

test('streaming assistant message keeps one stable id through completion',()=>{
  const store=new ChatStore();store.applyRuntimeEvent(config('robot','Rivet'));
  store.applyRuntimeEvent({type:'transcript',botId:'robot',turn:4,text:'Hello'});
  store.applyRuntimeEvent({type:'token',botId:'robot',turn:4,text:'First '});
  store.applyRuntimeEvent({type:'token',botId:'robot',turn:4,text:'answer'});
  let messages=store.snapshot();
  assert.equal(messages[1].id,'turn-4-assistant');assert.equal(messages[1].text,'First answer');assert.equal(messages[1].status,'streaming');
  store.applyRuntimeEvent({type:'done',botId:'robot',turn:4});messages=store.snapshot();
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
  const store=new ChatStore();store.setDraft('Rivet draft','robot');store.setBot('nova','Nova');store.setDraft('Nova draft');
  assert.equal(store.draft(),'Nova draft');store.setBot('robot','Rivet');assert.equal(store.draft(),'Rivet draft');
});

test('history replaces only the active bot conversation',()=>{
  const store=new ChatStore();store.loadHistory([{role:'user',content:'Rivet memory'}],'robot');store.setBot('nova','Nova');store.loadHistory([{role:'assistant',content:'Nova memory'}],'nova');
  assert.equal(store.snapshot()[0].text,'Nova memory');assert.equal(store.snapshot('robot')[0].text,'Rivet memory');
});

test('old bot runtime output is ignored after companion switch',()=>{
  const store=new ChatStore();store.applyRuntimeEvent(config('nova','Nova'));store.applyRuntimeEvent({type:'token',botId:'robot',turn:1,text:'stale'});assert.equal(store.snapshot().length,0);
});

test('scroll follow policy follows only near the bottom',()=>{
  assert.equal(shouldFollowScroll({scrollTop:440,clientHeight:500,scrollHeight:980}),true);
  assert.equal(shouldFollowScroll({scrollTop:100,clientHeight:500,scrollHeight:1200}),false);
});

test('future tool and approval records have typed structured state',()=>{
  const store=new ChatStore();store.addStructured({id:'approval-abc',type:'approval',text:'Approval required',meta:{requestId:'abc',action:{kind:'open_app',value:'Xcode'}}});
  const item=store.snapshot()[0];assert.equal(item.type,'approval');assert.equal(item.role,'system');assert.equal(item.meta.requestId,'abc');
});
