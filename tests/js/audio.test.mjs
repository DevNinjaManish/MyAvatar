import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resample,AudioEngine,getActiveCaptureSnapshot,endActiveCapture,suspendActiveLiveCapture} from '../../src/audio/engine.js';
import {AppState} from '../../src/conversation/state.js';
import {turnPlayback} from '../../src/audio/turn-playback.js';

test('48k capture retains duration and DC level at 16k',()=>{const output=resample(new Float32Array(48000).fill(.25),48000);assert.equal(output.length,16000);assert.ok(output.every(x=>x===.25));});
test('44.1k capture handles non-integral resampling without NaNs',()=>{const output=resample(new Float32Array(44100).fill(.5),44100);assert.equal(output.length,16000);assert.ok(output.every(x=>Number.isFinite(x)&&x===.5));});
test('state rejects unknown states and ignores duplicate transitions',()=>{const state=new AppState();let n=0;state.addEventListener('change',()=>n++);assert.equal(state.set('LISTENING'),true);assert.equal(state.set('LISTENING'),false);assert.equal(state.value,'LISTENING');assert.equal(n,1);assert.throws(()=>state.set('BROKEN'));});
test('stop discards an audio decode that finishes after interruption',async()=>{
  turnPlayback.beginTurn(1);turnPlayback.noteServerEvent({type:'audio',turn:1});
  let resolveDecode;const engine=new AudioEngine(()=>{});
  engine.ctx={state:'running',resume:async()=>{},decodeAudioData:()=>new Promise(resolve=>{resolveDecode=resolve;})};
  const pending=engine.enqueue(btoa('wav'),()=>assert.fail('stale audio started'),()=>{});
  await new Promise(setImmediate);engine.stop();resolveDecode({});await pending;
  assert.equal(engine.queue.length,0);assert.equal(engine.playing,false);
  turnPlayback.cancelTurn();
});

test('stopping during microphone permission releases the late stream',async()=>{
 const engine=new AudioEngine(()=>{});engine.ctx={state:'running',resume:async()=>{}};
 let grant,stopped=false;
 const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(resolve=>{grant=resolve;})}}});
 try{
   const pending=engine.record();await new Promise(setImmediate);engine.endCapture();
   grant({getTracks:()=>[{stop:()=>{stopped=true;}}]});await pending;
   assert.equal(stopped,true);assert.equal(engine.stream,null);assert.equal(getActiveCaptureSnapshot().active,false);
 }finally{if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;}
});

test('speech decoding preserves arrival order and waits for all queued chunks',async()=>{
  turnPlayback.beginTurn(99);const engine=new AudioEngine(()=>{});const decoded=[];let finishFirst;
  engine.ctx={state:'running',decodeAudioData:bytes=>{const value=new Uint8Array(bytes)[0];decoded.push(value);return value===1?new Promise(resolve=>{finishFirst=()=>resolve({value});}):Promise.resolve({value});}};
  engine.pump=()=>{};
  turnPlayback.noteServerEvent({type:'audio',turn:99});const first=engine.enqueue(btoa(String.fromCharCode(1)));
  turnPlayback.noteServerEvent({type:'audio',turn:99});const second=engine.enqueue(btoa(String.fromCharCode(2)));
  turnPlayback.noteServerEvent({type:'done',turn:99});
  await new Promise(setImmediate);assert.deepEqual(decoded,[1]);assert.equal(turnPlayback.canResumeListening(),false);
  finishFirst();await Promise.all([first,second]);assert.deepEqual(engine.queue.map(item=>item.buffer.value),[1,2]);
  engine.stop();assert.equal(turnPlayback.canResumeListening(),true);
});

