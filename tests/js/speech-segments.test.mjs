import test from 'node:test';
import assert from 'node:assert/strict';
import {SpeechSegments} from '../../src/conversation/speech-segments.js';
test('speech starts on a sentence boundary before generation completes',()=>{
  const s=new SpeechSegments();assert.deepEqual(s.push('Hello'),[]);
  assert.deepEqual(s.push(' there.'),['Hello there.']);
  assert.deepEqual(s.push(' Next'),[]);
  assert.deepEqual(s.push(' sentence!'),['Next sentence!']);
  assert.deepEqual(s.push('',true),[]);
});
test('a terminal first sentence does not wait for a later stream token',()=>{
  const s=new SpeechSegments();
  assert.deepEqual(s.push('That should work.'),['That should work.']);
  assert.deepEqual(s.push('',true),[]);
});
test('abbreviations and ellipses remain buffered for natural continuation',()=>{
  const s=new SpeechSegments();
  assert.deepEqual(s.push('Ask Dr.'),[]);
  assert.deepEqual(s.push(' Patel.'),['Ask Dr. Patel.']);
  assert.deepEqual(s.push('Well...'),[]);
  assert.deepEqual(s.push(' maybe.'),['Well... maybe.']);
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
