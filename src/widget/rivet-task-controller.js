const COMMAND_KINDS = new Set(['build', 'test', 'testJs', 'testPy', 'gitCommit']);
const QUERY_KINDS = new Set(['gitStatus', 'gitDiff']);
const VERIFY_KINDS = new Set(['build', 'test', 'testJs', 'testPy']);
const STEP_LABELS = Object.freeze({build:'Build the project',test:'Run the configured tests',testJs:'Run JavaScript tests',testPy:'Run Python tests',gitStatus:'Read Git status',gitDiff:'Review the Git diff',gitCommit:'Commit the approved changes'});

export function rivetStepLabel(kind){return STEP_LABELS[kind]||'Run a bounded local step';}

export function planRivetBrief(value) {
  const brief = typeof value === 'string' ? value.trim() : '';
  if (!brief) return [];
  const text = brief.toLowerCase();
  const has = token => text.includes(token);
  const plan = [];
  if (has('build')) plan.push({kind: 'build'});
  if (has('test') || has('tests')) {
    if (has('python') || has('pytest')) plan.push({kind: 'testPy'});
    else if (has('javascript') || has(' js') || text.startsWith('js ')) plan.push({kind: 'testJs'});
    else plan.push({kind: 'test'});
  }
  if (has('check status') || has('git status') || /\bstatus\b/.test(text)) plan.push({kind: 'gitStatus'});
  if (has('diff') || has('review') || has('changes')) plan.push({kind: 'gitDiff'});
  if (has('commit') || has('checkpoint')) plan.push({kind: 'gitCommit', commitMessage: `coding agent: ${brief.slice(0, 96)}`});
  return plan;
}

export function initialRivetTask(id, brief, plan) {
  return {
    id,
    brief,
    plan: plan.map(step => ({...step})),
    cursor: 0,
    phase: 'PLANNING',
    status: 'active',
    awaitingApproval: false,
    cancelled: false,
    failed: false,
  };
}

export function markAwaitingApproval(task) {
  return {...task, phase: 'NEEDS_APPROVAL', status: 'waiting', awaitingApproval: true};
}

export function markStepComplete(task) {
  const cursor = task.cursor + 1;
  return {...task, cursor, phase: cursor >= task.plan.length ? 'COMPLETE' : 'WORKING', status: cursor >= task.plan.length ? 'success' : 'active', awaitingApproval: false};
}

export function markTaskFailed(task) {
  return {...task, phase: 'BLOCKED', status: 'blocked', awaitingApproval: false, failed: true};
}

export function markTaskCancelled(task) {
  return {...task, phase: 'CANCELLED', status: 'cancelled', awaitingApproval: false, cancelled: true};
}

export function taskSteps(task) {
  return task.plan.map((step, index) => ({
    id: `step-${index + 1}`,
    label: rivetStepLabel(step.kind),
    status: index < task.cursor ? 'complete' : index === task.cursor && task.awaitingApproval ? 'waiting' : index === task.cursor && task.status === 'active' ? 'active' : task.failed && index === task.cursor ? 'blocked' : 'pending',
  }));
}

