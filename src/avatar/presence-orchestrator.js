import {botPresenceProfile} from '../widget/bot-presence-profile.js';

const THINKING_CLASS={robot:'rivet',nova:'nova',butler:'sterling',pixel:'pixel',luma:'luma'};
const SAFE_STATES=new Set(['IDLE','LISTENING','THINKING','SPEAKING']);
const MOTION_TUNING={
  warm:{attentionMs:150,settleMs:520,listenLift:5.5,listenScale:.014,speakLift:1.6},
  composed:{attentionMs:190,settleMs:680,listenLift:3.4,listenScale:.008,speakLift:.8},
  snappy:{attentionMs:95,settleMs:300,listenLift:6.2,listenScale:.016,speakLift:1.8},
  calm:{attentionMs:175,settleMs:620,listenLift:4.2,listenScale:.01,speakLift:1.1},
  mechanical:{attentionMs:110,settleMs:360,listenLift:4.6,listenScale:.01,speakLift:1},
};

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

export function motionTuning(botId='nova'){
  const motion=botPresenceProfile(botId).motion;
  return {motion,...(MOTION_TUNING[motion]||MOTION_TUNING.warm)};
}

export function transitionPhase(previous,next){
  if(previous==='SPEAKING'&&next==='IDLE')return 'settling';
  if(previous==='IDLE'&&next==='LISTENING')return 'attentive';
  return 'active';
}

export function mountPresenceOrchestrator(win=window,doc=document,{setTimeoutFn=setTimeout,clearTimeoutFn=clearTimeout}={}){
  if(win.__myavatarPresenceOrchestrator)return win.__myavatarPresenceOrchestrator;
  const stage=doc.getElementById('stage');
  if(!stage)return null;
  let botId='robot',state='IDLE',phase='active',micLevel=0,phaseTimer=null;

  const cancelPhaseTimer=()=>{if(phaseTimer!==null){clearTimeoutFn(phaseTimer);phaseTimer=null;}};
  const settlePhase=(name,delay)=>{
    cancelPhaseTimer();
    phase=name;
    if(delay>0)phaseTimer=setTimeoutFn(()=>{phaseTimer=null;phase='active';render();},delay);
  };
  const render=()=>{
    const tuning=motionTuning(botId);
    stage.dataset.presenceState=state.toLowerCase();
    stage.dataset.presencePhase=phase;
    stage.dataset.presenceMotion=tuning.motion;
    stage.dataset.thinkingProfile=thinkingProfile(botId);
    const listening=state==='LISTENING';
    const level=listening?micLevel:0;
    stage.style.setProperty('--listen-energy',level.toFixed(3));
    stage.style.setProperty('--listen-lift',`${(level*tuning.listenLift).toFixed(2)}px`);
    stage.style.setProperty('--listen-scale',(1+level*tuning.listenScale).toFixed(4));
    stage.style.setProperty('--speak-lift',`${tuning.speakLift.toFixed(2)}px`);
  };
  const moveTo=next=>{
    if(next===state)return;
    const previous=state;
    state=next;
    const tuning=motionTuning(botId);
    const nextPhase=transitionPhase(previous,next);
    if(nextPhase==='settling')settlePhase('settling',tuning.settleMs);
    else if(nextPhase==='attentive')settlePhase('attentive',tuning.attentionMs);
    else {cancelPhaseTimer();phase='active';}
    if(state!=='LISTENING')micLevel=0;
  };
  const onRuntime=event=>{
    const payload=event.detail||{};
    if(payload.type==='config'&&typeof payload.botId==='string')botId=payload.botId;
    moveTo(presenceStateFromEvent(payload,state));
    render();
  };
  const onMic=event=>{
    micLevel=clampMicLevel(event.detail?.level);
    if(micLevel>0&&state==='IDLE')moveTo('LISTENING');
    render();
  };
  const onClose=()=>{cancelPhaseTimer();state='IDLE';phase='active';micLevel=0;render();};
  win.addEventListener('myavatar:runtime-event',onRuntime);
  win.addEventListener('myavatar:mic-level',onMic);
  win.addEventListener('myavatar:socket-close',onClose);
  render();
  const api={
    snapshot:()=>({botId,state,phase,micLevel,motion:motionTuning(botId).motion}),
    dispose(){cancelPhaseTimer();win.removeEventListener('myavatar:runtime-event',onRuntime);win.removeEventListener('myavatar:mic-level',onMic);win.removeEventListener('myavatar:socket-close',onClose);delete win.__myavatarPresenceOrchestrator;}
  };
  win.__myavatarPresenceOrchestrator=api;return api;
}
