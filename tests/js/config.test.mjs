import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {companions} from '../../src/app/companions.js';

const config=JSON.parse(readFileSync(new URL('../../config.json',import.meta.url),'utf8'));
const expectedBots=['nova','sterling','rivet','luma'];

test('companion configuration is complete and unique',()=>{
  assert.deepEqual(companions.map(companion=>companion.id),expectedBots);
  assert.equal(config.defaultCompanion,'nova');
  const names=new Set();
  for(const companion of companions){const {id}=companion;
    assert.match(id,/^[a-z][a-z0-9_-]*$/);assert.ok(companion.name);assert.ok(companion.asset);assert.equal(companion.voice?.provider,'kokoro');assert.ok(companion.voice?.voiceId);assert.ok(companion.voice?.lang);assert.ok(companion.voice?.speed>0);assert.ok(companion.voice?.name);assert.ok(companion.voice?.rate>0);assert.ok(companion.voice?.defaultEmotion);assert.ok(companion.voice?.systemPrompt);assert.ok(companion.voice?.greeting);
    assert.equal(names.has(companion.name),false,companion.name+' is duplicated');names.add(companion.name);
  }
  assert.equal(new Set(companions.map(companion=>companion.voice.name)).size,companions.length);
});

test('configured model paths reference the preserved local assets',()=>{
  assert.equal(config.models.conversation.provider,'ollama');
  assert.equal(config.models.conversation.fastModel,'huihui_ai/qwen3.5-abliterated:4b');
  assert.equal(config.models.conversation.balancedModel,'huihui_ai/qwen3.5-abliterated:9b');
  assert.equal(config.models.speechToText.provider,'mlx-whisper');
  assert.equal(config.models.speechToText.fastModel,'mlx-community/whisper-base.en-mlx');
  assert.equal(config.models.speechToText.balancedModel,'mlx-community/whisper-large-v3-turbo');
  assert.equal(config.models.speechToText.fallbackProvider,'faster-whisper');
  assert.equal(config.models.speechToText.provisionalProvider,'zipformer');
  assert.equal(config.models.textToSpeech.model,'models/kokoro-v1.0.onnx');
  assert.equal(config.models.textToSpeech.voices,'models/voices-v1.0.bin');
});

test('bots use one canonical asset pack with stable filenames',()=>{
  const botIds=['nova','sterling','rivet','luma','pixel'];
  for(const botId of botIds){
    const directory=new URL(`../../public/assets/bots/${botId}/`,import.meta.url);
    assert.equal(existsSync(new URL('portrait.png',directory)),true,`${botId} portrait is missing`);
    assert.equal(existsSync(new URL('body.png',directory)),true,`${botId} body is missing`);
    assert.equal(existsSync(new URL('hands.png',directory)),true,`${botId} hands are missing`);
    for(const filename of ['body.png','hands.png']){
      const png=readFileSync(new URL(filename,directory));
      assert.equal(png.subarray(1,4).toString(),'PNG',`${botId} ${filename} is not PNG`);
      assert.ok([4,6].includes(png[25]),`${botId} ${filename} has no alpha channel`);
    }
    const names=readdirSync(directory);
    assert.equal(names.some(name=>/-v\d+|mvp/i.test(name)),false,`${botId} contains a versioned asset filename`);
  }
});
