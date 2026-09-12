import test from 'node:test';
import assert from 'node:assert/strict';
import {RuntimeEventGate,validApprovalDecision,noteClientMessage} from '../../src/conversation/runtime-events.js';
import {AudioEngine,getActiveCaptureSnapshot} from '../../src/audio/engine.js';
import {turnPlayback} from '../../src/audio/turn-playback.js';

const event=(type,sequence,{sessionId='s1',botId='rivet',...rest}={})=>({
  type,runtimeVersion:1,sessionId,sequence,botId,turn:null,...rest
});

test('typed runtime starts from a warming readiness event or config',()=>{
  const gate=new RuntimeEventGate();
  assert.equal(gate.accept(event('ready',1)),false);
  assert.equal(gate.accept(event('readiness',1)),true);
  assert.equal(gate.accept(event('config',2)),true);
  const direct=new RuntimeEventGate();
  assert.equal(direct.accept(event('config',1)),true);
  assert.equal(direct.accept(event('profile',2)),true);
});
test('typed runtime rejects non-readiness events before config',()=>{
  const gate=new RuntimeEventGate();
  assert.equal(gate.accept(event('greeting',1)),false);
  assert.equal(gate.accept(event('config',1)),true);
  assert.equal(gate.accept(event('profile',2)),true);
});

test('rejects duplicate and out-of-order sequence numbers',()=>{
  const gate=new RuntimeEventGate();
  assert.equal(gate.accept(event('config',1)),true);
  assert.equal(gate.accept(event('ready',2)),true);
  assert.equal(gate.accept(event('token',2)),false);
  assert.equal(gate.accept(event('token',1)),false);
  assert.equal(gate.accept(event('token',3)),true);
});

test('rejects a different session after the socket session is established',()=>{
  const gate=new RuntimeEventGate();gate.accept(event('config',1));
  assert.equal(gate.accept(event('config',1,{sessionId:'old'})),false);
});

test('config is the only bot transition and old bot output is rejected',()=>{
  const gate=new RuntimeEventGate();gate.accept(event('config',1));
  assert.equal(gate.accept(event('config',2,{botId:'luma'})),true);
  assert.equal(gate.accept(event('greeting',3,{botId:'rivet'})),false);
  assert.equal(gate.accept(event('bot_history',4,{botId:'luma'})),true);
});

test('legacy events are accepted only before typed runtime identity appears',()=>{
  const gate=new RuntimeEventGate();
  assert.equal(gate.accept({type:'legacy'}),true);
  assert.equal(gate.accept(event('config',1)),true);
  assert.equal(gate.accept({type:'legacy'}),false);
});

test('invalid typed envelopes are rejected',()=>{
  const gate=new RuntimeEventGate();
  assert.equal(gate.accept({...event('config',1),runtimeVersion:2}),false);
  assert.equal(gate.accept({...event('config',1),sequence:0}),false);
  assert.equal(gate.accept({...event('config',1),botId:''}),false);
});

test('outgoing turns suspend an existing live listening gate before processing',()=>{
  const engine=new AudioEngine(()=>{});engine._claimCapture('live');engine.captureActive=true;engine.detector={reset(){}};
  engine.setListening(true);assert.equal(getActiveCaptureSnapshot().muted,false);
  const win=new EventTarget();noteClientMessage(JSON.stringify({type:'turn',turn:77,text:'typed while live'}),win);
  assert.equal(engine.liveGate,false);assert.equal(engine.captureActive,true);assert.equal(turnPlayback.activeTurn,77);
  turnPlayback.cancelTurn();engine.endCapture();
});

test('outgoing voice turns register audio playback coordination',()=>{
  const win=new EventTarget();
  noteClientMessage(JSON.stringify({type:'voice',turn:78,audio:'encoded',mime:'audio/wav'}),win);
  assert.equal(turnPlayback.activeTurn,78);
  assert.equal(turnPlayback.noteServerEvent({type:'audio',turn:78}),true);
  assert.equal(turnPlayback.snapshot().expected,1);
  turnPlayback.cancelTurn();
});

test('approval decisions accept only the narrow allow-once or deny contract',()=>{
  assert.equal(validApprovalDecision({requestId:'abc',decision:'allow_once'}),true);
  assert.equal(validApprovalDecision({requestId:'abc',decision:'deny'}),true);
  assert.equal(validApprovalDecision({requestId:'',decision:'deny'}),false);
  assert.equal(validApprovalDecision({requestId:'abc',decision:'always_allow'}),false);
  assert.equal(validApprovalDecision({requestId:'x'.repeat(129),decision:'allow_once'}),false);
  assert.equal(validApprovalDecision({requestId:'abc',decision:'allow_once',command:'rm -rf /'}),true);
});
