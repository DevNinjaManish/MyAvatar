import test from 'node:test';
import assert from 'node:assert/strict';
import {useFastVoiceModel} from '../../src/conversation/voice-routing.js';

test('short social spoken turns take the fast local model lane',()=>{
  assert.equal(useFastVoiceModel('How are you?',{speaking:true}),true);
  assert.equal(useFastVoiceModel('क्या हाल है?',{speaking:true}),true);
});
test('work requests and typed requests retain the configured profile model',()=>{
  assert.equal(useFastVoiceModel('Please explain how this architecture works.',{speaking:true}),false);
  assert.equal(useFastVoiceModel('How are you?',{speaking:false}),false);
});
