import {readPanelPreferences, reducePanelState, savePanelPreferences} from './panel-model.js';

/** Copying a task brief must not destroy an unsent conversation draft. */
export function prepareBriefTransfer(brief, chatDraft, limit = 2000) {
  const text = typeof brief === 'string' ? brief.trim() : '';
  const draft = typeof chatDraft === 'string' ? chatDraft.trim() : '';
  if (!text) return {kind: 'empty'};
  if (!Number.isInteger(limit) || limit < 1 || text.length > limit) return {kind: 'too-long'};
  if (draft && draft !== text) return {kind: 'conflict'};
  return {kind: 'ready', text};
}

/** Arrow navigation applies only to focused disclosure headers, never the editor. */
export function disclosureFocusIndex(key, index, count) {
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(index) || index < 0 || index >= count) return null;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowDown') return (index + 1) % count;
  if (key === 'ArrowUp') return (index - 1 + count) % count;
  return null;
}

const KNOWN_COMMANDS = {
  build: {kind: 'build'},
  test: {kind: 'test'},
  testJs: {kind: 'testJs'},
  testPy: {kind: 'testPy'},
};
const KNOWN_QUERIES = {
  gitStatus: {kind: 'gitStatus', panel: 'diff', fallback: 'No changes detected.'},
  gitDiff: {kind: 'gitDiff', panel: 'diff', fallback: 'No diff output available.'},
  gitBranch: {kind: 'gitBranch', panel: 'diff', fallback: 'Branch unknown.'},
};
const planFromBrief = brief => {
  const text=(typeof brief==='string'?brief:'').toLowerCase();
  if(!text) return [];
  const include=(token=>text.includes(token));
  const steps=[];
  if (include('build')) steps.push({kind:'build',label:'Build',resultKey:'build'});
  if (include('test') || include('tests')) {
    if (include('python') || include('pytest')) steps.push({kind:'testPy',label:'Python tests',resultKey:'testPy'});
    else if (include('javascript') || include('js')) steps.push({kind:'testJs',label:'JavaScript tests',resultKey:'testJs'});
    else steps.push({kind:'test',label:'JavaScript tests',resultKey:'test'});
  }
  if (include('check status') || include('status') || include('git status')) steps.push({kind:'gitStatus',label:'Git status',resultKey:'gitStatus'});
  if (include('diff') || include('review') || include('changes')) steps.push({kind:'gitDiff',label:'Git diff',resultKey:'gitDiff'});
  if (steps.length===0) steps.push({kind:'test',label:'JavaScript tests',resultKey:'test'});
  const shouldCommit = include('commit') || include('checkpoint');
  return shouldCommit ? [...steps,{kind:'gitCommit',label:'Commit',resultKey:'gitCommit',autoMessage:brief}] : steps;
};
export function agentPlanSteps(plan = []) {
  const labels = {build: 'Build project', test: 'Run JavaScript tests', testJs: 'Run JavaScript tests', testPy: 'Run Python tests', gitStatus: 'Read Git status', gitDiff: 'Read Git diff', gitCommit: 'Commit approved changes'};
  return plan.map((step, index) => ({id: `step-${index + 1}`, label: labels[step.kind] || 'Local step', status: 'pending'}));
}
const verificationKinds = new Set(['build','test','testJs','testPy']);
export function agentStepVerification(step, output) {
  if (!verificationKinds.has(step?.kind)) return null;
  const ok = output?.ok === true;
  return {status: ok ? 'passed' : 'failed', ok, checks: [{id: step.kind, ok}], message: ok ? `${step.kind} completed.` : `${step.kind} reported a failure.`};
}
export function agentStepObservation(step, output) {
  const label = step?.kind === 'gitDiff' ? 'Read-only diff' : (step?.kind || 'Local step');
  return output?.ok === false ? `${label} failed.` : `${label} completed.`;
}
const toCommandLine = id => {
  const request = KNOWN_COMMANDS[id];
  return request ? request.kind : null;
};

/** Attached panels now support a local coding action pipeline.
 * Actions are validated server-side in Electron and run from an allowlist.
 */
