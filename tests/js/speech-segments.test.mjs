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
test('long clauses start speaking before the sentence is complete',()=>{
  const s=new SpeechSegments({clauseThreshold:40});
  assert.deepEqual(s.push('I understand what you mean, and I am working through the useful answer'),['I understand what you mean,']);
  assert.deepEqual(s.push('.',true),['and I am working through the useful answer.']);
});
