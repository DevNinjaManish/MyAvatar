export const CORE_RUNTIME_IDS = Object.freeze([
  'stage',
  'status',
  'detail',
  'error',
  'mic',
  'stop',
  'messages',
  'metrics',
  'fps',
  'interaction',
  'performance',
  'performance-note',
  'memory-enabled',
  'settings',
  'onboarding',
  'onboarding-bot',
  'onboarding-performance',
  'onboarding-status',
  'widget-messages',
  'widget-chat-toggle',
  'widget-copy-last',
  'widget-mic',
  'widget-status',
  'widget-tools',
  'widget-more',
  'widget-menu',
  'bot-library',
  'calendar-workspace',
  'calendar-refresh',
  'calendar-local-add',
  'local-calendar-dialog',
  'local-calendar-form',
  'local-calendar-title',
  'local-calendar-date',
  'local-calendar-time',
]);

export function missingRuntimeElements(doc) {
  return CORE_RUNTIME_IDS.filter(id => !doc.getElementById(id));
}

export function assertRuntimeDomContract(doc) {
  const missing = missingRuntimeElements(doc);
  if (!missing.length) return true;
  throw new Error(`Renderer DOM contract is incomplete. Missing: ${missing.join(', ')}`);
}

export function renderBootFailure(doc, error) {
  const message = String(error?.message || error || 'Unknown renderer startup error');
  doc.body?.classList.add('renderer-boot-failed');
  if (doc.body) doc.body.dataset.state = 'error';

  const status = doc.getElementById('status');
  if (status) status.textContent = 'Needs attention';
  const widgetStatus = doc.getElementById('widget-status');
  if (widgetStatus) widgetStatus.textContent = 'Needs attention';
  const errorNode = doc.getElementById('error');
  if (errorNode) errorNode.textContent = message;

  let panel = doc.getElementById('renderer-boot-error');
  if (!panel && doc.body) {
    panel = doc.createElement('section');
    panel.id = 'renderer-boot-error';
    panel.setAttribute('role', 'alert');
    panel.style.cssText = 'position:fixed;inset:16px;z-index:99999;padding:16px;border-radius:12px;background:#180f12;color:#fff;font:14px/1.45 system-ui;overflow:auto';
    doc.body.append(panel);
  }
  if (panel) {
    panel.replaceChildren();
    const title = doc.createElement('strong');
    title.textContent = 'MyAvatar could not finish starting';
    const detail = doc.createElement('p');
    detail.textContent = message;
    const hint = doc.createElement('p');
    hint.textContent = 'Core startup stopped safely instead of leaving the app in a half-mounted state. Restart after updating to the latest build.';
    panel.append(title, detail, hint);
  }
}
