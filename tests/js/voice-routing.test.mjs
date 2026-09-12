import test from 'node:test';
import assert from 'node:assert/strict';
import {immediateVoiceCommand} from '../../src/conversation/voice-routing.js';
test('only narrow immediate commands may trust provisional recognition',()=>{
  assert.equal(immediateVoiceCommand('Stop.'),'stop');
  assert.equal(immediateVoiceCommand('never mind'),'stop');
  assert.equal(immediateVoiceCommand('How are you?'),null);
});
