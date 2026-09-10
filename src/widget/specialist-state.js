const KINDS = new Set(['coding', 'calendar', 'creative']);

export function nextSpecialistState(active, detail) {
  const kind = detail?.kind;
  if (!KINDS.has(kind) || typeof detail?.open !== 'boolean') return active || null;
  if (detail.open) return kind;
  return active === kind ? null : (active || null);
}

export function specialistVisibility(active) {
  return {
    coding: active === 'coding',
    calendar: active === 'calendar',
    creative: active === 'creative',
  };
}

const SURFACES = {
  coding: {
    classes: ['widget-panels-open'],
    extraClasses: ['widget-wide-open'],
    elements: ['widget-coding-panels'],
    extraElements: ['widget-code-wing'],
    controls: ['widget-coding-tools'],
  },
  calendar: {
    classes: ['widget-calendar-open'],
    extraClasses: [],
    elements: ['widget-mini-calendar'],
    extraElements: [],
    controls: ['widget-calendar-toggle'],
  },
  creative: {
    classes: ['widget-creative-open'],
    extraClasses: ['widget-creative-context-open'],
    elements: ['widget-creative-workspace'],
    extraElements: [],
    controls: ['widget-creative-toggle'],
  },
};

function closeSurface(doc, kind) {
  const config = SURFACES[kind];
  for (const className of [...config.classes, ...config.extraClasses]) doc.body.classList.remove(className);
  for (const id of [...config.elements, ...config.extraElements]) {
    const element = doc.getElementById(id);
    if (element) element.hidden = true;
  }
  for (const id of config.controls) doc.getElementById(id)?.setAttribute('aria-expanded', 'false');
}

function detectInitial(doc) {
  if (doc.body.classList.contains('widget-panels-open')) return 'coding';
  if (doc.body.classList.contains('widget-calendar-open')) return 'calendar';
  if (doc.body.classList.contains('widget-creative-open')) return 'creative';
  return null;
}

export function mountSpecialistState(win, doc) {
  let active = detectInitial(doc);
  const reflect = () => {
    if (active) doc.body.dataset.activeSpecialist = active;
    else delete doc.body.dataset.activeSpecialist;
  };
  reflect();

  const onState = event => {
    const next = nextSpecialistState(active, event?.detail);
    if (next === active) return;
    if (next) {
      for (const kind of KINDS) if (kind !== next) closeSurface(doc, kind);
    }
    active = next;
    reflect();
  };

  win.addEventListener('myavatar:specialist-state', onState);
  return {
    get active() { return active; },
    dispose() { win.removeEventListener('myavatar:specialist-state', onState); },
  };
}
