const STEP_GLYPH = {
  pending: '○',
  active: '●',
  waiting: '◌',
  complete: '✓',
  blocked: '!',
};

export function rivetWorkspaceModel(detail = {}) {
  const steps = Array.isArray(detail.steps) ? detail.steps : [];
  return {
    phase: detail.phase || 'IDLE',
    status: detail.status || 'idle',
    steps: steps.map(step => ({
      id: step.id,
      label: step.label || 'Local step',
      status: step.status || 'pending',
      glyph: STEP_GLYPH[step.status] || '○',
    })),
  };
}

export function mountRivetWorkspace(win, doc) {
  const $ = id => doc.getElementById(id);
  const root = $('widget-coding-panels');
  const taskBody = $('widget-task-body');
  if (!root || !taskBody) return {dispose() {}};

  root.classList.add('rivet-agent-workspace');

  const heading = root.querySelector('.widget-panels-heading');
  const title = $('widget-panels-title');
  if (heading && title && !heading.querySelector('.rivet-heading-copy')) {
    const copy = doc.createElement('div');
    copy.className = 'rivet-heading-copy';
    const eyebrow = doc.createElement('span');
    eyebrow.className = 'rivet-eyebrow';
    eyebrow.textContent = 'LOCAL CODING AGENT';
    title.parentElement?.insertBefore(copy, title);
    copy.append(eyebrow, title);
  }

  const projectRow = root.querySelector('.widget-project-row');
  const projectName = $('widget-project-name');
  const projectSelect = $('widget-project-select');
  if (projectRow && projectName && !projectRow.querySelector('.rivet-project-main')) {
    const main = doc.createElement('div');
    main.className = 'rivet-project-main';
    const dot = doc.createElement('span');
    dot.className = 'rivet-project-dot';
    dot.setAttribute('aria-hidden', 'true');
    const copy = doc.createElement('div');
    copy.className = 'rivet-project-copy';
    const label = doc.createElement('span');
    label.className = 'rivet-project-label';
    label.textContent = 'Project';
    projectName.parentElement?.insertBefore(main, projectName);
    copy.append(label, projectName);
    main.append(dot, copy);
    if (projectSelect) projectSelect.textContent = projectName.textContent === 'No folder selected' ? 'Open project' : 'Change';
  }

  let timeline = $('widget-rivet-timeline');
  if (!timeline) {
    timeline = doc.createElement('section');
    timeline.id = 'widget-rivet-timeline';
    timeline.className = 'rivet-timeline';
    timeline.setAttribute('aria-label', 'Rivet task progress');
    timeline.setAttribute('aria-live', 'polite');
    timeline.innerHTML = '<div class="rivet-timeline-empty">Ready when you are.</div>';
    const status = $('widget-brief-status');
    status?.insertAdjacentElement('afterend', timeline);
  }

  const scroll = root.querySelector('.widget-panels-scroll');
  let details = $('widget-rivet-details');
  if (!details && scroll) {
    details = doc.createElement('section');
    details.id = 'widget-rivet-details';
    details.className = 'rivet-details';

    const toggle = doc.createElement('button');
    toggle.id = 'widget-rivet-details-toggle';
    toggle.type = 'button';
    toggle.className = 'rivet-details-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'widget-rivet-details-body');
    toggle.innerHTML = '<span>Details</span><span class="rivet-details-meta">Files · Terminal · Tests · Git</span><span aria-hidden="true">⌄</span>';

    const body = doc.createElement('div');
    body.id = 'widget-rivet-details-body';
    body.className = 'rivet-details-body';
    body.hidden = true;
    body.setAttribute('role','region');
    body.setAttribute('aria-label','Rivet advanced tools');

    const advanced = [...scroll.querySelectorAll('[data-widget-panel="changes"], [data-widget-panel="terminal"], [data-widget-panel="tests"], [data-widget-panel="diff"]')];
    const first = advanced[0];
    if (first) scroll.insertBefore(details, first);
    else scroll.append(details);
    details.append(toggle, body);
    advanced.forEach(panel => body.append(panel));

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      body.hidden = !open;
      win.__myavatarWidgetAccessibility?.sync?.();
    });
  }

  const render = detail => {
    const model = rivetWorkspaceModel(detail);
    if (!model.steps.length) {
      timeline.innerHTML = '<div class="rivet-timeline-empty">Ready when you are.</div>';
      timeline.dataset.phase = model.phase;
      timeline.dataset.status = model.status;
      return;
    }
    timeline.replaceChildren(...model.steps.map(step => {
      const row = doc.createElement('div');
      row.className = 'rivet-step';
      row.dataset.status = step.status;
      const glyph = doc.createElement('span');
      glyph.className = 'rivet-step-glyph';
      glyph.setAttribute('aria-hidden', 'true');
      glyph.textContent = step.glyph;
      const label = doc.createElement('span');
      label.className = 'rivet-step-label';
      label.textContent = step.label;
      row.append(glyph, label);
      return row;
    }));
    timeline.dataset.phase = model.phase;
    timeline.dataset.status = model.status;
  };

  const onTask = event => render(event?.detail || {});
  win.addEventListener('myavatar:agent-task', onTask);

  return {
    dispose() {
      win.removeEventListener('myavatar:agent-task', onTask);
    },
  };
}