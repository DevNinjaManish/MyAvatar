import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {interactionPresentation} from '../../src/widget/interaction-state.js';

test('offline and limited readiness override normal ready state',()=>{
  assert.equal(interactionPresentation({socketClosed:true}).state,'offline');
  assert.equal(interactionPresentation({readiness:{overall:'unavailable'}}).state,'offline');
  assert.equal(interactionPresentation({readiness:{overall:'degraded'}}).state,'limited');
});

test('approval is distinct from task failure',()=>{
  const approval=interactionPresentation({botId:'robot',task:{phase:'NEEDS_APPROVAL',status:'waiting'},readiness:{overall:'ready'}});
  const blocked=interactionPresentation({botId:'robot',task:{phase:'BLOCKED',status:'blocked'},readiness:{overall:'ready'}});
  assert.equal(approval.state,'awaiting-approval');
  assert.equal(approval.runtime,'APPROVAL');
  assert.equal(blocked.state,'task-blocked');
  assert.equal(blocked.runtime,'ATTENTION');
});

test('live voice state takes precedence over ordinary working state',()=>{
  const model=interactionPresentation({voiceState:'speaking',botId:'robot',task:{phase:'WORKING',status:'active'},readiness:{overall:'ready'}});
  assert.equal(model.state,'speaking');
  assert.equal(model.label,'Speaking');
  assert.equal(model.busy,true);
});

test('Rivet working state is exposed when voice is idle',()=>{
  const model=interactionPresentation({voiceState:'ready',botId:'robot',task:{phase:'VERIFYING',status:'active'},readiness:{overall:'ready'}});
  assert.equal(model.state,'working');
  assert.equal(model.runtime,'WORKING');
});

test('non-Rivet companions do not inherit Rivet task status',()=>{
  const model=interactionPresentation({voiceState:'ready',botId:'nova',task:{phase:'WORKING',status:'active'},readiness:{overall:'ready'}});
  assert.equal(model.state,'ready');
});

test('readiness UI yields compact status ownership after interaction controller mounts',()=>{
  const code=readFileSync(new URL('../../src/conversation/readiness-ui.js',import.meta.url),'utf8');
  assert.match(code,/!win\.__myavatarInteractionState/);
});

test('system cockpit consumes canonical interaction event',()=>{
  const code=readFileSync(new URL('../../src/workspace/system-cockpit.js',import.meta.url),'utf8');
  assert.match(code,/myavatar:interaction-state/);
  assert.match(code,/interaction\?\.runtime/);
});

test('canonical interaction state mounts after readiness UI',()=>{
  const code=readFileSync(new URL('../../src/app/entry.js',import.meta.url),'utf8');
  assert.ok(code.indexOf('mountInteractionState(window,document)')>code.indexOf('mountReadinessUI(window,document)'));
});
