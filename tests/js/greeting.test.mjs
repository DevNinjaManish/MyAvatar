import test from 'node:test';
import assert from 'node:assert/strict';
import {contextualGreeting} from '../../src/conversation/greeting.js';

test('greeting reflects the local time of day',()=>{
  assert.match(contextualGreeting({now:new Date('2026-09-13T08:00:00')}),/Good morning|Hello this morning/);
});

test('greeting can resume a concise prior topic',()=>{
  assert.match(contextualGreeting({now:new Date('2026-09-13T18:00:00'),recentTopic:'voice latency tuning'}),/voice latency tuning/);
});

test('greeting avoids the supplied previous phrasing',()=>{
  const first=contextualGreeting({now:new Date('2026-09-13T14:00:00')});
  assert.notEqual(contextualGreeting({now:new Date('2026-09-13T14:00:00'),previousGreeting:first}),first);
});
