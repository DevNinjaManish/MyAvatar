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
      return;
    }
    $('widget-command-approve')?.removeAttribute('hidden');
    $('widget-command-cancel')?.removeAttribute('hidden');
    $('widget-run-command')?.setAttribute('disabled', 'true');
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
    $('widget-wing-title').textContent = fileView ? 'Files / Changes' : 'Git / Diff';
    const empty = doc.querySelector('.widget-wing-empty');
    const title = doc.createElement('strong');
    title.textContent = fileView ? 'No files loaded yet' : 'No diff to review yet';
    const detail = fileView
      ? 'Folder changes are summarized in the terminal panel and copied from approved local actions.'
      : 'Git inspection is connected to the local repository from this app path.';
    empty.replaceChildren(title, doc.createTextNode(detail));
    $('widget-wing-close').setAttribute('aria-label', fileView ? 'Collapse expanded file view' : 'Collapse expanded diff view');
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
      report(`Command failed: ${output?.error || 'Unknown error'}`,'error');
      $('widget-terminal-output').textContent = output?.stderr || output?.error || 'Command failed.';
    }
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
    await runCommandNow(pendingAction);
    pendingAction = null;
  };

  // Core panel controls.
  on($('widget-coding-tools'), 'click', () => {
    closeMenus();
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

  on($('widget-task-run'), 'click', () => {
    const length = $('widget-brief').value.trim().length;
    if (!length) return;
    $('widget-brief-status').textContent = `Task queued (${trustedMode ? 'trusted mode' : 'strict mode'}).`; 
    $('widget-brief-status').dataset.tone = 'info';
    doc.querySelector('[data-widget-panel="task"] .panel-state').textContent = 'Queued';
    report('Task queued. Start by executing a terminal action to materialize work.', 'info');
  });

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
  });

  on($('widget-refresh-git'), 'click', async () => {
    await refreshGitSummary();
    doc.querySelector('[data-widget-panel="diff"] .panel-state').textContent = 'Updated';
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
      await refreshGitSummary();
    } else {
      report(`Commit failed: ${result?.error || 'Unknown error'}`, 'error');
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
      $('widget-project-name').textContent = result.project.name;
      $('widget-project-name').title = result.project.name;
      nextLabel = 'Change folder';
      $('widget-files-empty').textContent = 'Folder selected. Actions run on the local app repository path.';
      report('Folder selected locally. This does not override the single-project execution policy.');
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
  render();
  return {dispose() { abort.abort(); observer.disconnect(); unsubscribe?.(); }};
}
