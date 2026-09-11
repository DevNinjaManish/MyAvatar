import assert from 'node:assert/strict';
import test from 'node:test';
import {createDelegationEnvelope,createRuntimeEvent,isRuntimeEvent} from '../../src/runtime/contracts.js';
import {detectPerformanceProfile,hardwareSummary,PERFORMANCE_PROFILES} from '../../src/runtime/profiles.js';
import {ProviderRegistry,createFakeProvider} from '../../src/runtime/providers.js';

test('runtime events have a typed identity and reject unknown types',()=>{
  const event=createRuntimeEvent('readiness',{readiness:'ready'},{sessionId:'s1',sequence:1,botId:'nova'});
  assert.equal(isRuntimeEvent(event),true);
  assert.throws(()=>createRuntimeEvent('made_up',{}, {sessionId:'s1',sequence:2,botId:'nova'}),/Unknown runtime event/);
  assert.equal(isRuntimeEvent({...event,sequence:0}),false);
});

test('delegation envelopes are scoped and cannot self-loop',()=>{
  const envelope=createDelegationEnvelope({requestingBot:'nova',specialistBot:'rivet',goal:'Inspect the project',permissions:['project:read']});
  assert.deepEqual(envelope.contextRefs,[]);
  assert.throws(()=>createDelegationEnvelope({requestingBot:'nova',specialistBot:'nova',goal:'loop'}),/cannot delegate/);
});

test('automatic performance selection stays conservative',()=>{
  assert.equal(detectPerformanceProfile({arch:'x64',totalMemoryBytes:32*1024**3}),PERFORMANCE_PROFILES.FAST);
  assert.equal(detectPerformanceProfile({arch:'arm64',totalMemoryBytes:16*1024**3}),PERFORMANCE_PROFILES.BALANCED);
  assert.equal(detectPerformanceProfile({requested:'fast',arch:'arm64',totalMemoryBytes:64*1024**3}),PERFORMANCE_PROFILES.FAST);
  assert.equal(hardwareSummary({arch:'x64',totalMemoryBytes:8*1024**3}).supportedArchitecture,true);
});

test('provider registry allows model/runtime swapping without caller changes',async()=>{
  const registry=new ProviderRegistry();
  const provider=createFakeProvider({name:'fake',respond:async()=>({text:'ok'})});
  registry.register('conversation','fake',provider);
  assert.equal(registry.has('conversation','fake'),true);
  assert.deepEqual(registry.list('conversation'),['fake']);
  assert.deepEqual(await registry.get('conversation','fake').respond(),{text:'ok'});
  assert.throws(()=>registry.register('conversation','fake',provider),/already registered/);
});
