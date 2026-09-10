import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const config=JSON.parse(readFileSync(new URL('../../config.json',import.meta.url),'utf8'));
const markup=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const expectedBots=['robot','nova','butler','pixel','luma'];

test('companion configuration is complete and unique',()=>{
  assert.deepEqual(Object.keys(config.bots),expectedBots);
  const names=new Set();
  for(const [id,bot] of Object.entries(config.bots)){
    assert.match(id,/^[a-z][a-z0-9_-]*$/);
    assert.ok(bot.name);assert.ok(bot.voice);assert.ok(bot.system);
    assert.equal(names.has(bot.name),false,bot.name+' is duplicated');
    names.add(bot.name);
  }
});

test('performance profiles reference usable local models',()=>{
  for(const [id,profile] of Object.entries(config.performanceProfiles)){
    assert.match(id,/^(low|medium)$/);
    assert.match(profile.llm.model,/^huihui_ai\/qwen3\.5-abliterated:/);
    assert.ok(profile.llm.context>=2048);
    assert.ok(profile.avatar.maxFps>0);
  }
});

test('Fast and Balanced are the only supported performance modes',()=>{
  assert.deepEqual(Object.keys(config.performanceProfiles),['low','medium']);
  assert.match(config.performanceProfiles.medium.name,/Recommended/);
  assert.equal(config.performanceProfile,'low');
});

test('Fast mode is tuned to start speech earlier than Balanced',()=>{
  const fast=config.performanceProfiles.low.conversation;
  const balanced=config.performanceProfiles.medium.conversation;
  assert.ok(fast.firstChunkChars<=40);
  assert.ok(fast.firstChunkChars<balanced.firstChunkChars);
  assert.ok(fast.chunkChars<balanced.chunkChars);
});

test('live voice latency defaults remain conservative but responsive',()=>{
  const vad=config.audio.vad;
  assert.ok(vad.silenceMs>=380&&vad.silenceMs<=450);
  assert.ok(vad.minSpeechMs>=200&&vad.minSpeechMs<=240);
  assert.ok(vad.onsetMs>=100&&vad.onsetMs<=120);
  assert.ok(config.audio.resumeDelayMs>=100&&config.audio.resumeDelayMs<=160);
  assert.ok(vad.bargeIn.threshold>vad.threshold);
  assert.ok(vad.bargeIn.minSpeechMs>vad.minSpeechMs);
});

test('all performance controls expose only Fast and Balanced',()=>{
  assert.match(markup,/id="widget-quality-slider"[^>]*max="1"/);
  assert.doesNotMatch(markup,/value="high"/);
});

test('widget uses one microphone control for listening and mute',()=>{
  assert.equal((markup.match(/id="widget-mic"/g)||[]).length,1);
  assert.doesNotMatch(markup,/id="widget-mute"/);
  assert.match(markup,/id="widget-end-conversation"/);
});