export function mountRivetTaskController(win, doc, desktop) {
  const $ = id => doc.getElementById(id);
  const run = $('widget-task-run');
  const legacyRun = $('widget-agent-run');
  const approve = $('widget-command-approve');
  const reject = $('widget-command-cancel');
  const cancel = $('widget-task-cancel');
  const retry = $('widget-task-retry');
  const briefInput = $('widget-brief');
  if (!run || !briefInput) return {dispose() {}};

  let task = null;
  let running = false;
  let pendingRequest = null;
  let lastBrief = '';
  const abort = new AbortController();
  const signal = abort.signal;
  const on = (el, type, fn, options={}) => el?.addEventListener(type, fn, {...options, signal});
  const report = (text, tone='info') => {
    const notice = $('widget-panel-notice');
    if (notice) { notice.textContent = text; notice.dataset.tone = tone; }
  };
  const setStatus = (text, tone='info') => {
    const status = $('widget-brief-status');
    const panel = doc.querySelector('[data-widget-panel="task"] .panel-state');
    if (status) { status.textContent = text; status.dataset.tone = tone; }
    if (panel) panel.textContent = text;
  };
  const publish = (extra={}) => {
    if (!task) return;
    win.dispatchEvent(new win.CustomEvent('myavatar:agent-task', {detail: {
      id: task.id, botId: 'robot', goal: task.brief, phase: task.phase, status: task.status, steps: taskSteps(task), ...extra,
    }}));
  };
  const syncButtons = () => {
    const busy = running || !!task?.awaitingApproval;
    run.disabled = busy || !briefInput.value.trim();
    if (legacyRun) legacyRun.disabled = true;
    if (cancel) cancel.hidden = !busy;
    if (retry) retry.hidden = !task?.failed;
  };
  const showApproval = visible => {
    if (approve) approve.hidden = !visible;
    if (reject) reject.hidden = !visible;
    const terminalRun = $('widget-run-command');
    if (terminalRun) terminalRun.disabled = visible;
  };
  const execute = async step => {
    const request = {...step, taskId: task.id};
    if (QUERY_KINDS.has(step.kind)) return desktop?.runAgentQuery ? desktop.runAgentQuery(request) : {ok:false,error:'Query bridge unavailable.'};
    if (COMMAND_KINDS.has(step.kind)) return desktop?.runAgentCommand ? desktop.runAgentCommand(request) : {ok:false,error:'Coding executor unavailable.'};
    return {ok:false,error:'Unsupported local step.'};
  };
  const trustedMode = () => $('widget-trusted-mode')?.getAttribute('aria-pressed') === 'true';

  const finishFailure = output => {
    task = markTaskFailed(task);
    running = false;
    pendingRequest = null;
    showApproval(false);
    setStatus('Task needs attention', 'error');
    report(output?.error || output?.stderr || 'Task failed.', 'error');
    publish({blocker: output?.error || output?.stderr || 'Local step failed.', recovery:{available:true,label:'Retry task'}});
    syncButtons();
  };

  const continueTask = async () => {
    if (!task || running || task.cancelled || task.failed || task.awaitingApproval) return;
    running = true;
    syncButtons();
    while (task && task.cursor < task.plan.length && !task.cancelled && !task.failed) {
      const step = task.plan[task.cursor];
      task = {...task, phase:'WORKING', status:'active'};
      publish();
      if (COMMAND_KINDS.has(step.kind) && !trustedMode()) {
        task = markAwaitingApproval(task);
        pendingRequest = step;
        running = false;
        showApproval(true);
        setStatus('Awaiting approval', 'warning');
        report(`Approval required: ${rivetStepLabel(step.kind)}.`, 'warning');
        publish({blocker:'Approve this local action to continue.'});
        syncButtons();
        return;
      }
      let output;
      try { output = await execute(step); }
      catch (error) { output = {ok:false,error:error?.message || 'Local action failed.'}; }
      if (!output?.ok) return finishFailure(output);
      if (step.kind === 'gitDiff') {
        const wing = $('widget-code-wing')?.querySelector('.widget-wing-content');
        if (wing) { const pre=doc.createElement('pre'); pre.textContent=output.stdout || '(No diff output.)'; wing.replaceChildren(pre); }
      }
      if (VERIFY_KINDS.has(step.kind)) publish({verification:{status:'passed',ok:true,checks:[{id:step.kind,ok:true}],message:`${step.kind} completed.`}});
      task = markStepComplete(task);
      publish({observation:`${step.kind} completed.`});
    }
    running = false;
    if (task && task.cursor >= task.plan.length && !task.failed && !task.cancelled) {
      task = {...task, phase:'COMPLETE', status:'success'};
      setStatus('Task completed', 'success');
      report('Task completed.', 'info');
      publish({result:'Task completed.'});
    }
    syncButtons();
  };

  const start = async event => {
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    const brief = briefInput.value.trim();
    const plan = planRivetBrief(brief);
    if (!brief || !plan.length || running || task?.awaitingApproval) return;
    lastBrief = brief;
    task = initialRivetTask(globalThis.crypto?.randomUUID?.() || `task-${Date.now()}`, brief, plan);
    setStatus('Planning', 'info');
    publish();
    await continueTask();
  };

  const approvePending = async event => {
    if (!task?.awaitingApproval || !pendingRequest) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const step = pendingRequest;
    showApproval(false);
    task = {...task, phase:'WORKING', status:'active', awaitingApproval:false};
    pendingRequest = null;
    running = true;
    setStatus('Running approved step', 'info');
    publish();
    let output;
    try { output = await execute(step); }
    catch (error) { output = {ok:false,error:error?.message || 'Approved action failed.'}; }
    running = false;
    if (!output?.ok) return finishFailure(output);
    if (VERIFY_KINDS.has(step.kind)) publish({verification:{status:'passed',ok:true,checks:[{id:step.kind,ok:true}],message:`${step.kind} completed.`}});
    task = markStepComplete(task);
    publish({observation:`${step.kind} completed after approval.`});
    syncButtons();
    await continueTask();
  };

  const rejectPending = event => {
    if (!task?.awaitingApproval) return;
    event.preventDefault(); event.stopImmediatePropagation();
    task = markTaskCancelled(task);
    pendingRequest = null;
    running = false;
    showApproval(false);
    setStatus('Task cancelled', 'warning');
    report('Pending action cancelled. No command was run.', 'warning');
    publish({result:'Task cancelled before approval.'});
    syncButtons();
  };

  const cancelTask = async event => {
    if (!task || (!running && !task.awaitingApproval)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const id = task.id;
    task = markTaskCancelled(task);
    running = false;
    pendingRequest = null;
    showApproval(false);
    setStatus('Task cancelled', 'warning');
    publish({result:'Task cancelled safely.'});
    syncButtons();
    try { await desktop?.cancelAgentTask?.(id); } catch { /* local cancellation is best-effort */ }
  };

  const retryTask = event => {
    if (!task?.failed || !lastBrief) return;
    event.preventDefault(); event.stopImmediatePropagation();
    briefInput.value = lastBrief;
    task = null;
    void start(event);
  };

  on(run, 'click', start, {capture:true});
  on(legacyRun, 'click', start, {capture:true});
  on(approve, 'click', approvePending, {capture:true});
  on(reject, 'click', rejectPending, {capture:true});
  on(cancel, 'click', cancelTask, {capture:true});
  on(retry, 'click', retryTask, {capture:true});

  return {get task(){ return task; }, dispose(){ abort.abort(); }};
}
