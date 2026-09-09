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

/** Attached panels are UI-only until an authorised coding executor is connected.
 * Never parse conversation text into shell actions or fabricate progress/results.
 */
export function mountWidgetPanels(doc, desktop) {
  const win = doc.defaultView, $ = id => doc.getElementById(id);
  let storage;
  try { storage = win.localStorage; } catch { /* Optional preferences. */ }
  let state = readPanelPreferences(storage), request = 0, selecting = false;
  const abort = new AbortController(), signal = abort.signal;
  const on = (element, event, callback, options = {}) => element.addEventListener(event, callback, {...options, signal});
  const cards = [...doc.querySelectorAll('[data-widget-panel]')];
  const report = (text, tone = 'info') => {
    if (signal.aborted) return;
    $('widget-panel-notice').textContent = text;
    $('widget-panel-notice').dataset.tone = tone;
  };
  const isWidget = () => doc.body.classList.contains('widget');
  const setLayout = layout => {
    if (!layout?.bounds || !['none', 'left', 'right', 'inline'].includes(layout.side)) return;
    doc.body.dataset.panelSide = layout.side;
    doc.body.style.setProperty('--widget-offset', `${Number(layout.offset) || 0}px`);
    doc.body.style.setProperty('--widget-wing-width', `${Number(layout.wingWidth) || 0}px`);
  };
  const render = () => {
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
      const id = card.dataset.widgetPanel, expanded = state.expanded.includes(id);
      card.querySelector('[data-panel-toggle]').setAttribute('aria-expanded', String(expanded));
      card.querySelector('.widget-panel-body').hidden = !expanded;
      card.dataset.expanded = String(expanded);
    });
    const fileView = state.wide === 'changes';
    $('widget-wing-title').textContent = fileView ? 'Files / Changes' : 'Git / Diff';
    const empty = doc.querySelector('.widget-wing-empty');
    const title = doc.createElement('strong');
    title.textContent = fileView ? 'No files loaded yet' : 'No diff to review yet';
    empty.replaceChildren(title, doc.createTextNode(fileView
      ? 'Choose a folder to label this workspace. File access is not connected yet, so nothing has been read or changed.'
      : 'Git inspection is not connected yet. No branch, changes, or test results have been checked.'));
    $('widget-wing-close').setAttribute('aria-label', fileView ? 'Collapse expanded file view' : 'Collapse expanded diff view');
    $('widget-wing-close').title = $('widget-wing-close').getAttribute('aria-label');
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
      ? button.closest('[data-widget-panel]').querySelector('[data-panel-toggle]') : button;
    (target || $('widget-coding-tools')).focus();
  };
  on($('widget-wing-close'), 'click', closeWide);
  // Capture only handled UI navigation. Never let closing a panel cancel speech.
  on(win, 'keydown', event => {
    if (!isWidget() || event.key !== 'Escape' || !state.open) return;
    if (!$('widget-menu').hidden || !$('bot-library').hidden) return;
    if (!state.wide && doc.body.classList.contains('widget-chat-open')
      && !event.target.closest?.('#widget-coding-panels')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (state.wide) closeWide();
    else { dispatch({type: 'close-tools'}); $('widget-coding-tools').focus(); }
  }, {capture: true});
  // This is a draft in the current window, not a queued/running agent task.
  on($('widget-brief'), 'input', () => {
    const length = $('widget-brief').value.trim().length;
    $('widget-brief-status').textContent = length ? 'Draft only · not submitted' : 'No task started';
    $('widget-brief-status').dataset.tone = 'info';
    doc.querySelector('[data-widget-panel="task"] .panel-state').textContent = length ? 'Draft' : 'Not started';
    $('widget-brief-to-chat').disabled = !length;
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
      // Text-only rendering, including untrusted filenames. Selection reads no files.
      $('widget-project-name').textContent = result.project.name;
      $('widget-project-name').title = result.project.name;
      nextLabel = 'Change folder';
      $('widget-files-empty').textContent = 'Folder selected. File reading and editing are not connected yet.';
      report('Folder selected locally. This does not grant command execution or file-edit access.');
    } catch (error) { report(`Folder selection failed: ${error.message}`, 'error'); }
    finally {
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
  render();
  return {dispose() { abort.abort(); observer.disconnect(); unsubscribe?.(); }};
}
