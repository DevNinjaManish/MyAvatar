import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const config=JSON.parse(readFileSync(new URL('../config.json',import.meta.url),'utf8'));
const markup=readFileSync(new URL('../index.html',import.meta.url),'utf8');
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
    assert.match(id,/^(low|medium|high)$/);
    assert.match(profile.llm.model,/^huihui_ai\/qwen3\.5-abliterated:/);
    assert.ok(profile.llm.context>=2048);
    assert.ok(profile.avatar.maxFps>0);
  }
});

test('Balanced remains recommended while High is an optional 9B mode',()=>{
  assert.deepEqual(Object.keys(config.performanceProfiles),['low','medium','high']);
  assert.match(config.performanceProfiles.medium.name,/Recommended/);
  assert.match(config.performanceProfiles.high.llm.model,/:9b$/);
  assert.equal(config.performanceProfile,'medium');
});

test('widget uses one microphone control for listening and mute',()=>{
  assert.equal((markup.match(/id="widget-mic"/g)||[]).length,1);
  assert.doesNotMatch(markup,/id="widget-mute"/);
  assert.match(markup,/id="widget-end-conversation"/);
});
