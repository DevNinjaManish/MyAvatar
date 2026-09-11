import test from 'node:test';
import assert from 'node:assert/strict';
import {inputLevel} from '../../src/audio/engine.js';
import {clampMicLevel,motionTuning,presenceStateFromEvent,thinkingProfile,transitionPhase} from '../../src/avatar/presence-orchestrator.js';

test('microphone energy is finite bounded and independent from playback amplitude',()=>{
  assert.equal(inputLevel(new Float32Array([0,0,0])),0);
  const level=inputLevel(new Float32Array([.05,-.05,.05,-.05]));
  assert.ok(level>0&&level<=1);
  assert.equal(inputLevel(new Float32Array([NaN,Infinity])),0);
});

test('listening energy clamps invalid values closed',()=>{
  assert.equal(clampMicLevel(-1),0);
  assert.equal(clampMicLevel(NaN),0);
  assert.equal(clampMicLevel(.4),.4);
  assert.equal(clampMicLevel(9),1);
});

test('presence runtime follows notice think answer states without accepting arbitrary state text',()=>{
  let state='IDLE';
  state=presenceStateFromEvent({type:'state',state:'LISTENING'},state);assert.equal(state,'LISTENING');
  state=presenceStateFromEvent({type:'state',state:'THINKING'},state);assert.equal(state,'THINKING');
  state=presenceStateFromEvent({type:'audio'},state);assert.equal(state,'SPEAKING');
  state=presenceStateFromEvent({type:'state',state:'SECRET_REASONING'},state);assert.equal(state,'SPEAKING');
  state=presenceStateFromEvent({type:'error'},state);assert.equal(state,'IDLE');
});

test('all five bots have distinct authored thinking profiles where intended',()=>{
  assert.equal(thinkingProfile('robot'),'rivet');
  assert.equal(thinkingProfile('nova'),'nova');
  assert.equal(thinkingProfile('butler'),'sterling');
  assert.equal(thinkingProfile('pixel'),'pixel');
  assert.equal(thinkingProfile('luma'),'luma');
  assert.equal(thinkingProfile('../unknown'),'nova');
});

test('shared lifecycle adds attention onset and post-speech settling without inventing new backend states',()=>{
  assert.equal(transitionPhase('IDLE','LISTENING'),'attentive');
  assert.equal(transitionPhase('SPEAKING','IDLE'),'settling');
  assert.equal(transitionPhase('LISTENING','THINKING'),'active');
  assert.equal(transitionPhase('THINKING','SPEAKING'),'active');
});

test('motion tuning is personality-specific and Nova settles warmly rather than snapping idle',()=>{
  const nova=motionTuning('nova');
  const sterling=motionTuning('butler');
  const pixel=motionTuning('pixel');
  const luma=motionTuning('luma');
  const rivet=motionTuning('robot');
  assert.equal(nova.motion,'warm');
  assert.equal(sterling.motion,'composed');
  assert.equal(pixel.motion,'snappy');
  assert.equal(luma.motion,'calm');
  assert.equal(rivet.motion,'mechanical');
  assert.ok(nova.settleMs>pixel.settleMs);
  assert.ok(nova.listenScale>sterling.listenScale);
  assert.ok(pixel.attentionMs<nova.attentionMs);
});
