import test from 'node:test';
import assert from 'node:assert/strict';
import {immediateVoiceCommand,useComplexConversationModel} from '../../src/conversation/voice-routing.js';

test('normal conversation stays on the normal model',()=>{
  assert.equal(useComplexConversationModel('How are you?'),false);
  assert.equal(useComplexConversationModel('क्या हाल है?'),false);
});
test('complex requests select the larger model',()=>{
  assert.equal(useComplexConversationModel('Please explain how this architecture works.'),true);
  assert.equal(useComplexConversationModel('Debug this code and propose a refactor.'),true);
});
test('only narrow immediate commands may trust provisional recognition',()=>{
  assert.equal(immediateVoiceCommand('Stop.'),'stop');
  assert.equal(immediateVoiceCommand('never mind'),'stop');
  assert.equal(immediateVoiceCommand('How are you?'),null);
});
