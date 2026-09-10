const ACTION_PATTERNS = [
  /\bbuild\b/i,
  /\btests?\b/i,
  /\bpytest\b/i,
  /\bstatus\b/i,
  /\bgit\s+status\b/i,
  /\bdiff\b/i,
  /\breview\b/i,
  /\bchanges?\b/i,
  /\bcommit\b/i,
  /\bcheckpoint\b/i,
];

export function analyzeAgentBrief(value) {
  const brief = typeof value === 'string' ? value.trim() : '';
  if (!brief) return {kind: 'empty', canRun: false};
  const canRun = ACTION_PATTERNS.some(pattern => pattern.test(brief));
  return canRun
    ? {kind: 'supported', canRun: true}
    : {kind: 'unsupported', canRun: false};
}

export function taskPresentation(detail, awaitingApproval = false) {
  const phase = detail?.phase;
  if (phase === 'NEEDS_APPROVAL') {
    return {awaitingApproval: true, label: 'Awaiting approval', tone: 'warning', retry: false};
  }
  if (awaitingApproval && phase === 'BLOCKED' && detail?.result === 'Task needs attention.') {
    return {awaitingApproval: true, label: 'Awaiting approval', tone: 'warning', retry: false};
  }
  if (phase === 'COMPLETE') return {awaitingApproval: false, label: 'Task completed', tone: 'success', retry: false};
  if (phase === 'CANCELLED') return {awaitingApproval: false, label: 'Task cancelled', tone: 'warning', retry: false};
  if (phase === 'BLOCKED') return {awaitingApproval: false, label: 'Task needs attention', tone: 'error', retry: true};
  return null;
}

/**
 * Thin safety/UX layer around the legacy Rivet panel controller.
 * It prevents unknown natural-language briefs from silently falling back to
 * unrelated test execution and presents a single primary task action.
 */
export function mountAgentUxGuard(win, doc) {
  const $ = id => doc.getElementById(id);
  const run = $('widget-task-run');
  const legacyRun = $('widget-agent-run');
  const brief = $('widget-brief');
  const status = $('widget-brief-status');
  const notice = $('widget-panel-notice');
  const taskState = doc.querySelector('[data-widget-panel="task"] .panel-state');
  const retry = $('widget-task-retry');
  if (!run || !brief) return {dispose() {}};

  // One obvious primary action. Keep the legacy control in the DOM for
  // compatibility with existing code/tests, but remove it from the visual UI.
  run.textContent = 'Run with Rivet';
  run.setAttribute('aria-label', 'Run task with Rivet');
  if (legacyRun) {
    legacyRun.hidden = true;
    legacyRun.setAttribute('aria-hidden', 'true');
    legacyRun.tabIndex = -1;
  }

  const guardRun = event => {
    const analysis = analyzeAgentBrief(brief.value);
    if (analysis.kind !== 'unsupported') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (status) {
      status.textContent = 'Rivet cannot safely execute this task yet. Discuss it in chat or use a supported local action.';
      status.dataset.tone = 'warning';
    }
    if (taskState) taskState.textContent = 'Needs plan';
    if (notice) {
      notice.textContent = 'No command was run. Rivet only executes actions it can map to an explicit local build, test, Git status, diff, or commit step.';
      notice.dataset.tone = 'warning';
    }
  };
  run.addEventListener('click', guardRun, true);
  legacyRun?.addEventListener('click', guardRun, true);

  let awaitingApproval = false;
  const onTask = event => {
    const presentation = taskPresentation(event?.detail, awaitingApproval);
    if (!presentation) return;
    awaitingApproval = presentation.awaitingApproval;
    // The legacy controller publishes a generic BLOCKED event immediately
    // after NEEDS_APPROVAL. Reflect on the next microtask so approval remains
    // the visible state instead of being overwritten as a failure.
    queueMicrotask(() => {
      if (status) {
        status.textContent = presentation.label;
        status.dataset.tone = presentation.tone;
      }
      if (taskState) taskState.textContent = presentation.label;
      if (retry && awaitingApproval) retry.hidden = true;
    });
  };
  win.addEventListener('myavatar:agent-task', onTask);

  return {
    dispose() {
      run.removeEventListener('click', guardRun, true);
      legacyRun?.removeEventListener('click', guardRun, true);
      win.removeEventListener('myavatar:agent-task', onTask);
    },
  };
}
