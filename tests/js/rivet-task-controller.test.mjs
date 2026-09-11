import test from 'node:test';
import assert from 'node:assert/strict';
import {
  planRivetBrief,
  initialRivetTask,
  markAwaitingApproval,
  markStepComplete,
  markTaskFailed,
  markTaskCancelled,
  taskSteps,
  rivetStepLabel,
} from '../../src/widget/rivet-task-controller.js';

test('unsupported natural-language tasks do not invent a fallback command', () => {
  assert.deepEqual(planRivetBrief('Make the robot eyes look nicer'), []);
});

test('Rivet approval labels describe actions instead of internal step IDs',()=>{
  assert.equal(rivetStepLabel('gitCommit'),'Commit the approved changes');
  assert.equal(rivetStepLabel('unknown'),'Run a bounded local step');
});

test('supported briefs map only to explicit bounded local steps', () => {
  assert.deepEqual(planRivetBrief('Build app, run Python tests, then review changes'), [
    {kind:'build'},
    {kind:'testPy'},
    {kind:'gitDiff'},
  ]);
});

test('approval pauses without marking the task failed', () => {
  let task = initialRivetTask('task-1', 'Build app', [{kind:'build'},{kind:'gitStatus'}]);
  task = markAwaitingApproval(task);
  assert.equal(task.awaitingApproval, true);
  assert.equal(task.failed, false);
  assert.equal(task.cursor, 0);
  assert.equal(task.phase, 'NEEDS_APPROVAL');
  assert.equal(taskSteps(task)[0].status, 'waiting');
});

test('approved step resumes the same task at the next cursor', () => {
  let task = initialRivetTask('task-1', 'Build app then status', [{kind:'build'},{kind:'gitStatus'}]);
  task = markAwaitingApproval(task);
  const sameId = task.id;
  task = {...task, awaitingApproval:false, phase:'WORKING', status:'active'};
  task = markStepComplete(task);
  assert.equal(task.id, sameId);
  assert.equal(task.cursor, 1);
  assert.equal(task.failed, false);
  assert.equal(task.phase, 'WORKING');
  assert.equal(taskSteps(task)[0].status, 'complete');
  assert.equal(taskSteps(task)[1].status, 'active');
});

test('completion happens only after the final cursor advances', () => {
  let task = initialRivetTask('task-2', 'Status', [{kind:'gitStatus'}]);
  task = markStepComplete(task);
  assert.equal(task.cursor, 1);
  assert.equal(task.phase, 'COMPLETE');
  assert.equal(task.status, 'success');
});

test('failure and cancellation are distinct terminal states', () => {
  const base = initialRivetTask('task-3', 'Build', [{kind:'build'}]);
  const failed = markTaskFailed(base);
  const cancelled = markTaskCancelled(base);
  assert.equal(failed.phase, 'BLOCKED');
  assert.equal(failed.failed, true);
  assert.equal(failed.cancelled, false);
  assert.equal(cancelled.phase, 'CANCELLED');
  assert.equal(cancelled.cancelled, true);
  assert.equal(cancelled.failed, false);
});
