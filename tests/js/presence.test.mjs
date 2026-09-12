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
  assert.equal(presenceStateForEvent({type:'error'},STATES.THINKING),STATES.ERROR);
});

test('context does not disturb presence and background jobs expose working',()=>{
  assert.equal(presenceStateForEvent({type:'context'},STATES.LISTENING),STATES.LISTENING);
  assert.equal(presenceStateForEvent({type:'job',status:'running'},STATES.THINKING),STATES.WORKING);
  assert.equal(presenceStateForEvent({type:'delegation',status:'failed'},STATES.WORKING),STATES.ERROR);
});

test('paused presence is a supported low-motion state',()=>{
  assert.equal(STATES.PAUSED,'PAUSED');
  assert.equal(presenceStateForEvent({type:'job'},STATES.PAUSED),STATES.PAUSED);
});

test('all production states are addressable and recovery follows an error',()=>{
  for(const state of Object.values(STATES))assert.equal(presenceStateForEvent({type:'presence',state}),state);
  assert.equal(presenceStateForEvent({type:'config'},STATES.ERROR),STATES.RECOVERY);
  assert.equal(presenceStateForEvent({type:'presence',state:'UNKNOWN'},STATES.SLEEPING),STATES.SLEEPING);
});
