import {botPresenceProfile,botStateLabel} from './bot-presence-profile.js';

const ACTIVE_VOICE = new Set(['listening','thinking','speaking','preparing']);
const ACTIVE_TASK = new Set(['UNDERSTANDING','CONTEXT','PLANNING','WORKING','VERIFYING']);

export function interactionPresentation({voiceState='ready', readiness={}, task=null, socketClosed=false, botId='robot'}={}) {
  const voice = String(voiceState || 'ready').toLowerCase();
  const overall = readiness?.overall || 'unknown';
  const phase = task?.phase || '';
  const taskStatus = task?.status || '';
  const profile = botPresenceProfile(botId);

  if (socketClosed || overall === 'unavailable') {
    return {state:'offline', label:profile.offline, tone:'error', busy:false, runtime:'OFFLINE', profile};
  }
  if (task && botId === 'robot' && phase === 'NEEDS_APPROVAL') {
    return {state:'awaiting-approval', label:'Awaiting approval', tone:'warning', busy:false, runtime:'APPROVAL', profile};
  }
  if (ACTIVE_VOICE.has(voice)) {
    return {state:voice, label:botStateLabel(botId,voice), tone:'active', busy:true, runtime:voice.toUpperCase(), profile};
  }
  if (task && botId === 'robot' && ACTIVE_TASK.has(phase) && taskStatus === 'active') {
    return {state:'working', label:'Rivet working', tone:'active', busy:true, runtime:'WORKING', profile};
  }
  if (task && botId === 'robot' && (phase === 'BLOCKED' || taskStatus === 'blocked')) {
    return {state:'task-blocked', label:'Needs attention', tone:'error', busy:false, runtime:'ATTENTION', profile};
  }
  if (overall === 'degraded') {
    return {state:'limited', label:profile.limited, tone:'warning', busy:false, runtime:'LIMITED', profile};
  }
  if (overall === 'preparing' || overall === 'pending') {
    return {state:'preparing', label:profile.preparing, tone:'active', busy:true, runtime:'STARTING', profile};
  }
  return {state:'ready', label:profile.ready, tone:'ready', busy:false, runtime:'LOCAL', profile};
}

export function mountInteractionState(win=window, doc=document) {
  if (win.__myavatarInteractionState) return win.__myavatarInteractionState;
  const $ = id => doc.getElementById(id);
  let readiness = {};
  let task = null;
  let socketClosed = false;
  let last = null;

  const apply = () => {
    const model = interactionPresentation({
      voiceState: doc.body.dataset.state || 'ready',
      readiness,
      task,
      socketClosed,
      botId: doc.body.dataset.bot || 'robot',
    });
    last = model;
    doc.body.dataset.interactionState = model.state;
    doc.body.dataset.presenceMotion = model.profile.motion;
    const tools = $('widget-tools');
    if (tools) {
      tools.dataset.interactionState = model.state;
      tools.dataset.presenceMotion = model.profile.motion;
    }
    const status = $('widget-status');
    if (status) {
      if (status.textContent !== model.label) status.textContent = model.label;
      status.dataset.tone = model.tone;
      status.setAttribute('aria-label',`${model.profile.name}: ${model.label}`);
    }
    const toolbar = doc.querySelector('.widget-toolbar');
    if (toolbar) toolbar.setAttribute('aria-busy', String(model.busy));
    const rivet = $('widget-coding-panels');
    if (rivet) rivet.dataset.companionState = model.state;
    win.dispatchEvent(new win.CustomEvent('myavatar:interaction-state', {detail:model}));
  };

  const onReadiness = event => { readiness = event.detail || {}; socketClosed = false; apply(); };
  const onRuntime = event => {
    const payload = event.detail || {};
    if (payload.readiness) { readiness = payload.readiness; socketClosed = false; }
    if (payload.type === 'setup_error' || payload.type === 'error') readiness = {...readiness, overall:'unavailable'};
    apply();
  };
  const onTask = event => { if (event.detail?.botId === 'robot') task = event.detail; apply(); };
  const onClose = () => { socketClosed = true; apply(); };
  const observer = new MutationObserver(records => {
    if (records.some(record => record.attributeName === 'data-state' || record.attributeName === 'data-bot')) apply();
  });
  observer.observe(doc.body, {attributes:true, attributeFilter:['data-state','data-bot']});
  win.addEventListener('myavatar:readiness', onReadiness);
  win.addEventListener('myavatar:runtime-event', onRuntime);
  win.addEventListener('myavatar:agent-task', onTask);
  win.addEventListener('myavatar:socket-close', onClose);
  apply();

  const api = {snapshot:()=>({...last}), dispose(){
    observer.disconnect();
    win.removeEventListener('myavatar:readiness', onReadiness);
    win.removeEventListener('myavatar:runtime-event', onRuntime);
    win.removeEventListener('myavatar:agent-task', onTask);
    win.removeEventListener('myavatar:socket-close', onClose);
    delete win.__myavatarInteractionState;
  }};
  win.__myavatarInteractionState = api;
  return api;
}
