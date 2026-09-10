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

test('all performance controls expose only Fast and Balanced',()=>{
  assert.match(markup,/id="widget-quality-slider"[^>]*max="1"/);
  assert.doesNotMatch(markup,/value="high"/);
});

test('widget uses one microphone control for listening and mute',()=>{
  assert.equal((markup.match(/id="widget-mic"/g)||[]).length,1);
  assert.doesNotMatch(markup,/id="widget-mute"/);
  assert.match(markup,/id="widget-end-conversation"/);
});