test('capture setup failure releases the granted microphone immediately',async()=>{
 const engine=new AudioEngine(()=>{});let stops=0;
 engine.ctx={state:'running',resume:async()=>{},createMediaStreamSource:()=>({disconnect(){}}),createBiquadFilter:()=>({frequency:{value:0},Q:{value:0},disconnect(){}}),audioWorklet:{addModule:async()=>{throw Error('worklet failed');}}};
 const stream={getTracks:()=>[{stop:()=>stops++}]};
 const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>stream}}});
 try{await assert.rejects(()=>engine.record(),/worklet failed/);assert.equal(stops,1);assert.equal(engine.captureMode,null);assert.equal(getActiveCaptureSnapshot().active,false);}
 finally{if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;}
});

test('only one AudioEngine owns capture at a time',()=>{
 const first=new AudioEngine(()=>{}),second=new AudioEngine(()=>{});let stopped=0;
 first.stream={getTracks:()=>[{stop:()=>stopped++}]};first.captureMode='live';first.captureActive=true;
 first._claimCapture('live');
 assert.equal(getActiveCaptureSnapshot().mode,'live');
 second._claimCapture('manual');
 assert.equal(stopped,1);assert.equal(first.captureActive,false);assert.equal(getActiveCaptureSnapshot().mode,'manual');
 endActiveCapture();assert.equal(getActiveCaptureSnapshot().active,false);
});

test('muting live listening does not release the microphone stream or reset twice',()=>{
 const engine=new AudioEngine(()=>{});let stopped=0,resets=0;
 engine._claimCapture('live');engine.captureActive=true;engine.stream={getTracks:()=>[{stop:()=>stopped++}]};engine.detector={reset:()=>resets++};
 engine.setListening(true);engine.setListening(true);assert.equal(engine.liveGate,true);assert.equal(resets,1);
 engine.setListening(false);engine.setListening(false);assert.equal(engine.liveGate,false);assert.equal(stopped,0);assert.equal(engine.captureActive,true);assert.equal(resets,2);
 engine.endCapture();assert.equal(stopped,1);
});

test('suspending an active live turn closes only the listening gate',()=>{
 const engine=new AudioEngine(()=>{});let stopped=0;
 engine._claimCapture('live');engine.captureActive=true;engine.stream={getTracks:()=>[{stop:()=>stopped++}]};engine.detector={reset(){}};
 engine.setListening(true);assert.equal(getActiveCaptureSnapshot().muted,false);
 assert.equal(suspendActiveLiveCapture(),true);assert.equal(engine.liveGate,false);assert.equal(engine.captureActive,true);assert.equal(stopped,0);
 engine.endCapture();
});

test('ready recreates a closed AudioContext instead of reusing it',async()=>{
 const original=globalThis.AudioContext;let made=0;
 globalThis.AudioContext=class{constructor(){made++;this.state='running';}};
 try{const engine=new AudioEngine(()=>{});engine.ctx={state:'closed'};engine.workletLoaded=true;await engine.ready();assert.equal(made,1);assert.equal(engine.ctx.state,'running');assert.equal(engine.workletLoaded,false);}
 finally{if(original)globalThis.AudioContext=original;else delete globalThis.AudioContext;}
});

test('stale worklet frames cannot escape after capture ends',()=>{
 const engine=new AudioEngine(()=>{});let delivered=0;
 engine._claimCapture('live');engine.captureActive=true;const generation=engine.captureGeneration;
 const handler=()=>{if(engine._isCaptureCurrent(generation)&&engine.captureActive)delivered++;};
 handler();engine.endCapture();handler();
 assert.equal(delivered,1);
});

test('endCapture is idempotent and clears owned capture resources',()=>{
 const engine=new AudioEngine(()=>{});let stops=0;
 engine._claimCapture('live');engine.captureActive=true;engine.stream={getTracks:()=>[{stop:()=>stops++}]};
 engine.endCapture();engine.endCapture();
 assert.equal(stops,1);assert.equal(engine.captureMode,null);assert.equal(engine.captureActive,false);assert.equal(getActiveCaptureSnapshot().active,false);
});
