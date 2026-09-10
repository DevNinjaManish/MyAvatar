import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationPhaseFromEvent,quickActionsForBot,safeConversationPhase,phaseLabel} from '../../src/conversation/interaction-intelligence.js';

test('conversation phase follows only authored runtime milestones',()=>{
  let phase='idle';
  phase=conversationPhaseFromEvent({type:'state',state:'THINKING'},phase);assert.equal(phase,'thinking');
  phase=conversationPhaseFromEvent({type:'token',text:'secret raw text must not become a phase'},phase);assert.equal(phase,'writing');
  phase=conversationPhaseFromEvent({type:'audio'},phase);assert.equal(phase,'speaking');
  phase=conversationPhaseFromEvent({type:'state',state:'SECRET_REASONING'},phase);assert.equal(phase,'speaking');
  phase=conversationPhaseFromEvent({type:'error',message:'private log'},phase);assert.equal(phase,'failed');
});

test('shared agent phases map to authored UI labels',()=>{
  assert.equal(conversationPhaseFromEvent({type:'agent_state',agentState:{phase:'PLANNING'}}),'planning');
  assert.equal(phaseLabel('verifying'),'Verifying…');
  assert.equal(safeConversationPhase('NEEDS_APPROVAL'.toLowerCase()),'needs_approval');
});

test('safe conversation phase rejects arbitrary strings',()=>{
  assert.equal(safeConversationPhase('thinking'),'thinking');
  assert.equal(safeConversationPhase('speaking'),'speaking');
  assert.equal(safeConversationPhase('chain-of-thought'),'idle');
  assert.equal(safeConversationPhase('../secret'),'idle');
});

test('long-running labels stay authored and phase-bound',()=>{
  assert.equal(phaseLabel('thinking'),'Thinking…');
  assert.equal(phaseLabel('thinking',{longRunning:true}),'Still thinking locally…');
  assert.equal(phaseLabel('writing',{longRunning:true}),'Still preparing reply…');
  assert.equal(phaseLabel('speaking',{longRunning:true}),'Speaking');
  assert.equal(phaseLabel('secret',{longRunning:true}),'Ready');
});

test('all five bots have three concise non-authoritative quick prompts',()=>{
  for(const bot of ['robot','nova','butler','pixel','luma']){
    const actions=quickActionsForBot(bot);
    assert.equal(actions.length,3);
    assert.ok(actions.every(action=>action.label.length>0&&action.label.length<24));
    assert.ok(actions.every(action=>action.prompt.length>0&&action.prompt.length<180));
  }
  assert.notDeepEqual(quickActionsForBot('robot'),quickActionsForBot('pixel'));
});

test('quick prompts can carry bounded current focus without changing labels',()=>{
  const focus='Launch the new landing page and decide which CTA should be primary';
  const actions=quickActionsForBot('pixel',{focus});
  assert.equal(actions.length,3);
  assert.ok(actions.every(action=>action.prompt.includes('Current focus:')));
  assert.ok(actions.every(action=>action.prompt.includes(focus)));
  const long=quickActionsForBot('nova',{focus:'x'.repeat(500)});
  assert.ok(long.every(action=>action.prompt.length<340));
});

test('recently used quick prompts are suppressed until all choices are exhausted',()=>{
  const first=quickActionsForBot('nova');
  const next=quickActionsForBot('nova',{excludeLabels:[first[0].label,first[1].label]});
  assert.deepEqual(next.map(item=>item.label),[first[2].label]);
  const reset=quickActionsForBot('nova',{excludeLabels:first.map(item=>item.label)});
  assert.equal(reset.length,3);
});

test('unknown bot falls back to safe Nova prompts',()=>{
  assert.deepEqual(quickActionsForBot('unknown'),quickActionsForBot('nova'));
});
