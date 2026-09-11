import test from 'node:test';
import assert from 'node:assert/strict';
import {BOT_PRESENCE_PROFILES,botPresenceProfile,botStateLabel} from '../../src/widget/bot-presence-profile.js';
import {interactionPresentation} from '../../src/widget/interaction-state.js';

test('all five companions have shared presence profiles',()=>{
  assert.deepEqual(Object.keys(BOT_PRESENCE_PROFILES).sort(),['butler','luma','nova','pixel','robot']);
  for(const profile of Object.values(BOT_PRESENCE_PROFILES)){
    for(const key of ['name','role','ready','listening','thinking','speaking','preparing','limited','offline','motion'])assert.ok(profile[key]);
  }
});

test('Nova uses warmer primary-companion presence language',()=>{
  const nova=botPresenceProfile('nova');
  assert.equal(nova.ready,'Here');
  assert.equal(nova.speaking,'With you');
  assert.equal(nova.motion,'warm');
  assert.equal(botStateLabel('nova','thinking'),'Thinking it through');
});

test('interaction presentation consumes the selected bot profile',()=>{
  const nova=interactionPresentation({botId:'nova',voiceState:'speaking',readiness:{overall:'ready'}});
  const sterling=interactionPresentation({botId:'butler',voiceState:'thinking',readiness:{overall:'ready'}});
  assert.equal(nova.label,'With you');
  assert.equal(nova.profile.name,'Nova');
  assert.equal(sterling.label,'Considering');
  assert.equal(sterling.profile.name,'Sterling');
});

test('unknown bot presence falls back safely to Nova',()=>{
  assert.equal(botPresenceProfile('missing').name,'Nova');
});
