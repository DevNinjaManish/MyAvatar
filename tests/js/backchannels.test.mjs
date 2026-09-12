import test from 'node:test';
import assert from 'node:assert/strict';
import {backchannelFor,shouldBackchannel} from '../../src/conversation/backchannels.js';

test('backchannels preserve persona and reflect context',()=>{
  const phrases=['nova','sterling','rivet','luma'].map(bot=>backchannelFor(bot,4,'Why does this plan need so many steps?'));
  assert.equal(new Set(phrases).size,4);assert.ok(phrases.every(Boolean));
  assert.notEqual(backchannelFor('nova',2,'Why is this happening?'),backchannelFor('nova',2,'Please fix and update the whole project'));
});
test('short social turns never receive a processing fallback',()=>{
  assert.equal(shouldBackchannel('How are you?'),false);
  assert.equal(shouldBackchannel('Can you hear me?'),false);
  assert.equal(shouldBackchannel('Please compare these two options and explain the important tradeoffs'),true);
});
