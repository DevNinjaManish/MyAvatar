const PROFILES={
  robot:{name:'Rivet',eyebrow:'CODING WORKSPACE',title:'Build and repair',description:'Repository context, current change, and verification stay together here.',mode:'coding',action:'Open coding view'},
  nova:{name:'Nova',eyebrow:'PERSONAL WORKSPACE',title:'Plan and follow through',description:'Keep the current goal, next action, and useful drafts in one place.',mode:'calendar',action:'Open planning view'},
  butler:{name:'Sterling',eyebrow:'EXECUTIVE WORKSPACE',title:'Priorities and decisions',description:'Keep important commitments, decisions, and next steps visible without clutter.',mode:'calendar',action:'Open planning view'},
  pixel:{name:'Pixel',eyebrow:'CAMPAIGN WORKSPACE',title:'Shape the next move',description:'Keep the active campaign, message, and experiment together while you work.',mode:'creative',action:'Open creative view'},
  luma:{name:'Luma',eyebrow:'DESIGN WORKSPACE',title:'Refine the experience',description:'Keep the active design brief, critique, and visual direction together.',mode:'creative',action:'Open creative view'},
};

const ACTIVITY={idle:'Ready',listening:'Listening',understanding:'Understanding',context:'Checking context',planning:'Planning',working:'Working',verifying:'Verifying',needs_approval:'Needs approval',speaking:'Speaking',complete:'Ready',blocked:'Blocked',cancelled:'Cancelled',error:'Needs attention',thinking:'Thinking',writing:'Preparing reply',interrupted:'Ready',failed:'Needs attention'};
const EMPTY_RIVET={project:'No project selected',files:[],task:'No active change',verification:'Not running',transactionId:null,pending:false,repairAvailable:false,repairUsed:false,rollbackAvailable:false,repairRound:0,diffSummary:''};
const EMPTY_CALENDAR={available:false,label:'Calendar context unavailable in this session.',events:[]};

export function workspaceProfile(botId){return PROFILES[botId]||PROFILES.nova;}
export function workspaceActivity(phase){return ACTIVITY[String(phase||'idle').toLowerCase()]||'Ready';}

function compact(value,limit=120){const text=String(value??'').replace(/\s+/g,' ').trim();if(!text)return '';return text.length<=limit?text:text.slice(0,limit-1).trimEnd()+'…';}
function latestMessage(messages,role){return [...(Array.isArray(messages)?messages:[])].reverse().find(item=>item?.role===role&&item?.type==='message'&&String(item.text||'').trim());}

export function companionWorkspaceState(botId,{focus='',messages=[],draft='',calendar=EMPTY_CALENDAR}={}){
  const goal=compact(focus);const latestAssistant=latestMessage(messages,'assistant');const hasReply=Boolean(latestAssistant&&['complete','streaming'].includes(latestAssistant.status));
  const draftText=compact(draft);const calendarState={...EMPTY_CALENDAR,...(calendar||{}),events:Array.isArray(calendar?.events)?calendar.events.slice(0,3):[]};
  if(botId==='butler')return {botId,kind:'sterling',focusLabel:'Current priority',focus:goal||'No priority captured yet',modules:[['Unfinished commitment',goal?'Captured from this session':'Nothing captured yet'],['Active decision',goal&&/\b(decide|decision|choose|choice|should|whether)\b/i.test(goal)?goal:'No active decision captured'],['Recommended next step',goal?'Choose the smallest action that moves this priority forward.':'State the commitment or decision to prioritise.'],['Planning context',calendarState.available?(calendarState.label||'Calendar context available'):calendarState.label]],draft:draftText?`Draft in progress · ${draftText}`:hasReply?'Latest reply is available in conversation':'No draft yet',calendar:calendarState};
  if(botId==='nova')return {botId,kind:'nova',focusLabel:'Current goal',focus:goal||'No active goal captured yet',modules:[['Practical next action',goal?'Choose one concrete next step for this goal.':'State the goal you want to move forward.'],['Active plan',hasReply?'Plan is captured in the conversation.':'Plan will appear here as the conversation develops.'],['Useful output',draftText?`Draft in progress · ${draftText}`:hasReply?'Latest reply is available in conversation':'No draft yet'],['Planning context',calendarState.available?(calendarState.label||'Calendar context available'):calendarState.label]],draft:draftText,calendar:calendarState};
  return {botId,kind:'shared',focusLabel:'Current focus',focus:goal||'No active focus yet',modules:[],draft:draftText,calendar:calendarState};
}

