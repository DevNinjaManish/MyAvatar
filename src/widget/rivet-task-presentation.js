export function rivetTaskPresentation(detail = {}) {
  const phase = detail.phase || 'IDLE';
  const status = detail.status || 'idle';
  const working = ['UNDERSTANDING','CONTEXT','PLANNING','WORKING','VERIFYING'].includes(phase) && status === 'active';
  const awaitingApproval = phase === 'NEEDS_APPROVAL';
  const complete = phase === 'COMPLETE' || status === 'success';
  const blocked = phase === 'BLOCKED' || status === 'blocked';
  const cancelled = phase === 'CANCELLED' || status === 'cancelled';
  return {
    phase,
    working,
    awaitingApproval,
    complete,
    blocked,
    cancelled,
    showStop: working || awaitingApproval,
    showViewChanges: complete,
    showRetry: blocked,
    tone: awaitingApproval ? 'warning' : blocked ? 'error' : complete ? 'success' : cancelled ? 'warning' : working ? 'active' : 'idle',
    label: awaitingApproval ? 'Awaiting approval' : blocked ? 'Needs attention' : complete ? 'Completed' : cancelled ? 'Cancelled' : working ? 'Working' : 'Ready',
  };
}

export function mountRivetTaskPresentation(win, doc) {
  const $ = id => doc.getElementById(id);
  const root = $('widget-coding-panels');
  if (!root) return {dispose() {}};

  const run = $('widget-task-run');
  const cancel = $('widget-task-cancel');
  const retry = $('widget-task-retry');
  const discuss = $('widget-brief-to-chat');
  const trusted = $('widget-trusted-mode');
  const brief = $('widget-brief');
  const quickActions = root.querySelector('.quick-actions');
  const quickButtons = quickActions ? [...quickActions.querySelectorAll('[data-quick-task]')] : [];

  if (quickActions) {
    quickButtons.forEach((button, index) => {
      button.hidden = index > 1;
    });
    const label = quickActions.querySelector('.quick-actions-label');
    if (label) label.textContent = 'Quick start';
  }

  if (trusted) {
    trusted.textContent = 'Approvals: On';
    trusted.setAttribute('aria-label', 'Toggle command approvals');
  }

  let viewChanges = $('widget-view-changes');
  if (!viewChanges && run?.parentElement) {
    viewChanges = doc.createElement('button');
    viewChanges.id = 'widget-view-changes';
    viewChanges.type = 'button';
    viewChanges.textContent = 'View changes';
    viewChanges.hidden = true;
    run.parentElement.append(viewChanges);
    viewChanges.addEventListener('click', () => $('widget-open-diff')?.click());
  }

  const apply = detail => {
    const state = rivetTaskPresentation(detail);
    const locked = state.working || state.awaitingApproval;
    root.dataset.taskTone = state.tone;
    root.dataset.taskPhase = state.phase;
    root.setAttribute('aria-busy', String(state.working));
    if (cancel) {
      cancel.hidden = !state.showStop;
      cancel.textContent = state.awaitingApproval ? 'Cancel' : 'Stop';
    }
    if (viewChanges) viewChanges.hidden = !state.showViewChanges;
    if (retry) retry.hidden = !state.showRetry;
    if (run) run.hidden = locked;
    if (discuss) discuss.hidden = locked;
    quickButtons.forEach(button => { button.disabled = locked; });
    if (trusted) trusted.disabled = locked;
    if (brief) brief.readOnly = locked;
  };

  const onTask = event => apply(event?.detail || {});
  win.addEventListener('myavatar:agent-task', onTask);
  apply({});

  return {dispose() { win.removeEventListener('myavatar:agent-task', onTask); }};
}
