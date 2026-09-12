import test from 'node:test';
import assert from 'node:assert/strict';
import {dualSpeakerLevels,equalizerActive} from '../../src/avatar/speaker-equalizer.js';
import {stateTransitionDuration,motionScaleForState} from '../../src/avatar/state-presence.js';

test('all speaking bots use two amplitude-driven equalizer channels',()=>{
  const result=dualSpeakerLevels(.6,1.25);
  assert.equal(result.left.length,3);assert.equal(result.right.length,3);
  assert.ok(result.left.every(value=>value>0&&value<=1));
  assert.ok(result.right.every(value=>value>0&&value<=1));
  assert.notDeepEqual(result.left,result.right);
});

test('speaker equalizers are dark outside audible speaking',()=>{
  assert.equal(equalizerActive('IDLE',.8),false);
  assert.equal(equalizerActive('LISTENING',.8),false);
  assert.equal(equalizerActive('THINKING',.8),false);
  assert.equal(equalizerActive('SPEAKING',.01),false);
  assert.equal(equalizerActive('SPEAKING',.2),true);
  assert.deepEqual(dualSpeakerLevels(0,10),{left:[0,0,0],right:[0,0,0]});
});

test('reduced motion preserves amplitude feedback without phase animation',()=>{
  const first=dualSpeakerLevels(.5,1,{reducedMotion:true});
  const second=dualSpeakerLevels(.5,20,{reducedMotion:true});
  assert.deepEqual(first,second);
  assert.ok(first.left.some(value=>value>0));
});

test('presence transitions are fastest into speech and reduced motion is immediate',()=>{
  assert.ok(stateTransitionDuration('SPEAKING')<stateTransitionDuration('THINKING'));
  assert.ok(stateTransitionDuration('LISTENING')<stateTransitionDuration('IDLE'));
  assert.equal(stateTransitionDuration('SPEAKING',{reducedMotion:true}),.01);
  assert.ok(motionScaleForState('SPEAKING')>motionScaleForState('IDLE'));
  assert.ok(motionScaleForState('WORKING')>motionScaleForState('SLEEPING'));
  assert.ok(stateTransitionDuration('ERROR')<stateTransitionDuration('RECOVERY'));
  assert.ok(motionScaleForState('PAUSED')<motionScaleForState('WORKING'));
});