export function rivetPatchSummary(transaction={}){
  const files=Array.isArray(transaction.files)?transaction.files:[];
  if(!files.length)return 'Change ready for review';
  const additions=files.reduce((sum,file)=>sum+(Number(file?.additions)||0),0);
  const deletions=files.reduce((sum,file)=>sum+(Number(file?.deletions)||0),0);
  return `${files.length} file${files.length===1?'':'s'} · +${additions}/-${deletions}`;
}

export function rivetWorkspaceState(event,current=EMPTY_RIVET){
  if(!event||typeof event!=='object')return current;
  const next={...EMPTY_RIVET,...current,files:[...(current.files||[])]};
  if(event.type==='coding_workspace'){
    next.project=event.workspace?.name||event.workspace?.path||'Local project';
    next.files=[];next.task='Ready for a coding task';next.verification='Not running';next.transactionId=null;next.pending=false;next.repairAvailable=false;next.repairUsed=false;next.rollbackAvailable=false;next.repairRound=0;next.diffSummary='';
  }
  if(event.type==='coding_context'){
    next.files=Array.isArray(event.paths)?event.paths.slice(0,8):[];
    next.task=next.files.length?`Inspecting ${next.files.length} project file${next.files.length===1?'':'s'}`:'Inspecting project context';
  }
  if(event.type==='coding_patch'){
    const tx=event.transaction||{};
    next.transactionId=tx.id||null;next.pending=Boolean(next.transactionId);next.repairRound=Number(tx.repairRound)||0;next.repairUsed=next.repairRound>=1;next.repairAvailable=false;next.rollbackAvailable=false;
    next.files=Array.isArray(tx.files)?tx.files.map(file=>file.path).filter(Boolean).slice(0,8):next.files;
    next.diffSummary=rivetPatchSummary(tx);next.task=next.repairRound===1?'Repair ready for review':'Change ready for review';next.verification='Waiting for approval';
  }
  if(event.type==='coding_verification'){
    const status=String(event.status||'').toLowerCase();
    next.verification=status==='running'?'Verification running':status==='cancelled'?'Verification cancelled':'Verification updated';
    if(status==='running'){next.pending=false;next.repairAvailable=false;}
  }
  if(event.type==='coding_edit_result'){
    const result=event.result||{};const verification=event.verification||{};const status=String(verification.status||'').toLowerCase();
    if(result.id)next.transactionId=result.id;
    next.pending=false;next.rollbackAvailable=Boolean(result.rollbackAvailable);
    if(event.repairRound!=null)next.repairRound=Number(event.repairRound)||0;
    if(result.repairRound!=null)next.repairRound=Number(result.repairRound)||0;
    next.repairUsed=next.repairRound>=1;
    if(status==='passed'){next.verification='Verification passed';next.repairAvailable=false;next.task='Latest change applied';}
    else if(status==='failed'){next.verification='Verification needs attention';next.repairAvailable=!next.repairUsed&&Boolean(next.transactionId);next.task=next.repairUsed?'Repair attempt used · review manually':'Change needs repair';}
    else if(event.error){next.verification='Coding action failed';next.repairAvailable=false;next.task='Needs attention';}
    else if(result){next.task='Latest change applied';}
  }
  return next;
}

export function rivetActionAvailability(state={}){
  return {
    approve:Boolean(state.pending&&state.transactionId),
    reject:Boolean(state.pending&&state.transactionId),
    repair:Boolean(state.repairAvailable&&state.transactionId),
    rollback:Boolean(state.rollbackAvailable&&state.transactionId),
  };
}

function sendCoding(win,payload){
  const socket=win.__myAvatarSocket;
  if(!socket||socket.readyState!==win.WebSocket?.OPEN)throw new Error('Local service is disconnected.');
  socket.send(JSON.stringify(payload));
}

