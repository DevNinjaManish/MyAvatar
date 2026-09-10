import test from 'node:test';
import assert from 'node:assert/strict';
import {readinessPresenceState} from '../../src/avatar/readiness-presence.js';

test('readiness presence maps startup lifecycle to authored companion states',()=>{
  assert.equal(readinessPresenceState().state,'sleeping');
  assert.equal(readinessPresenceState({overall:'preparing'}).state,'charging');
  assert.equal(readinessPresenceState({overall:'ready'}).state,'ready');
  assert.equal(readinessPresenceState({overall:'degraded'}).state,'limited');
  assert.equal(readinessPresenceState({overall:'unavailable'}).state,'broken');
});

test('readiness presence handles runtime failure and disconnect safely',()=>{
  assert.equal(readinessPresenceState({},'setup_error').label,'Needs attention');
  assert.equal(readinessPresenceState({},'socket_close').label,'Powered down');
  assert.equal(readinessPresenceState({overall:'ready'},'error').state,'broken');
});
