import {readPanelPreferences, reducePanelState, savePanelPreferences} from './panel-model.js';

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
  const report = text => { $('widget-panel-notice').textContent = text; };
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
    cards.forEach(card => {
      const id = card.dataset.widgetPanel, expanded = state.expanded.includes(id);
      card.querySelector('[data-panel-toggle]').setAttribute('aria-expanded', String(expanded));
      card.querySelector('.widget-panel-body').hidden = !expanded;
    });
    $('widget-wing-title').textContent = state.wide === 'changes' ? 'Files / Changes' : 'Git / Diff';
  };
  const resize = async () => {
    const current = ++request;
    if (!desktop?.widgetPanels || !isWidget()) return;
    try {
      const result = await desktop.widgetPanels({open: state.open, wide: !!state.wide});
      if (current !== request) return;
      if (result?.ok === false) throw Error(result.error || 'Panel layout is unavailable.');
      setLayout(result);
    } catch (error) { report(`Could not resize the widget: ${error.message}`); }
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
  on($('widget-panels-collapse'), 'click', () => dispatch({type: 'collapse-all'}));
  cards.forEach(card => on(card.querySelector('[data-panel-toggle]'), 'click', () =>
    dispatch({type: 'toggle-panel', id: card.dataset.widgetPanel})));
  doc.querySelectorAll('[data-open-wide]').forEach(button => on(button, 'click', () => {
    dispatch({type: 'open-wide', id: button.dataset.openWide});
    $('widget-wing-close').focus({preventScroll: true});
  }));
  const closeWide = () => {
    const id = state.wide;
    dispatch({type: 'close-wide'});
    doc.querySelector(`[data-open-wide="${id}"]`)?.focus({preventScroll: true});
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
    $('widget-brief-to-chat').disabled = !length;
  });
  on($('widget-brief-to-chat'), 'click', () => {
    const text = $('widget-brief').value.trim();
    if (!text) return;
    if ($('widget-chat-toggle').getAttribute('aria-expanded') !== 'true') $('widget-chat-toggle').click();
    const input = $('widget-text'); input.value = text;
    input.dispatchEvent(new win.Event('input', {bubbles: true}));
    input.focus({preventScroll: true});
    $('widget-brief-status').textContent = 'Copied to chat · press Send to discuss';
  });
  if (!desktop?.chooseProject) {
    $('widget-project-select').disabled = true;
    $('widget-project-select').title = 'Folder selection is available in the desktop app.';
  }
  on($('widget-project-select'), 'click', async () => {
    if (selecting || !desktop?.chooseProject) return;
    selecting = true; $('widget-project-select').disabled = true;
    try {
      const result = await desktop.chooseProject();
      if (result?.canceled) return;
      if (!result?.ok || !result.project?.name) throw Error(result?.error || 'Could not select a folder.');
      // Text-only rendering, including untrusted filenames. Selection reads no files.
      $('widget-project-name').textContent = result.project.name;
      $('widget-project-name').title = result.project.name;
      $('widget-project-select').textContent = 'Change folder';
      $('widget-files-empty').textContent = 'Folder selected. File reading and editing are not connected yet.';
      report('Folder selected locally. This does not grant command execution or file-edit access.');
    } catch (error) { report(`Folder selection failed: ${error.message}`); }
    finally { selecting = false; $('widget-project-select').disabled = false; }
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
  render();
  return {dispose() { abort.abort(); observer.disconnect(); unsubscribe?.(); }};
}
