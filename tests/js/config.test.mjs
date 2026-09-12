import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {companions} from '../../src/app/companions.js';

const config=JSON.parse(readFileSync(new URL('../../config.json',import.meta.url),'utf8'));
const expectedBots=['nova','sterling','rivet','luma'];

test('companion configuration is complete and unique',()=>{
  assert.deepEqual(companions.map(companion=>companion.id),expectedBots);
  assert.equal(config.defaultCompanion,'nova');
  const names=new Set();
  for(const companion of companions){const {id}=companion;
    assert.match(id,/^[a-z][a-z0-9_-]*$/);assert.ok(companion.name);assert.ok(companion.asset);assert.ok(companion.voice?.name);assert.ok(companion.voice?.rate>0);
    assert.equal(names.has(companion.name),false,companion.name+' is duplicated');names.add(companion.name);
  }
  assert.equal(new Set(companions.map(companion=>companion.voice.name)).size,companions.length);
});

test('MVP model paths reference the preserved local assets',()=>{
  assert.equal(config.models.conversation.provider,'ollama');
  assert.equal(config.models.textToSpeech.model,'models/kokoro-v1.0.onnx');
  assert.equal(config.models.textToSpeech.voices,'models/voices-v1.0.bin');
});
