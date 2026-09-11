const THINKING_CLASS={robot:'rivet',nova:'nova',butler:'sterling',pixel:'pixel',luma:'luma'};
const SAFE_STATES=new Set(['IDLE','LISTENING','THINKING','SPEAKING']);

export function clampMicLevel(value){
  const level=Number(value);
  if(!Number.isFinite(level)||level<=0)return 0;
  return Math.min(1,level);
}

export function presenceStateFromEvent(event,current='IDLE'){
  if(!event||typeof event!=='object')return current;
  if(event.type==='state'&&SAFE_STATES.has(event.state))return event.state;
  if(event.type==='audio')return 'SPEAKING';
  if(event.type==='error')return 'IDLE';
  return current;
}

export function thinkingProfile(botId){
  return THINKING_CLASS[botId]||'nova';
}

export function mountPresenceOrchestrator(win=window,doc=document){
  if(win.__myavatarPresenceOrchestrator)return win.__myavatarPresenceOrchestrator;
  const stage=doc.getElementById('stage');
  if(!stage)return null;
  let botId='robot',state='IDLE',micLevel=0;
  const render=()=>{
    stage.dataset.presenceState=state.toLowerCase();
    stage.dataset.thinkingProfile=thinkingProfile(botId);
    const listening=state==='LISTENING';
    const level=listening?micLevel:0;
    stage.style.setProperty('--listen-energy',level.toFixed(3));
    stage.style.setProperty('--listen-lift',`${(level*5).toFixed(2)}px`);
    stage.style.setProperty('--listen-scale',(1+level*.012).toFixed(4));
  };
  const onRuntime=event=>{
    const payload=event.detail||{};
    if(payload.type==='config'&&typeof payload.botId==='string')botId=payload.botId;
    state=presenceStateFromEvent(payload,state);
    if(state!=='LISTENING')micLevel=0;
    render();
  };
  const onMic=event=>{
    micLevel=clampMicLevel(event.detail?.level);
    if(micLevel>0&&state==='IDLE')state='LISTENING';
    render();
  };
  const onClose=()=>{state='IDLE';micLevel=0;render();};
  win.addEventListener('myavatar:runtime-event',onRuntime);
  win.addEventListener('myavatar:mic-level',onMic);
  win.addEventListener('myavatar:socket-close',onClose);
  render();
  const api={
    snapshot:()=>({botId,state,micLevel}),
    dispose(){win.removeEventListener('myavatar:runtime-event',onRuntime);win.removeEventListener('myavatar:mic-level',onMic);win.removeEventListener('myavatar:socket-close',onClose);delete win.__myavatarPresenceOrchestrator;}
  };
  win.__myavatarPresenceOrchestrator=api;return api;
}
