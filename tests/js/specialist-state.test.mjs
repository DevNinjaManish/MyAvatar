import test from 'node:test';
import assert from 'node:assert/strict';
import {nextSpecialistState, specialistVisibility} from '../../src/widget/specialist-state.js';

test('opening a specialist makes it the single active workspace', () => {
  let active = null;
  active = nextSpecialistState(active, {kind: 'calendar', open: true});
  assert.equal(active, 'calendar');
  active = nextSpecialistState(active, {kind: 'coding', open: true});
  assert.equal(active, 'coding');
  assert.deepEqual(specialistVisibility(active), {coding: true, calendar: false, creative: false});
});

test('closing an inactive specialist does not clear the active workspace', () => {
  const active = nextSpecialistState('coding', {kind: 'calendar', open: false});
  assert.equal(active, 'coding');
});

test('closing the active specialist returns to no specialist workspace', () => {
  const active = nextSpecialistState('creative', {kind: 'creative', open: false});
  assert.equal(active, null);
  assert.deepEqual(specialistVisibility(active), {coding: false, calendar: false, creative: false});
});

test('invalid specialist events cannot corrupt UI state', () => {
  assert.equal(nextSpecialistState('coding', {kind: 'unknown', open: true}), 'coding');
  assert.equal(nextSpecialistState('calendar', {kind: 'calendar', open: 'yes'}), 'calendar');
});
