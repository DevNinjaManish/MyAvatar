const SAFE_LABELS=Object.freeze({
  defaultThinking:'Preparing a reply…',
  codingPreparing:'Starting coding model…',
  codingContext:'Reviewing project files…',
  codingPatch:'Preparing change preview…',
  codingVerify:'Running safe tests…',
  codingRepair:'Preparing one repair…',
  codingApply:'Applying approved change…',
  workspace:'Switching project…'
});

export function thinkingLabelForRuntime(event,botId='nova'){
  if(!event||typeof event!=='object')return null;
  if(event.type==='state')return event.state==='THINKING'?SAFE_LABELS.defaultThinking:null;
  if(botId!=='robot')return null;
  if(event.type==='coding_preparing')return SAFE_LABELS.codingPreparing;
  if(event.type==='coding_context')return SAFE_LABELS.codingContext;
  if(event.type==='coding_patch')return SAFE_LABELS.codingPatch;
  if(event.type==='coding_verification'&&event.status==='running')return SAFE_LABELS.codingVerify;
  if(event.type==='coding_workspace_picker')return SAFE_LABELS.workspace;
  return null;
}

export function thinkingLabelForClient(message,botId='nova'){
  if(botId!=='robot'||!message||typeof message!=='object')return null;
  if(message.type==='coding_repair')return SAFE_LABELS.codingRepair;
  if(message.type==='coding_workspace')return SAFE_LABELS.workspace;
  if(message.type==='coding_edit_decision'&&message.decision==='approve')return SAFE_LABELS.codingApply;
  return null;
}

export function shouldHideThinkingCapsule(event){
  if(!event||typeof event!=='object')return false;
  if(['audio','done','error','greeting','speech_unavailable'].includes(event.type))return true;
  if(event.type==='state'&&event.state!=='THINKING')return true;
  if(event.type==='coding_verification'&&event.status!=='running')return true;
  return false;
}

export function mountThinkingCapsule(win=window,doc=document){
  if(win.__myavatarThinkingCapsule)return win.__myavatarThinkingCapsule;
  const stage=doc.getElementById('stage');if(!stage)return null;
  const capsule=doc.createElement('div');capsule.id='thinking-capsule';capsule.className='thinking-capsule';capsule.hidden=true;
  capsule.setAttribute('role','status');capsule.setAttribute('aria-live','polite');capsule.setAttribute('aria-atomic','true');
  const dot=doc.createElement('span');dot.className='thinking-capsule-dot';dot.setAttribute('aria-hidden','true');
  const label=doc.createElement('span');label.className='thinking-capsule-label';capsule.append(dot,label);stage.append(capsule);
  let botId='robot',hideTimer=0;
  const hide=()=>{clearTimeout(hideTimer);hideTimer=0;capsule.hidden=true;label.textContent='';};
  const show=text=>{
    if(!Object.values(SAFE_LABELS).includes(text))return hide();
    clearTimeout(hideTimer);label.textContent=text;capsule.hidden=false;
    // A stale status should never remain visible if a downstream event is lost.
    hideTimer=setTimeout(hide,12000);
  };
  const onRuntime=event=>{
    const payload=event.detail;if(!payload||typeof payload!=='object')return;
    if(payload.type==='config')botId=payload.botId||payload.config?.conversation?.persona||botId;
    if(shouldHideThinkingCapsule(payload))hide();
    const text=thinkingLabelForRuntime(payload,botId);if(text)show(text);
  };
  const onClient=event=>{const text=thinkingLabelForClient(event.detail,botId);if(text)show(text);if(event.detail?.type==='stop')hide();};
  win.addEventListener('myavatar:runtime-event',onRuntime);win.addEventListener('myavatar:client-message',onClient);win.addEventListener('myavatar:socket-close',hide);
  const api={element:capsule,hide,show,destroy(){hide();win.removeEventListener('myavatar:runtime-event',onRuntime);win.removeEventListener('myavatar:client-message',onClient);win.removeEventListener('myavatar:socket-close',hide);capsule.remove();delete win.__myavatarThinkingCapsule;}};
  win.__myavatarThinkingCapsule=api;return api;
}
