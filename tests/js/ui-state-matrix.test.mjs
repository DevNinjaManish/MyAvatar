import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {interactionPresentation} from '../../src/widget/interaction-state.js';
import {rivetTaskPresentation} from '../../src/widget/rivet-task-presentation.js';

const repo = new URL('../../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, repo), 'utf8');

test('companion interaction state matrix keeps actionable states visible', () => {
  const cases = [
    [{}, {state:'ready', runtime:'LOCAL', busy:false}],
    [{voiceState:'listening'}, {state:'listening', runtime:'LISTENING', busy:true}],
    [{voiceState:'speaking'}, {state:'speaking', runtime:'SPEAKING', busy:true}],
    [{task:{phase:'WORKING',status:'active'},botId:'robot'}, {state:'working', runtime:'WORKING', busy:true}],
    [{task:{phase:'NEEDS_APPROVAL',status:'blocked'},botId:'robot'}, {state:'awaiting-approval', runtime:'APPROVAL', busy:false}],
    [{task:{phase:'BLOCKED',status:'blocked'},botId:'robot'}, {state:'task-blocked', runtime:'ATTENTION', busy:false}],
    [{readiness:{overall:'degraded'}}, {state:'limited', runtime:'LIMITED', busy:false}],
    [{socketClosed:true}, {state:'offline', runtime:'OFFLINE', busy:false}],
  ];
  for (const [input, expected] of cases) {
    const actual = interactionPresentation(input);
    assert.equal(actual.state, expected.state);
    assert.equal(actual.runtime, expected.runtime);
    assert.equal(actual.busy, expected.busy);
  }
});

test('approval and task failures outrank degraded readiness while offline still wins', () => {
  assert.equal(interactionPresentation({readiness:{overall:'degraded'},task:{phase:'NEEDS_APPROVAL',status:'blocked'},botId:'robot'}).state,'awaiting-approval');
  assert.equal(interactionPresentation({readiness:{overall:'degraded'},task:{phase:'BLOCKED',status:'blocked'},botId:'robot'}).state,'task-blocked');
  assert.equal(interactionPresentation({socketClosed:true,task:{phase:'NEEDS_APPROVAL',status:'blocked'},botId:'robot'}).state,'offline');
});

test('Rivet task presentation matrix exposes exactly the contextual action state', () => {
  const working = rivetTaskPresentation({phase:'WORKING',status:'active'});
  assert.equal(working.showStop,true);
  assert.equal(working.showViewChanges,false);
  assert.equal(working.showRetry,false);

  const approval = rivetTaskPresentation({phase:'NEEDS_APPROVAL',status:'blocked'});
  assert.equal(approval.awaitingApproval,true);
  assert.equal(approval.showStop,true);
  assert.equal(approval.tone,'warning');

  const complete = rivetTaskPresentation({phase:'COMPLETE',status:'success'});
  assert.equal(complete.showViewChanges,true);
  assert.equal(complete.showStop,false);

  const blocked = rivetTaskPresentation({phase:'BLOCKED',status:'blocked'});
  assert.equal(blocked.showRetry,true);
  assert.equal(blocked.showStop,false);
});

test('fixed shell contract protects companion geometry across chat and specialist states', () => {
  const css = read('src/styles/widget-stack.css');
  assert.match(css,/--widget-shell-column-width:\s*238px/);
  assert.match(css,/--widget-shell-specialist-width:\s*300px/);
  assert.match(css,/body\.widget\.widget-chat-open #widget-chat \{ display: flex !important; \}/);
  assert.match(css,/body\.widget\.widget-panels-open #widget-coding-panels/);
  assert.match(css,/body\.widget\.widget-calendar-open #widget-mini-calendar/);
  assert.match(css,/body\.widget\.widget-creative-open #widget-creative-workspace/);
  assert.match(css,/body\.widget\.widget-wide-open #widget-code-wing/);
});

test('critical widget surfaces keep accessibility and state hooks required by regression states', () => {
  const html = read('index.html');
  for (const id of ['widget-chat','widget-coding-panels','widget-mini-calendar','widget-creative-workspace','widget-menu','bot-library','widget-code-wing']) {
    assert.match(html,new RegExp(`id="${id}"`));
  }
  assert.match(html,/class="widget-toolbar" role="toolbar"/);
  assert.match(html,/id="widget-chat-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="widget-chat"/);
  assert.match(html,/id="widget-more"[^>]*aria-expanded="false"[^>]*aria-controls="widget-menu"/);
});
