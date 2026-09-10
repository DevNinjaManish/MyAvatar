import test from 'node:test';
import assert from 'node:assert/strict';
import {IdlePresence} from '../../src/avatar/idle-presence.js';

test('idle presence stays quiet until the user has been inactive long enough',()=>{
  const idle=new IdlePresence({idleMs:30000,minimumGapMs:45000});
  idle.activity(1000);
  assert.equal(idle.reaction(20000),null);
  const reaction=idle.reaction(31000);
  assert.equal(reaction.botId,'nova');
  assert.equal(reaction.emotion,'curious');
});

test('busy bot states never trigger idle reactions',()=>{
  const idle=new IdlePresence({idleMs:1000,minimumGapMs:1000});
  idle.activity(0);idle.updateRuntime({type:'state',state:'SPEAKING',botId:'pixel'},0);
  assert.equal(idle.reaction(5000),null);
  idle.updateRuntime({type:'state',state:'IDLE',botId:'pixel'},5000);
  assert.equal(idle.reaction(5001)?.botId,'pixel');
});

test('idle reactions are rate limited and user activity postpones the next one',()=>{
  const idle=new IdlePresence({idleMs:1000,minimumGapMs:5000});
  idle.activity(0);assert.ok(idle.reaction(1000));assert.equal(idle.reaction(3000),null);
  idle.activity(4000);assert.equal(idle.reaction(4500),null);assert.ok(idle.reaction(6000));
});

test('bot identity changes alter the subtle idle emotion without text generation',()=>{
  const idle=new IdlePresence({idleMs:0,minimumGapMs:0});
  idle.updateRuntime({type:'config',botId:'butler'},0);assert.equal(idle.reaction(0)?.emotion,'relaxed');
  idle.updateRuntime({type:'config',botId:'pixel'},1);assert.equal(idle.reaction(1)?.emotion,'curious');
});
