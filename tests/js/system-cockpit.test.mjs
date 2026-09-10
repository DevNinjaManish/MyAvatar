import test from 'node:test';
import assert from 'node:assert/strict';
import {systemTelemetryState} from '../../src/workspace/system-cockpit.js';

test('system cockpit maps truthful local telemetry and readiness to compact cards',()=>{
  const state=systemTelemetryState({readiness:{overall:'ready',engines:{llm:{state:'ready'},stt:{state:'deferred'},tts:{state:'unavailable'},coding:{state:'deferred'}}},config:{llm:{model:'local/qwen'},performanceProfile:'low'},task:{phase:'VERIFYING',status:'active'},metrics:{cpuPercent:22.4,memory:{usedMb:4096,totalMb:8192,usedPercent:50}}});
  assert.deepEqual(state,{cpu:'22%',memory:'50% used',memoryDetail:'4096 / 8192 MB',model:'local/qwen',performance:'Fast',engines:{llm:'Ready',stt:'Deferred',tts:'Unavailable',coding:'Deferred'},task:'VERIFYING',taskStatus:'active'});
});

test('system cockpit fails closed when optional telemetry is unavailable',()=>{
  const state=systemTelemetryState({readiness:{engines:{}},config:{},task:null});
  assert.equal(state.cpu,'Unavailable');assert.equal(state.memory,'Unavailable');assert.equal(state.engines.coding,'Unknown');assert.equal(state.task,'IDLE');
  assert.equal(systemTelemetryState({metrics:{cpuPercent:NaN,memory:{usedPercent:'not-a-number'}}}).cpu,'Unavailable');
});
