const PROFILES={
  robot:{name:'Rivet',eyebrow:'CODING WORKSPACE',title:'Build and repair',description:'Repository context, current change, and verification stay together here.',mode:'coding',action:'Open coding view'},
  nova:{name:'Nova',eyebrow:'PERSONAL WORKSPACE',title:'Plan and follow through',description:'Keep the current goal, next action, and useful drafts in one place.',mode:'calendar',action:'Open planning view'},
  butler:{name:'Sterling',eyebrow:'EXECUTIVE WORKSPACE',title:'Priorities and decisions',description:'Keep important commitments, decisions, and next steps visible without clutter.',mode:'calendar',action:'Open planning view'},
  pixel:{name:'Pixel',eyebrow:'CAMPAIGN WORKSPACE',title:'Shape the next move',description:'Keep the active campaign, message, and experiment together while you work.',mode:'creative',action:'Open creative view'},
  luma:{name:'Luma',eyebrow:'DESIGN WORKSPACE',title:'Refine the experience',description:'Keep the active design brief, critique, and visual direction together.',mode:'creative',action:'Open creative view'},
};

const ACTIVITY={idle:'Ready',listening:'Listening',thinking:'Thinking',writing:'Preparing reply',speaking:'Speaking',complete:'Ready',interrupted:'Ready',failed:'Needs attention'};

export function workspaceProfile(botId){return PROFILES[botId]||PROFILES.nova;}
export function workspaceActivity(phase){return ACTIVITY[String(phase||'idle').toLowerCase()]||'Ready';}

export function rivetWorkspaceState(event,current={project:'No project selected',task:'No active change',verification:'Not running'}){
  if(!event||typeof event!=='object')return current;
  const next={...current};
  if(event.type==='coding_workspace')next.project=event.workspace?.name||event.workspace?.path||'Local project';
  if(event.type==='coding_context')next.task='Inspecting project context';
  if(event.type==='coding_patch')next.task='Change ready for review';
  if(event.type==='coding_verification'){
    const status=String(event.status||'').toLowerCase();
    next.verification=status==='running'?'Verification running':status==='cancelled'?'Verification cancelled':'Verification updated';
  }
  if(event.type==='coding_edit_result'){
    if(event.verification?.status==='passed')next.verification='Verification passed';
    else if(event.verification?.status==='failed')next.verification='Verification needs attention';
    if(event.result)next.task='Latest change applied';
  }
  return next;
}

export function mountUnifiedWorkspace(win=window,doc=document){
  if(win.__myavatarUnifiedWorkspace)return win.__myavatarUnifiedWorkspace;
  const main=doc.querySelector('main'),stage=doc.getElementById('stage');
  if(!main||!stage)return null;
  const shell=doc.createElement('section');shell.id='unified-workspace-shell';shell.setAttribute('aria-label','Companion workspace');
  shell.innerHTML='<div class="uws-head"><div><span class="uws-eyebrow"></span><h2></h2><p class="uws-description"></p></div><span class="uws-activity" role="status">Ready</span></div><div class="uws-focus"><span>Current focus</span><strong>No active focus yet</strong></div><div class="uws-context" hidden><div><span>Project</span><strong data-uws-project>No project selected</strong></div><div><span>Change</span><strong data-uws-task>No active change</strong></div><div><span>Checks</span><strong data-uws-verification>Not running</strong></div></div><div class="uws-actions"><button type="button" data-uws-open></button><button type="button" data-uws-chat>Conversation</button></div>';
  stage.insertAdjacentElement('afterend',shell);
  let botId='nova',phase='idle',rivet={project:'No project selected',task:'No active change',verification:'Not running'};
  const focusText=()=>win.__myavatarChatStore?.focus?.()||'No active focus yet';
  const render=()=>{
    const profile=workspaceProfile(botId);shell.dataset.bot=botId;
    shell.querySelector('.uws-eyebrow').textContent=profile.eyebrow;
    shell.querySelector('h2').textContent=profile.title;
    shell.querySelector('.uws-description').textContent=profile.description;
    shell.querySelector('.uws-activity').textContent=workspaceActivity(phase);
    shell.querySelector('.uws-focus strong').textContent=focusText();
    const context=shell.querySelector('.uws-context');context.hidden=botId!=='robot';
    shell.querySelector('[data-uws-project]').textContent=rivet.project;
    shell.querySelector('[data-uws-task]').textContent=rivet.task;
    shell.querySelector('[data-uws-verification]').textContent=rivet.verification;
    shell.querySelector('[data-uws-open]').textContent=profile.action;
    shell.querySelector('[data-uws-open]').dataset.mode=profile.mode;
  };
  const onRuntime=event=>{
    const payload=event.detail||{};
    if(payload.type==='config'&&typeof payload.config?.conversation?.persona==='string')botId=payload.config.conversation.persona;
    if(payload.type==='state')phase=String(payload.state||phase).toLowerCase();
    else if(payload.type==='token'||payload.type==='first_token')phase='writing';
    else if(payload.type==='audio')phase='speaking';
    else if(payload.type==='done')phase='complete';
    else if(payload.type==='error')phase='failed';
    rivet=rivetWorkspaceState(payload,rivet);render();
  };
  const onClient=event=>{if(event.detail?.type==='turn')phase='thinking';else if(event.detail?.type==='stop')phase='interrupted';render();};
  const onStore=()=>render();
  win.addEventListener('myavatar:runtime-event',onRuntime);win.addEventListener('myavatar:client-message',onClient);
  win.__myavatarChatStore?.addEventListener?.('change',onStore);
  shell.querySelector('[data-uws-open]').onclick=()=>{const mode=shell.querySelector('[data-uws-open]').dataset.mode;doc.querySelector(`[data-workspace-mode="${mode}"]`)?.click?.();};
  shell.querySelector('[data-uws-chat]').onclick=()=>{const transcript=doc.getElementById('transcript');if(transcript){transcript.hidden=false;doc.getElementById('text')?.focus?.();}};
  render();
  const api={snapshot:()=>({botId,phase,focus:focusText(),rivet:{...rivet}}),dispose(){win.removeEventListener('myavatar:runtime-event',onRuntime);win.removeEventListener('myavatar:client-message',onClient);win.__myavatarChatStore?.removeEventListener?.('change',onStore);shell.remove();delete win.__myavatarUnifiedWorkspace;}};
  win.__myavatarUnifiedWorkspace=api;return api;
}
