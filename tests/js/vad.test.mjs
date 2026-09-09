import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TurnDetector} from '../../src/audio/vad.js';
import {AudioEngine} from '../../src/audio/engine.js';
const frame=(v)=>new Float32Array(160).fill(v); // 10 ms at 16k
const feed=(vad,n,v)=>Array.from({length:n},()=>vad.push(frame(v))).filter(Boolean);
test('silence stays bounded and never creates a turn',()=>{const v=new TurnDetector(16000);assert.equal(feed(v,6000,0).length,0);assert.ok(v.samples<=4160);});
test('a short noise is discarded',()=>{const v=new TurnDetector(16000);assert.equal([...feed(v,15,.1),...feed(v,150,0)].length,0);});
test('steady ambient noise raises the local floor without creating a turn',()=>{
 const v=new TurnDetector(16000,{threshold:.004});
 assert.equal(feed(v,500,.008).length,0);
 assert.ok(v.currentThreshold>.008);
 const turns=[...feed(v,50,.04),...feed(v,100,0)];
 assert.equal(turns.length,1);
});
test('isolated clicks never satisfy speech onset',()=>{
 const v=new TurnDetector(16000,{threshold:.004});
 const click=new Float32Array(160);click[0]=.9;
 const turns=[];
 for(let i=0;i<12;i++){turns.push(v.push(click));turns.push(...feed(v,8,0));}
 turns.push(...feed(v,100,0));
 assert.equal(turns.filter(Boolean).length,0);
});
test('brief non-verbal burst is rejected but a short spoken turn remains valid',()=>{
 const v=new TurnDetector(16000,{threshold:.004,minSpeechMs:280,onsetMs:140});
 assert.equal([...feed(v,22,.08),...feed(v,100,0)].length,0);
 assert.equal([...feed(v,34,.08),...feed(v,100,0)].length,1);
});
test('speech emits once after the silence deadline and retains the start',()=>{const v=new TurnDetector(16000);feed(v,40,0);assert.equal(feed(v,60,.08).length,0);assert.equal(feed(v,59,0).length,0);const out=v.push(frame(0));assert.ok(out instanceof Float32Array);assert.ok(out.some(x=>x>.07));assert.equal(v.lastDetectionDelayMs,600);assert.equal(feed(v,200,0).length,0);});
test('reset prevents an interrupted partial turn from leaking',()=>{const v=new TurnDetector(16000);feed(v,60,.1);v.reset();assert.equal(feed(v,100,0).length,0);assert.equal([...feed(v,60,.1),...feed(v,100,0)].length,1);});
test('long speech is bounded',()=>{const v=new TurnDetector(16000,{maxSpeechMs:1000});const turns=feed(v,100,.1);assert.equal(turns.length,1);assert.ok(turns[0].length<=16000);});
test('live capture suppresses playback audio and resumes for the next turn',async()=>{
 const engine=new AudioEngine(()=>{});engine.ctx={sampleRate:16000,resume:async()=>{}};
 let capture;engine.record=async(_timer,onFrame)=>{capture=onFrame;};let count=0;
 await engine.startLive(()=>count++);
 const utterance=()=>{for(let i=0;i<60;i++)capture(frame(.1));for(let i=0;i<100;i++)capture(frame(0));};
 utterance();assert.equal(count,0); // paused while preparing / speaking
 engine.setListening(true);utterance();assert.equal(count,1);
 utterance();assert.equal(count,1); // automatically closed until reply finishes
 engine.setListening(true);utterance();assert.equal(count,2);
 engine.setListening(false);utterance();assert.equal(count,2);
});