export function mountUnifiedWorkspace(win=window,doc=document){
  if(win.__myavatarUnifiedWorkspace)return win.__myavatarUnifiedWorkspace;
  const main=doc.querySelector('main'),stage=doc.getElementById('stage');
  if(!main||!stage)return null;
  const shell=doc.createElement('section');shell.id='unified-workspace-shell';shell.setAttribute('aria-label','Companion workspace');
  shell.innerHTML='<div class="uws-head"><div><span class="uws-eyebrow"></span><h2></h2><p class="uws-description"></p></div><span class="uws-activity" role="status">Ready</span></div><div class="uws-focus"><span>Current focus</span><strong>No active focus yet</strong></div><div class="uws-context" hidden><div><span>Project</span><strong data-uws-project>No project selected</strong></div><div><span>Files</span><strong data-uws-files>No files inspected</strong></div><div><span>Change</span><strong data-uws-task>No active change</strong></div><div><span>Checks</span><strong data-uws-verification>Not running</strong></div></div><div class="uws-diff" hidden><span>Current patch</span><strong data-uws-diff></strong></div><div class="uws-rivet-actions" hidden><button type="button" data-uws-approve>Apply change</button><button type="button" data-uws-reject>Reject</button><button type="button" data-uws-repair>Propose one repair</button><button type="button" data-uws-rollback>Rollback</button><small data-uws-action-status role="status"></small></div><div class="uws-actions"><button type="button" data-uws-open></button><button type="button" data-uws-chat>Conversation</button></div>';
  stage.insertAdjacentElement('afterend',shell);
  const focusLabel=shell.querySelector('.uws-focus span');
  const modules=doc.createElement('div');modules.className='uws-modules';modules.hidden=true;shell.querySelector('.uws-focus').insertAdjacentElement('afterend',modules);
  const taskPanel=doc.createElement('div');taskPanel.className='uws-task';taskPanel.hidden=true;shell.querySelector('.uws-focus').insertAdjacentElement('afterend',taskPanel);
  let botId='nova',phase='idle',rivet={...EMPTY_RIVET,files:[]},calendar={...EMPTY_CALENDAR,...(win.__myavatarCalendarContext||{})},agentState=null;
  const focusText=()=>win.__myavatarChatStore?.focus?.()||'No active focus yet';
  const actionStatus=shell.querySelector('[data-uws-action-status]');
  const render=()=>{
    const profile=workspaceProfile(botId);shell.dataset.bot=botId;
    shell.querySelector('.uws-eyebrow').textContent=profile.eyebrow;
    shell.querySelector('h2').textContent=profile.title;
    shell.querySelector('.uws-description').textContent=profile.description;
    shell.querySelector('.uws-activity').textContent=workspaceActivity(phase);
    const companion=companionWorkspaceState(botId,{focus:focusText(),messages:win.__myavatarChatStore?.snapshot?.(botId)||[],draft:win.__myavatarChatStore?.draft?.(botId)||'',calendar});
    focusLabel.textContent=companion.focusLabel;shell.querySelector('.uws-focus strong').textContent=companion.focus;
    modules.hidden=!companion.modules.length;modules.replaceChildren();for(const [label,value] of companion.modules){const item=doc.createElement('div');const heading=doc.createElement('span');heading.textContent=label;const detail=doc.createElement('strong');detail.textContent=value;item.append(heading,detail);modules.append(item);}
    taskPanel.hidden=!agentState;taskPanel.replaceChildren();if(agentState){const title=doc.createElement('span');title.textContent='Active task';const goal=doc.createElement('strong');goal.textContent=agentState.goal||'Current task';const status=doc.createElement('small');status.textContent=`${agentState.phase||'IDLE'} · ${agentState.status||'active'}`;taskPanel.append(title,goal,status);const steps=(agentState.steps||[]).slice(0,5);if(steps.length){const list=doc.createElement('ol');for(const step of steps){const item=doc.createElement('li');item.dataset.status=step.status||'pending';item.textContent=step.label;list.append(item);}taskPanel.append(list);}for(const [label,value,extra] of [['Observation',agentState.observation],['Verification',agentState.verification?.message||agentState.verification?.status],['Result',agentState.result]]){if(value){const detail=doc.createElement('small');detail.className=extra?'uws-task-blocker':'';detail.textContent=`${label}: ${value}`;taskPanel.append(detail);}}if(agentState.blocker){const blocker=doc.createElement('small');blocker.className='uws-task-blocker';blocker.textContent=agentState.blocker;taskPanel.append(blocker);}}
    const context=shell.querySelector('.uws-context');context.hidden=botId!=='robot';
    shell.querySelector('[data-uws-project]').textContent=rivet.project;
    shell.querySelector('[data-uws-files]').textContent=rivet.files.length?rivet.files.join(' · '):'No files inspected';
    shell.querySelector('[data-uws-task]').textContent=rivet.task;
    shell.querySelector('[data-uws-verification]').textContent=rivet.verification;
    const diff=shell.querySelector('.uws-diff');diff.hidden=botId!=='robot'||!rivet.diffSummary;shell.querySelector('[data-uws-diff]').textContent=rivet.diffSummary;
    const actions=shell.querySelector('.uws-rivet-actions');actions.hidden=botId!=='robot';
    const available=rivetActionAvailability(rivet);
    for(const [name,enabled] of Object.entries(available)){const button=shell.querySelector(`[data-uws-${name}]`);if(button){button.hidden=!enabled;button.disabled=!enabled;}}
    shell.querySelector('[data-uws-open]').textContent=profile.action;
    shell.querySelector('[data-uws-open]').dataset.mode=profile.mode;
  };
  const act=(type)=>{
    if(!rivet.transactionId)return;
    try{
      actionStatus.textContent='';
      if(type==='approve'||type==='reject')sendCoding(win,{type:'coding_edit_decision',transactionId:rivet.transactionId,decision:type,turn:null});
      else if(type==='repair')sendCoding(win,{type:'coding_repair',transactionId:rivet.transactionId,turn:null});
      else if(type==='rollback')sendCoding(win,{type:'coding_rollback',transactionId:rivet.transactionId,turn:null});
      if(type==='approve'||type==='reject')rivet={...rivet,pending:false};
      if(type==='repair')rivet={...rivet,repairAvailable:false};
      if(type==='rollback')rivet={...rivet,rollbackAvailable:false};
      render();
    }catch(error){actionStatus.textContent=String(error?.message||error);}
  };
  shell.querySelector('[data-uws-approve]').onclick=()=>act('approve');
  shell.querySelector('[data-uws-reject]').onclick=()=>act('reject');
  shell.querySelector('[data-uws-repair]').onclick=()=>act('repair');
  shell.querySelector('[data-uws-rollback]').onclick=()=>act('rollback');
  const onRuntime=event=>{
    const payload=event.detail||{};
    if(payload.type==='config'&&typeof payload.config?.conversation?.persona==='string'){botId=payload.config.conversation.persona;agentState=null;}
    if(payload.type==='calendar_context')calendar={...EMPTY_CALENDAR,...payload};
    if(payload.type==='agent_state'&&payload.agentState?.phase){agentState=payload.agentState;phase=String(payload.agentState.phase).toLowerCase();}
    if(payload.type==='state')phase=String(payload.state||phase).toLowerCase();
    else if(payload.type==='token'||payload.type==='first_token')phase='writing';
    else if(payload.type==='audio')phase='speaking';
    else if(payload.type==='done')phase='complete';
    else if(payload.type==='error')phase='failed';
    rivet=rivetWorkspaceState(payload,rivet);if(payload.type.startsWith?.('coding_'))actionStatus.textContent='';render();
  };
  const onClient=event=>{if(event.detail?.type==='turn')phase='thinking';else if(event.detail?.type==='stop')phase='interrupted';render();};
  const onCalendar=event=>{calendar={...EMPTY_CALENDAR,...(event.detail||{})};render();};
  const onAgentTask=event=>{if(event.detail?.botId==='robot'&&event.detail?.id){agentState={...event.detail};phase=String(event.detail.phase||phase).toLowerCase();render();}};
  const onStore=()=>render();
  win.addEventListener('myavatar:runtime-event',onRuntime);win.addEventListener('myavatar:client-message',onClient);win.addEventListener('myavatar:calendar-context',onCalendar);win.addEventListener('myavatar:agent-task',onAgentTask);
  win.__myavatarChatStore?.addEventListener?.('change',onStore);
  shell.querySelector('[data-uws-open]').onclick=()=>{const mode=shell.querySelector('[data-uws-open]').dataset.mode;doc.querySelector(`[data-workspace-mode="${mode}"]`)?.click?.();};
  shell.querySelector('[data-uws-chat]').onclick=()=>{const transcript=doc.getElementById('transcript');if(transcript){transcript.hidden=false;doc.getElementById('text')?.focus?.();}};
  render();
  const api={snapshot:()=>({botId,phase,focus:focusText(),agentState,companion:companionWorkspaceState(botId,{focus:focusText(),messages:win.__myavatarChatStore?.snapshot?.(botId)||[],draft:win.__myavatarChatStore?.draft?.(botId)||'',calendar}),rivet:{...rivet,files:[...rivet.files]}}),dispose(){win.removeEventListener('myavatar:runtime-event',onRuntime);win.removeEventListener('myavatar:client-message',onClient);win.removeEventListener('myavatar:calendar-context',onCalendar);win.removeEventListener('myavatar:agent-task',onAgentTask);win.__myavatarChatStore?.removeEventListener?.('change',onStore);shell.remove();delete win.__myavatarUnifiedWorkspace;}};
  win.__myavatarUnifiedWorkspace=api;return api;
}
