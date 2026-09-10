import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeAgentBrief, taskPresentation} from '../../src/widget/agent-ux-guard.js';

test('unknown natural-language briefs do not silently run fallback commands', () => {
  assert.deepEqual(analyzeAgentBrief('Make the robot eyes look nicer'), {kind: 'unsupported', canRun: false});
  assert.deepEqual(analyzeAgentBrief(''), {kind: 'empty', canRun: false});
});

test('explicit local actions remain runnable', () => {
  for (const brief of [
    'Run tests',
    'Build app',
    'Check git status',
    'Review changes and show diff',
    'Commit approved changes',
  ]) {
    assert.equal(analyzeAgentBrief(brief).canRun, true, brief);
  }
});

test('approval is presented as waiting rather than failure', () => {
  const pending = taskPresentation({phase: 'NEEDS_APPROVAL'}, false);
  assert.deepEqual(pending, {
    awaitingApproval: true,
    label: 'Awaiting approval',
    tone: 'warning',
    retry: false,
  });

  const legacyBlocked = taskPresentation({phase: 'BLOCKED', result: 'Task needs attention.'}, true);
  assert.equal(legacyBlocked.awaitingApproval, true);
  assert.equal(legacyBlocked.label, 'Awaiting approval');
  assert.equal(legacyBlocked.retry, false);
});

test('real failures and terminal states clear approval mode', () => {
  assert.equal(taskPresentation({phase: 'BLOCKED', blocker: 'Tests failed'}, false).tone, 'error');
  assert.equal(taskPresentation({phase: 'COMPLETE'}, true).awaitingApproval, false);
  assert.equal(taskPresentation({phase: 'CANCELLED'}, true).awaitingApproval, false);
});