export function mountWidgetPanels(doc, desktop) {
  const win = doc.defaultView, $ = id => doc.getElementById(id);
  const runAgentAction = async request => {
    if (!desktop?.runAgentCommand) return {ok: false, error: 'Coding executor is unavailable in this build.'};
    return desktop.runAgentCommand(request);
  };
  const runAgentQuery = async request => {
    if (!desktop?.runAgentQuery) return {ok: false, error: 'Query bridge is unavailable in this build.'};
    return desktop.runAgentQuery(request);
  };

  let storage;
  try { storage = win.localStorage; } catch { /* Optional preferences. */ }
  let state = readPanelPreferences(storage), request = 0, selecting = false;
  let trustedMode = false;
  let pendingAction = null;
  let activeProject = $('widget-project-name')?.textContent?.trim() || 'Local workspace';
  let agentRunning = false;
  let taskCancelled = false;
  let taskFailed = false;
  let activeTaskId = null;
  let lastTaskBrief = '';

  const abort = new AbortController(), signal = abort.signal;
  const on = (element, event, callback, options = {}) => element.addEventListener(event, callback, {...options, signal});
  const cards = [...doc.querySelectorAll('[data-widget-panel]')];
  const report = (text, tone = 'info') => {
    if (signal.aborted) return;
    $('widget-panel-notice').textContent = text;
    $('widget-panel-notice').dataset.tone = tone;
  };
  const setNeedApprove = visible => {
    if (!visible) {
      pendingAction = null;
      $('widget-command-approve')?.setAttribute('hidden', '');
      $('widget-command-cancel')?.setAttribute('hidden', '');
      $('widget-run-command')?.removeAttribute('disabled');
      updateWingFooter('Waiting');
      return;
    }
    $('widget-command-approve')?.removeAttribute('hidden');
    $('widget-command-cancel')?.removeAttribute('hidden');
    $('widget-run-command')?.setAttribute('disabled', 'true');
    updateWingFooter('Approval required');
  };
  const updateWingFooter = status => {
    const footer = $('widget-wing-footer');
    if (!footer) return;
    const pending = pendingAction ? 'pending approval' : 'no pending approval';
    const tail = status ? ` · ${status}` : '';
    footer.textContent = `Project: ${activeProject} · ${pending}${tail}`;
  };
  const setProject = name => {
    activeProject = (typeof name === 'string' && name.trim()) ? name.trim() : 'Local workspace';
    $('widget-project-name').textContent = activeProject;
    $('widget-project-name').title = activeProject;
    updateWingFooter('Project selected');
  };
  const syncProjectState = async () => {
    if (!desktop?.getAgentProject) return;
    const result = await desktop.getAgentProject();
    if (signal.aborted || !result?.ok || !result.project?.name) return;
    setProject(result.project.name);
    $('widget-files-empty').textContent = 'Workspace connected. Actions run only in this local project.';
    report(`Workspace ready: ${result.project.name}. Start with a quick action.`);
    doc.querySelector('[data-widget-panel="changes"] .panel-state').textContent = 'Ready';
    doc.querySelector('[data-widget-panel="terminal"] .panel-state').textContent = trustedMode ? 'Trusted' : 'Strict';
  };
  const refreshGitSummary = async () => {
    const status = await runAgentQuery({kind: 'gitStatus'});
    const branch = await runAgentQuery({kind: 'gitBranch'});
    if (status?.ok || branch?.ok) {
      const statusText = status.ok ? (status.stdout || statusTextFallback(status)) : (status.error || 'git status failed.');
      const branchText = branch.ok ? (branch.stdout || '') : '';
      $('widget-diff-status').textContent = `Branch: ${branchText || 'unknown'} · ${statusText || 'No git change summary available.'}`;
      $('widget-diff-body').querySelector('.panel-actions')?.removeAttribute('disabled');
      $('widget-terminal-command')?.setAttribute('aria-describedby', 'widget-diff-status');
    }
    if (!signal.aborted) render();
  };
  const statusTextFallback = result => (result?.stderr ? result.stderr : 'No pending changes.');
  const setTrustLabel = () => {
    const label = trustedMode ? 'Trusted mode' : 'Strict mode';
    $('widget-trusted-mode').textContent = label + (trustedMode ? ' · approvals auto-skipped' : ' · approvals required');
    $('widget-trusted-mode').setAttribute('aria-pressed', String(trustedMode));
    $('widget-trusted-mode').title = trustedMode
      ? 'Trusted mode is enabled for the current session.'
      : 'Strict mode is enabled for the current session.';
  };
  const maybeEnableCommand = ()=>{
    $('widget-run-command').disabled = false;
  };
  const isWidget = () => doc.body.classList.contains('widget');
  const setLayout = layout => {
    if (!layout?.bounds || !['none', 'left', 'right', 'inline'].includes(layout.side)) return;
    doc.body.dataset.panelSide = layout.side;
    doc.body.style.setProperty('--widget-offset', `${Number(layout.offset) || 0}px`);
    doc.body.style.setProperty('--widget-wing-width', `${Number(layout.wingWidth) || 0}px`);
  };

  const render = async () => {
    const visible = state.open && isWidget();
    doc.body.classList.toggle('widget-panels-open', visible);
    doc.body.classList.toggle('widget-wide-open', visible && !!state.wide);
    $('widget-coding-panels').hidden = !visible;
    $('widget-code-wing').hidden = !visible || !state.wide;
    $('widget-coding-tools').setAttribute('aria-expanded', String(visible));
    $('widget-coding-tools').title = visible ? 'Collapse coding tools' : 'Open coding tools';
    $('widget-coding-tools').setAttribute('aria-label', $('widget-coding-tools').title);
    $('widget-panels-collapse').disabled = !state.expanded.length;

    cards.forEach(card => {
      const id = card.dataset.widgetPanel;
      const expanded = state.expanded.includes(id);
      card.querySelector('[data-panel-toggle]').setAttribute('aria-expanded', String(expanded));
      card.querySelector('.widget-panel-body').hidden = !expanded;
      card.dataset.expanded = String(expanded);
    });

    const fileView = state.wide === 'changes';
    const calendarView = state.wide === 'calendar';
    document.body.dataset.attachedWorkspace = state.wide || '';
    $('widget-wing-title').textContent = calendarView ? 'Nova · Calendar' : (fileView ? 'Files / Changes' : 'Git / Diff');
    const empty = doc.querySelector('.widget-wing-empty');
    const title = doc.createElement('strong');
    title.textContent = calendarView ? 'Upcoming events' : (fileView ? 'No files loaded yet' : 'No diff to review yet');
    const detail = calendarView
      ? 'Your Mac Calendar events appear here without moving the agent.'
      : fileView
      ? 'Folder changes are summarized in the terminal panel and copied from approved local actions.'
      : 'Git inspection is connected to the local repository from this app path.';
    empty.replaceChildren(title, doc.createTextNode(detail));
    $('widget-wing-close').setAttribute('aria-label', calendarView ? 'Close calendar' : (fileView ? 'Collapse expanded file view' : 'Collapse expanded diff view'));
    $('widget-wing-close').title = $('widget-wing-close').getAttribute('aria-label');

    try {
      const status = await runAgentQuery({kind: 'gitStatus'});
      const branch = await runAgentQuery({kind: 'gitBranch'});
      if (status?.ok && branch?.ok) {
        const statusText = status.stdout?.trim() || 'Clean working tree.';
        const branchText = branch.stdout?.trim() || 'unknown';
        doc.querySelector('[data-widget-panel="diff"] .panel-state').textContent = 'Ready';
        $('widget-diff-status').textContent = `Branch ${branchText}: ${statusText}`;
        $('widget-commit').disabled = !trustedMode && !!statusText && !trustedMode;
      }
    } catch {
      doc.querySelector('[data-widget-panel="diff"] .panel-state').textContent = 'Unavailable';
    }
    if (state.open) {
      maybeEnableCommand();
      setTrustLabel();
    }
  };

  const resize = async () => {
    const current = ++request;
    if (!desktop?.widgetPanels || !isWidget()) return;
    try {
      const result = await desktop.widgetPanels({open: state.open, wide: !!state.wide});
      if (signal.aborted || current !== request) return;
      if (result?.ok === false) throw Error(result.error || 'Panel layout is unavailable.');
      setLayout(result);
    } catch (error) {
      if (current === request) report(`Could not resize the widget: ${error.message}`, 'error');
    }
  };

  const dispatch = action => {
    state = reducePanelState(state, action);
    savePanelPreferences(storage, state);
    render();
    void resize();
  };
  const closeMenus = () => {
    if (!$('widget-menu').hidden) $('menu-close').click();
    if (!$('bot-library').hidden) $('library-close').click();
  };

  const runCommandNow = async request => {
    const output = await runAgentAction(request);
    if (output?.ok) {
      $('widget-terminal-output').textContent = output.stdout || '(Command completed with empty output.)';
      report(`Command ${request.kind || request.id || 'unknown'} completed.`);
    } else {
      const timedOut = output?.code === 'ETIMEDOUT' || /timed out/i.test(output?.error || '');
      const message = timedOut
        ? 'This command took too long and was stopped. Try a smaller task.'
        : (output?.error || 'Unknown error');
      report(`Command failed: ${message}`,'error');
      $('widget-terminal-output').textContent = output?.stderr || message;
    }
    const actionLabel = request.kind || request.id || 'command';
    updateWingFooter(`Last action: ${actionLabel} ${output?.ok ? 'succeeded' : 'failed'}`);
    maybeEnableCommand();
    setNeedApprove(false);
    void refreshGitSummary();
    return output;
  };

  const queueAction = async request => {
    if (!request) return;
    if (trustedMode) return runCommandNow(request);
    pendingAction = request;
    report(`Pending approval: ${request.kind || request.id || 'command'} ready to run.` , 'warning');
    setNeedApprove(true);
    return null;
  };

  const executeApproved = async () => {
    if (!pendingAction) return;
    $('widget-run-command').setAttribute('disabled', 'true');
    report('Running approved command…', 'info');
    await runCommandNow(pendingAction);
    pendingAction = null;
  };
  const runAgentPlan = async () => {
    const brief = $('widget-brief').value.trim();
    if (!brief) return;
    if (!trustedMode) {
      trustedMode = true;
      $('widget-trusted-mode').setAttribute('aria-pressed', 'true');
      setTrustLabel();
      report('Auto-enabled trusted mode for local agent execution.', 'warning');
    }
    if (agentRunning) return;
    agentRunning = true;
    taskCancelled = false;
    taskFailed = false;
    lastTaskBrief = brief;
    activeTaskId = globalThis.crypto?.randomUUID?.() || `task-${Date.now()}`;
    $('widget-task-cancel').hidden = false;
    $('widget-task-retry').hidden = true;
    $('widget-task-run').disabled = true;
    $('widget-agent-run').disabled = true;
    const plan = planFromBrief(brief).map(step => ({
      kind: step.kind,
      commitMessage: step.kind === 'gitCommit'
        ? `coding agent: ${step.autoMessage.slice(0, 96).trim() || 'local update'}`
        : undefined
    }));
    if (!plan.length) {
      agentRunning = false;
      report('No local action plan could be built from this brief.', 'warning');
      return;
    }
    const taskSteps = agentPlanSteps(plan);
    const publishTask = (phase, status = 'active', extra = {}) => win.dispatchEvent(new win.CustomEvent('myavatar:agent-task', {detail: {
      id: activeTaskId, botId: 'robot', goal: brief, phase, status, steps: taskSteps.map(step => ({...step})), ...extra
    }}));
    publishTask('UNDERSTANDING');
    publishTask('CONTEXT', 'active', {observation: 'Using the selected local project context.'});
    publishTask('PLANNING');
    for (const [index, step] of plan.entries()) {
      if (!agentRunning || taskCancelled) break;
      taskSteps[index].status = 'active';
      publishTask('WORKING');
      const requestLabel = step.kind === 'gitStatus' || step.kind === 'gitDiff'
        ? KNOWN_QUERIES[step.kind]?.kind || step.kind
        : step.kind;
      if (step.kind === 'gitDiff') {
        const result = await runAgentQuery({...step, taskId: activeTaskId});
        if (!result?.ok) {
          taskSteps[index].status = 'blocked';
          publishTask('BLOCKED', 'blocked', {blocker: result?.error || 'Read-only observation failed.'});
          taskFailed = true;
          report(`Step ${step.kind} failed: ${result?.error || 'unknown'}`, 'error');
          break;
        }
        const wing = $('widget-code-wing').querySelector('.widget-wing-content');
        if (wing) { const pre=doc.createElement('pre');pre.textContent = result.stdout || '(No diff output.)';wing.innerHTML='';wing.append(pre); }
        updateWingFooter(`Local agent step: ${requestLabel} loaded`);
        doc.querySelector('[data-widget-panel="diff"] .panel-state').textContent = result?.ok ? 'Pass' : 'Fail';
        taskSteps[index].status = 'complete';
        publishTask('WORKING', 'active', {observation: 'Read-only diff loaded.'});
        continue;
      }
      const output = step.kind === 'gitStatus'
        ? await runAgentQuery({...step, taskId: activeTaskId})
        : await runCommandNow({...step, taskId: activeTaskId});
      const verification = agentStepVerification(step, output);
      if (verification) publishTask('VERIFYING', 'active', {verification});
      if (output && (output.ok === false)) {
        taskSteps[index].status = 'blocked';
        publishTask('BLOCKED', 'blocked', {blocker: output.error || output.stderr || 'Local step failed.', verification, recovery: {available: true, label: 'Retry the bounded plan'}});
        taskFailed = true;
        report(`Step ${step.kind} failed: ${output.error || output.stderr || 'unknown error'}`, 'error');
        if (step.kind === 'test' || step.kind === 'testPy' || step.kind === 'build') break;
      } else {
        taskSteps[index].status = 'complete';
        publishTask(verification ? 'VERIFYING' : 'WORKING', 'active', {observation: agentStepObservation(step, output), verification});
        updateWingFooter(`Local agent step: ${requestLabel} complete`);
      }
      if (step.kind === 'test' || step.kind === 'testJs' || step.kind === 'testPy') {
        doc.querySelector('[data-widget-panel="tests"] .panel-state').textContent = output?.ok ? 'Pass' : 'Fail';
      }
      if (step.kind === 'gitCommit' && output?.ok) {
        $('widget-brief-status').textContent = 'Task completed (local agent)';
        await refreshGitSummary();
      }
    }
    agentRunning = false;
    $('widget-task-cancel').hidden = true;
    $('widget-task-retry').hidden = !taskFailed;
    $('widget-task-run').disabled = !$('widget-brief').value.trim();
    $('widget-agent-run').disabled = !$('widget-brief').value.trim();
    const taskState = doc.querySelector('[data-widget-panel="task"] .panel-state');
    if (taskCancelled) {
      publishTask('CANCELLED', 'cancelled', {result: 'Task cancelled safely.'});
      if (taskState) taskState.textContent = 'Cancelled';
      $('widget-brief-status').textContent = 'Task cancelled';
      report('Task cancelled safely.', 'warning');
    } else if (taskFailed) {
      publishTask('BLOCKED', 'blocked', {result: 'Task needs attention.', recovery: {available: true, label: 'Retry the bounded plan'}});
      if (taskState) taskState.textContent = 'Failed';
      $('widget-brief-status').textContent = 'Task needs attention';
      report('Task failed. Review the details, then try again.', 'error');
    } else {
      publishTask('COMPLETE', 'success', {result: 'Task completed.'});
      if (taskState) taskState.textContent = 'Pass';
      $('widget-brief-status').textContent = 'Task completed (local agent)';
      $('widget-brief-status').dataset.tone = 'success';
      report('Task completed.', 'info');
    }
    activeTaskId = null;
  };

  // Core panel controls.
  on($('widget-coding-tools'), 'click', () => {
    closeMenus();
    if (doc.body.classList.contains('widget-chat-open')) $('widget-chat-toggle').click();
    if (doc.body.classList.contains('widget-calendar-open')) $('widget-calendar-toggle').click();
    dispatch({type: 'toggle-tools'});
    if (state.open) $('widget-panels-title').focus({preventScroll: true});
  });
  on($('widget-panels-close'), 'click', () => {
    dispatch({type: 'close-tools'});
    $('widget-coding-tools').focus();
  });
  on($('widget-panels-collapse'), 'click', () => {
    dispatch({type: 'collapse-all'});
    cards[0]?.querySelector('[data-panel-toggle]').focus();
  });

  cards.forEach(card => on(card.querySelector('[data-panel-toggle]'), 'click', () =>
    dispatch({type: 'toggle-panel', id: card.dataset.widgetPanel})));
  cards.forEach((card, index) => on(card.querySelector('[data-panel-toggle]'), 'keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = disclosureFocusIndex(event.key, index, cards.length);
    if (target === null) return;
    event.preventDefault();
    cards[target].querySelector('[data-panel-toggle]').focus();
  }));

  doc.querySelectorAll('[data-open-wide]').forEach(button => on(button, 'click', () => {
    dispatch({type: 'open-wide', id: button.dataset.openWide});
    $('widget-wing-close').focus({preventScroll: true});
  }));

  const closeWide = () => {
    const id = state.wide;
    dispatch({type: 'close-wide'});
    const button = doc.querySelector(`[data-open-wide="${id}"]`);
    const target = button?.closest('.widget-panel-body')?.hidden
      ? button.closest('[data-widget-panel]')?.querySelector('[data-panel-toggle]') : button;
    (target || $('widget-coding-tools')).focus();
  };

  on($('widget-wing-close'), 'click', closeWide);
  // Capture only handled UI navigation. Never let closing a panel cancel speech.
  on(win, 'keydown', event => {
    if (!isWidget() || event.key !== 'Escape' || !state.open) return;
    if (!$('widget-menu').hidden || !$('bot-library').hidden) return;
    if (!state.wide && doc.body.classList.contains('widget-chat-open')
      && !event.target.closest?.('#widget-coding-panels')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (state.wide) closeWide();
    else { dispatch({type: 'close-tools'}); $('widget-coding-tools').focus(); }
  }, {capture: true});

  on($('widget-task-run'), 'click', async () => {
    const length = $('widget-brief').value.trim().length;
    if (!length) return;
    $('widget-brief-status').textContent = `Running task locally (${trustedMode ? 'trusted mode' : 'strict mode'}).`;
    doc.querySelector('[data-widget-panel="task"] .panel-state').textContent = 'Running';
    $('widget-brief-status').dataset.tone = 'info';
    await runAgentPlan();
  });
  on($('widget-agent-run'), 'click', runAgentPlan);
  on($('widget-task-cancel'), 'click', async () => {
    if (!agentRunning || !activeTaskId) return;
    taskCancelled = true;
    agentRunning = false;
    $('widget-task-cancel').disabled = true;
    $('widget-brief-status').textContent = 'Cancelling task…';
    report('Stopping the current task…', 'warning');
    await desktop?.cancelAgentTask?.(activeTaskId);
    $('widget-task-cancel').disabled = false;
  });
  on($('widget-task-retry'), 'click', () => {
    if (!lastTaskBrief || agentRunning) return;
    $('widget-brief').value = lastTaskBrief;
    $('widget-brief').dispatchEvent(new Event('input', {bubbles: true}));
    $('widget-task-run').click();
  });

  const quickTasks = {
    check: 'Check project status and run JavaScript tests',
    test: 'Run tests',
    build: 'Build app',
    review: 'Review changes and show the diff'
  };
  doc.querySelectorAll('[data-quick-task]').forEach(button => on(button, 'click', () => {
    const brief = quickTasks[button.dataset.quickTask];
    if (!brief) return;
    $('widget-brief').value = brief;
    $('widget-brief').dispatchEvent(new Event('input', {bubbles: true}));
    $('widget-task-run').click();
  }));

  on($('widget-trusted-mode'), 'click', () => {
    trustedMode = !trustedMode;
    if (trustedMode) {
      pendingAction = null;
      setNeedApprove(false);
      report('Trusted mode enabled for this window. Actions run without approval.', 'info');
    } else {
      report('Strict mode enabled. Commands need explicit approval.', 'warning');
    }
    setTrustLabel();
    doc.querySelector('[data-widget-panel="terminal"] .panel-state').textContent = trustedMode ? 'Trusted' : 'Strict';
  });

  // This is a draft in the current window, not a queued/running agent task.
  on($('widget-brief'), 'input', () => {
    const length = $('widget-brief').value.trim().length;
    $('widget-brief-status').textContent = length ? 'Draft only · not submitted' : 'No task started';
    $('widget-brief-status').dataset.tone = 'info';
    doc.querySelector('[data-widget-panel="task"] .panel-state').textContent = length ? 'Draft' : 'Not started';
    $('widget-task-run').disabled = !length;
    $('widget-agent-run').disabled = !length;
  });

  on($('widget-brief-to-chat'), 'click', () => {
    const input = $('widget-text');
    const transfer = prepareBriefTransfer($('widget-brief').value, input.value, input.maxLength);
    if (transfer.kind === 'empty') return;
    if (transfer.kind === 'too-long') {
      $('widget-brief-status').textContent = 'The brief is too long for chat. Shorten it before copying.';
      $('widget-brief-status').dataset.tone = 'warning';
      return;
    }
    if ($('widget-chat-toggle').getAttribute('aria-expanded') !== 'true') $('widget-chat-toggle').click();
    if (transfer.kind === 'conflict') {
      $('widget-brief-status').textContent = 'Your unsent chat draft is safe. Send or clear it before copying this brief.';
      $('widget-brief-status').dataset.tone = 'warning';
      input.focus({preventScroll: true});
      return;
    }
    input.value = transfer.text;
    input.dispatchEvent(new win.Event('input', {bubbles: true}));
    input.focus({preventScroll: true});
    $('widget-brief-status').textContent = 'Copied to chat · press Send to discuss';
    $('widget-brief-status').dataset.tone = 'info';
  });

  on($('widget-run-command'), 'click', async () => {
    const actionId = $('widget-terminal-command').value;
    const command = toCommandLine(actionId);
    if (!command) {
      report('Unsupported command selected.', 'error');
      return;
    }
    await queueAction({kind: command});
  });

  on($('widget-command-approve'), 'click', async () => {
    if (!pendingAction) return;
    report('Running approved command…', 'info');
    await executeApproved();
  });

  on($('widget-command-cancel'), 'click', () => {
    pendingAction = null;
    setNeedApprove(false);
    report('Pending command cancelled.', 'info');
  });

  on($('widget-run-tests'), 'click', async () => {
    doc.querySelector('[data-widget-panel="tests"] .panel-state').textContent = 'Running';
    const output = await runCommandNow({kind: 'test'});
    $('widget-tests-status').textContent = output?.ok ? 'Tests complete' : 'Tests failed';
    doc.querySelector('[data-widget-panel="tests"] .panel-state').textContent = output?.ok ? 'Pass' : 'Fail';
    updateWingFooter(`Last action: test ${output?.ok ? 'passed' : 'failed'}`);
  });

  on($('widget-list-files'), 'click', async () => {
    const button = $('widget-list-files');
    button.disabled = true;
    report('Reading tracked project files…', 'info');
    const result = await runAgentQuery({kind: 'gitFiles'});
    const output = $('widget-files-output');
    if (result?.ok) {
      output.hidden = false;
      output.textContent = result.stdout || '(No tracked files found.)';
      $('widget-files-empty').textContent = 'Tracked files only. File contents and untracked paths stay protected.';
      doc.querySelector('[data-widget-panel="changes"] .panel-state').textContent = 'Ready';
      report('Project file list loaded.', 'info');
      updateWingFooter('Tracked files loaded');
    } else {
      report(`Could not list project files: ${result?.error || 'Unknown error'}`, 'error');
    }
    button.disabled = false;
  });

  on($('widget-refresh-git'), 'click', async () => {
    await refreshGitSummary();
    doc.querySelector('[data-widget-panel="diff"] .panel-state').textContent = 'Updated';
    updateWingFooter('Git status refreshed');
  });

  on($('widget-open-diff'), 'click', async () => {
    const result = await runAgentQuery({kind: 'gitDiff'});
    const wing = $('widget-code-wing').querySelector('.widget-wing-content');
    if (!wing) return;
    const diffText = result?.ok ? (result.stdout || '(No diff output.)') : (result.error || 'git diff unavailable.');
    wing.innerHTML = '';
    const pre = doc.createElement('pre');
    pre.textContent = diffText;
    wing.append(pre);
    dispatch({type: 'open-wide', id: 'diff'});
    updateWingFooter(`Last action: git diff ${result?.ok ? 'loaded' : 'failed'}`);
  });

  on($('widget-commit'), 'click', async () => {
    const message = win.prompt('Commit message?');
    if (!message?.trim()) {
      report('Commit cancelled.', 'warning');
      return;
    }
    if (!trustedMode && pendingAction) {
      report('Approve or cancel current pending command before committing.', 'warning');
      return;
    }
    const messageText = message.trim();
    const result = await runAgentAction({kind: 'gitCommit', commitMessage: messageText});
    if (result?.ok) {
      report(`Committed: ${messageText}`);
      updateWingFooter('Committed changes to git');
      await refreshGitSummary();
    } else {
      report(`Commit failed: ${result?.error || 'Unknown error'}`, 'error');
      updateWingFooter(`Commit failed: ${messageText}`);
    }
  });

  if (!desktop?.chooseProject) {
    $('widget-project-select').disabled = true;
    $('widget-project-select').title = 'Folder selection is available in the desktop app.';
  }
  on($('widget-project-select'), 'click', async () => {
    if (selecting || !desktop?.chooseProject) return;
    const button = $('widget-project-select');
    let nextLabel = button.textContent;
    selecting = true; button.disabled = true; button.textContent = 'Opening…';
    button.setAttribute('aria-busy', 'true');
    try {
      const result = await desktop.chooseProject();
      if (signal.aborted || result?.canceled) return;
      if (!result?.ok || !result.project?.name) throw Error(result?.error || 'Could not select a folder.');
      setProject(result.project.name);
      nextLabel = 'Change folder';
      $('widget-files-empty').textContent = 'Workspace connected. Actions run only in this local project.';
      doc.querySelector('[data-widget-panel="changes"] .panel-state').textContent = 'Ready';
      doc.querySelector('[data-widget-panel="terminal"] .panel-state').textContent = trustedMode ? 'Trusted' : 'Strict';
      report(`Workspace ready: ${result.project.name}. Start with a quick action.`);
      await refreshGitSummary();
    } catch (error) {
      report(`Folder selection failed: ${error.message}`, 'error');
    } finally {
      selecting = false;
      if (!signal.aborted) {
        button.disabled = false; button.textContent = nextLabel; button.removeAttribute('aria-busy');
      }
    }
  });

  // Returning from the optional full view starts compact, without losing drafts.
  const onMode = () => {
    if (!isWidget()) { state = reducePanelState(state, {type: 'close-tools'}); ++request; }
    render();
  };
  const observer = new MutationObserver(records => {
    if (records.some(record => record.oldValue?.split(/\s+/).includes('widget') !== isWidget())) onMode();
  });
  observer.observe(doc.body, {attributes: true, attributeFilter: ['class'], attributeOldValue: true});
  const unsubscribe = desktop?.onWidgetLayout?.(setLayout);

  doc.querySelector('[data-widget-panel="task"] .panel-state').textContent = $('widget-brief').value.trim() ? 'Draft' : 'Not started';
  setTrustLabel();
  setNeedApprove(false);
  updateWingFooter('Ready');
  render();
  void syncProjectState();
  win.openAttachedWorkspace = id => dispatch({type: 'open-wide', id});
  win.closeAttachedWorkspace = () => dispatch({type: 'close-wide'});
  return {dispose() { abort.abort(); observer.disconnect(); unsubscribe?.(); }};
}
