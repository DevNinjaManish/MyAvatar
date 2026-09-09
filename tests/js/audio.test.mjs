import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resample,AudioEngine,getActiveCaptureSnapshot,endActiveCapture} from '../../src/audio/engine.js';
import {AppState} from '../../src/conversation/state.js';

test('48k capture retains duration and DC level at 16k',()=>{const output=resample(new Float32Array(48000).fill(.25),48000);assert.equal(output.length,16000);assert.ok(output.every(x=>x===.25));});
test('44.1k capture handles non-integral resampling without NaNs',()=>{const output=resample(new Float32Array(44100).fill(.5),44100);assert.equal(output.length,16000);assert.ok(output.every(x=>Number.isFinite(x)&&x===.5));});
test('state rejects unknown states and emits transitions',()=>{const state=new AppState();let n=0;state.addEventListener('change',()=>n++);state.set('LISTENING');assert.equal(state.value,'LISTENING');assert.equal(n,1);assert.throws(()=>state.set('BROKEN'));});
test('stop discards an audio decode that finishes after interruption',async()=>{
  let resolveDecode;const engine=new AudioEngine(()=>{});
  engine.ctx={resume:async()=>{},decodeAudioData:()=>new Promise(resolve=>{resolveDecode=resolve;})};
  const pending=engine.enqueue(btoa('wav'),()=>assert.fail('stale audio started'),()=>{});
  await new Promise(setImmediate);engine.stop();resolveDecode({});await pending;
  assert.equal(engine.queue.length,0);assert.equal(engine.playing,false);
});

test('stopping during microphone permission releases the late stream',async()=>{
 const engine=new AudioEngine(()=>{});engine.ctx={resume:async()=>{}};
 let grant,stopped=false;
 const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(resolve=>{grant=resolve;})}}});
 try{
   const pending=engine.record();await new Promise(setImmediate);engine.endCapture();
   grant({getTracks:()=>[{stop:()=>{stopped=true;}}]});await pending;
   assert.equal(stopped,true);assert.equal(engine.stream,null);assert.equal(getActiveCaptureSnapshot().active,false);
 }finally{if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;}
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

test('muting live listening does not release the microphone stream',()=>{
 const engine=new AudioEngine(()=>{});let stopped=0,resets=0;
 engine._claimCapture('live');engine.captureActive=true;engine.stream={getTracks:()=>[{stop:()=>stopped++}]};engine.detector={reset:()=>resets++};
 engine.setListening(true);assert.equal(engine.liveGate,true);
 engine.setListening(false);assert.equal(engine.liveGate,false);assert.equal(stopped,0);assert.equal(engine.captureActive,true);assert.ok(resets>=2);
 engine.endCapture();assert.equal(stopped,1);
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
