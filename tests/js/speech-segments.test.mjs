import test from 'node:test';
import assert from 'node:assert/strict';
import {SpeechSegments} from '../../src/conversation/speech-segments.js';
test('speech starts on a sentence boundary before generation completes',()=>{
  const s=new SpeechSegments();assert.deepEqual(s.push('Hello'),[]);
  assert.deepEqual(s.push(' there. Next'),['Hello there.']);
  assert.deepEqual(s.push(' sentence!'),[]);
  assert.deepEqual(s.push('',true),['Next sentence!']);
});
test('final partial sentence is not lost or duplicated',()=>{
  const s=new SpeechSegments();assert.deepEqual(s.push('One. Two? Three'),['One.','Two?']);
  assert.deepEqual(s.push('',true),['Three']);assert.deepEqual(s.push('',true),[]);
});
