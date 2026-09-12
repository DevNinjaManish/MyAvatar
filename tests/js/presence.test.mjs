import assert from 'node:assert/strict';
import test from 'node:test';
import {presenceStateForEvent} from '../../src/conversation/presence.js';
import {STATES} from '../../src/conversation/state.js';

test('runtime events drive the voice presence lifecycle',()=>{
  assert.equal(presenceStateForEvent({type:'config'}),STATES.IDLE);
  assert.equal(presenceStateForEvent({type:'transcript'}),STATES.THINKING);
  assert.equal(presenceStateForEvent({type:'token'}),STATES.THINKING);
  assert.equal(presenceStateForEvent({type:'audio'}),STATES.SPEAKING);
  assert.equal(presenceStateForEvent({type:'done'},STATES.SPEAKING),STATES.IDLE);
  assert.equal(presenceStateForEvent({type:'error'},STATES.THINKING),STATES.IDLE);
});

test('non-lifecycle runtime events do not disturb presence',()=>{
  assert.equal(presenceStateForEvent({type:'context'},STATES.LISTENING),STATES.LISTENING);
  assert.equal(presenceStateForEvent({type:'job'},STATES.THINKING),STATES.THINKING);
});

test('paused presence is a supported low-motion state',()=>{
  assert.equal(STATES.PAUSED,'PAUSED');
  assert.equal(presenceStateForEvent({type:'job'},STATES.PAUSED),STATES.PAUSED);
});
