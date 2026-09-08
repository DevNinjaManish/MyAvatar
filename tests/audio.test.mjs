import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resample} from '../src/audio/engine.js';
import {AppState} from '../src/conversation/state.js';
test('48k capture retains duration and DC level at 16k',()=>{const output=resample(new Float32Array(48000).fill(.25),48000);assert.equal(output.length,16000);assert.ok(output.every(x=>x===.25));});
test('44.1k capture handles non-integral resampling without NaNs',()=>{const output=resample(new Float32Array(44100).fill(.5),44100);assert.equal(output.length,16000);assert.ok(output.every(x=>Number.isFinite(x)&&x===.5));});
test('state rejects unknown states and emits transitions',()=>{const state=new AppState();let n=0;state.addEventListener('change',()=>n++);state.set('LISTENING');assert.equal(state.value,'LISTENING');assert.equal(n,1);assert.throws(()=>state.set('BROKEN'));});
test('stop discards an audio decode that finishes after interruption',async()=>{
  const {AudioEngine}=await import('../src/audio/engine.js');
  let resolveDecode;const engine=new AudioEngine(()=>{});
  engine.ctx={resume:async()=>{},decodeAudioData:()=>new Promise(resolve=>{resolveDecode=resolve;})};
  const pending=engine.enqueue(btoa('wav'),()=>assert.fail('stale audio started'),()=>{});
  await new Promise(setImmediate);engine.stop();resolveDecode({});await pending;
  assert.equal(engine.queue.length,0);assert.equal(engine.playing,false);
});

test('stopping during microphone permission releases the late stream',async()=>{
 const {AudioEngine}=await import('../src/audio/engine.js');
 const engine=new AudioEngine(()=>{});engine.ctx={resume:async()=>{}};
 let grant,stopped=false;
 const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(resolve=>{grant=resolve;})}}});
 try{
   const pending=engine.record();await new Promise(setImmediate);engine.stopRecord();
   grant({getTracks:()=>[{stop:()=>{stopped=true;}}]});await pending;
   assert.equal(stopped,true);assert.equal(engine.stream,undefined);
 }finally{if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;}
});
