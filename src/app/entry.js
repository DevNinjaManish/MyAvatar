import '../styles/base.css';
import {Avatar} from '../avatar/Avatar.js';
import {companions,companionById} from './companions.js';
import {ChatStore} from '../conversation/chat-store.js';
import {installRuntimeEventGuard} from '../conversation/runtime-events.js';
import {installSocketBridge} from '../conversation/socket-bridge.js';
import {AppState,STATES} from '../conversation/state.js';
import {presenceStateForEvent} from '../conversation/presence.js';
import {turnPlayback} from '../audio/turn-playback.js';
import {AudioEngine,endActiveCapture,resumeActiveLiveCapture,resample} from '../audio/engine.js';
import {addNovaItem,emptyNovaWorkspace,normalizeNovaWorkspace,removeNovaItem,toggleNovaItem} from '../nova/workspace-store.js';

const $=id=>document.getElementById(id);
const stage=$('stage');
const avatar=new Avatar(stage);
avatar.showRobot('nova');
const chat=new ChatStore();
const appState=new AppState();
const audioEngine=new AudioEngine(level=>avatar.setMouth(level));
globalThis.appState=appState;
appState.addEventListener('change',()=>{avatar.setState(appState.value);document.body.dataset.presence=appState.value.toLowerCase();$('barge-hint').hidden=appState.value!==STATES.SPEAKING;});
appState.set(STATES.SLEEPING);
document.body.dataset.presence=appState.value.toLowerCase();
installSocketBridge(window);
installRuntimeEventGuard(window);
let selected='nova';
let nextTurn=0;
let activeTurn=null;
let runtimeSocket=null;
let reconnectTimer=null;
let reconnectAttempts=0;
let voiceTurn=null;
let paused=false;
let runtimeInfo=null;
let liveVoiceEnabled=false;
let greetingSent=false;
let greetingTimer=null;
let profileSelection='auto';
let activeProfile='fast';
let recoveryTimer=null;
let streamingVoiceId=null,streamingFrames=[],streamingSamples=0,nextStreamingVoice=0;
let runtimeReady=false;
let bargePending=false;
let healthRequested=false;
const NOVA_WORKSPACE_STORAGE_KEY='myavatar-nova-workspace-v1';
let novaWorkspace=loadNovaWorkspace();
let novaCalendarCursor=new Date();
const MAX_RECONNECT_ATTEMPTS=Infinity;
const PROFILE_IDS=['auto','fast','balanced'];
const AVATAR_SCALES={small:.9,normal:1,large:1.08};
let avatarScale=localStorage.getItem('myavatar-avatar-scale');
let avatarGlow=localStorage.getItem('myavatar-avatar-glow')!=='off';
let quietMode=localStorage.getItem('myavatar-quiet-mode')==='on';
let glanceEnabled=localStorage.getItem('myavatar-glance-rail')!=='off';
let glanceCity=(localStorage.getItem('myavatar-glance-city')||'').trim();
if(!Object.hasOwn(AVATAR_SCALES,avatarScale))avatarScale='normal';
const presenceFallback={IDLE:'Ready',LISTENING:'Listening',THINKING:'Thinking',SPEAKING:'Speaking',WORKING:'Working',PAUSED:'Paused',SLEEPING:'Resting',ERROR:'Needs attention',RECOVERY:'Returning'};

const desktop=globalThis.desktop;
const stopDrag=()=>{document.body.classList.remove('dragging');avatar.setDragging(false);desktop?.stopDrag?.();};
stage.addEventListener('pointerdown',event=>{if(event.button!==0||(!event.target?.matches?.('canvas')&&event.target!==stage))return;document.body.classList.add('dragging');avatar.setDragging(true);desktop?.startDrag?.();stage.setPointerCapture?.(event.pointerId);});
stage.addEventListener('pointerup',stopDrag);
stage.addEventListener('pointercancel',stopDrag);
const platform=document.querySelector('.widget-card');
platform.addEventListener('pointerdown',event=>{if(event.button!==0||event.target.closest('button,input,textarea,select,label'))return;document.body.classList.add('dragging');avatar.setDragging(true);desktop?.startDrag?.();platform.setPointerCapture?.(event.pointerId);});
platform.addEventListener('pointerup',stopDrag);
platform.addEventListener('pointercancel',stopDrag);

function setOpen(id,open){
  const panel=$(id);const changed=panel.hidden===open;panel.hidden=!open;
  if(id==='chat-panel'){$('chat-toggle').setAttribute('aria-expanded',String(open));$('chat-toggle').setAttribute('aria-label',open?'Close chat':'Open chat');if(changed)desktop?.resize?.(open?770:520);if(open)$('message').focus({preventScroll:true});}
  if(id==='companion-picker')$('companion-toggle').setAttribute('aria-expanded',String(open));
  if(id==='more-menu'){document.body.classList.toggle('more-open',open);$('more-toggle').setAttribute('aria-expanded',String(open));$('more-toggle').setAttribute('aria-label',open?'Close more options':'More options');if(changed)desktop?.resize?.(520,open?630:260);}
  if(id==='nova-workspace'){document.body.classList.toggle('workspace-open',open);if(changed)desktop?.resize?.(520,open?630:260);}
}
function setPerformanceOpen(open){document.body.classList.toggle('performance-open',open);$('performance-panel').hidden=!open;if(open){desktop?.resize?.(520,630);healthRequested=true;runtimeSocket?.send(JSON.stringify({type:'health'}));}else desktop?.resize?.(520,$('more-menu').hidden?260:630);}
function showNotice(text,retry=false,variant='info'){const visible=Boolean(text);$('notice-text').textContent=text;$('notice').dataset.variant=variant;$('runtime-retry').hidden=!retry;$('notice').hidden=!visible;}
function setRuntimeStatus(text){$('runtime-status').textContent=text;$('stage-status').textContent=text;}
function setPresenceLine(){const companion=companionById[selected];$('presence-line').textContent=companion?.presence?.[appState.value]||presenceFallback[appState.value]||'Ready';}
function setRuntimeReady(value){runtimeReady=Boolean(value);document.body.classList.toggle('runtime-ready',runtimeReady);stage.setAttribute('aria-busy',String(!runtimeReady));for(const id of ['mic-toggle','pause-toggle','send-message'])$(id).disabled=!runtimeReady;}
function loadNovaWorkspace(){try{return normalizeNovaWorkspace(JSON.parse(localStorage.getItem(NOVA_WORKSPACE_STORAGE_KEY)||'{}'));}catch{return emptyNovaWorkspace();}}
function saveNovaWorkspace(){localStorage.setItem(NOVA_WORKSPACE_STORAGE_KEY,JSON.stringify(novaWorkspace));renderNovaWorkspace();}
function localDateLabel(value){if(!value)return 'Any time';const date=new Date(value);return Number.isNaN(date.valueOf())?'Any time':new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(date);}
function renderNovaList(id,items,kind){const list=$(id);list.replaceChildren();if(!items.length){const empty=document.createElement('li');empty.className='workspace-empty';empty.textContent=kind==='event'?'Nothing scheduled locally.':kind==='plan'?'One small step is enough.':'Nothing to remember yet.';list.append(empty);return;}for(const item of [...items].sort((a,b)=>(a.done-b.done)||(a.due||'').localeCompare(b.due||''))){const row=document.createElement('li');row.className=item.done?'is-done':'';const toggle=document.createElement('button');toggle.type='button';toggle.className='workspace-check';toggle.dataset.workspaceToggle=`${kind}:${item.id}`;toggle.setAttribute('aria-label',item.done?`Mark ${item.text} incomplete`:`Complete ${item.text}`);toggle.textContent=item.done?'✓':'';const copy=document.createElement('span');const label=document.createElement('b');label.textContent=item.text;copy.append(label);if(item.due){const due=document.createElement('small');due.textContent=localDateLabel(item.due);copy.append(due);}const remove=document.createElement('button');remove.type='button';remove.className='workspace-remove';remove.dataset.workspaceRemove=`${kind}:${item.id}`;remove.setAttribute('aria-label',`Remove ${item.text}`);remove.textContent='×';row.append(toggle,copy,remove);list.append(row);}}
function renderNovaCalendar(){const first=new Date(novaCalendarCursor.getFullYear(),novaCalendarCursor.getMonth(),1);$('nova-calendar-month').textContent=new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(first);const grid=$('nova-calendar-grid');grid.replaceChildren();const start=(first.getDay()+6)%7;const days=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();const today=new Date();for(let index=0;index<start;index+=1){const blank=document.createElement('span');blank.className='calendar-day is-blank';grid.append(blank);}for(let day=1;day<=days;day+=1){const date=new Date(first.getFullYear(),first.getMonth(),day);const node=document.createElement('span');const hasEvent=novaWorkspace.events.some(item=>{if(!item.due)return false;const due=new Date(item.due);return due.getFullYear()===date.getFullYear()&&due.getMonth()===date.getMonth()&&due.getDate()===date.getDate();});node.className=`calendar-day${date.toDateString()===today.toDateString()?' is-today':''}${hasEvent?' has-event':''}`;node.textContent=String(day);if(hasEvent)node.title='A local schedule item is planned';grid.append(node);}}
function renderNovaWorkspace(){const now=new Date();$('nova-workspace-date').textContent=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(now);$('nova-focus').value=novaWorkspace.focus;renderNovaCalendar();renderNovaList('nova-reminders',novaWorkspace.reminders,'reminder');renderNovaList('nova-events',novaWorkspace.events,'event');renderNovaList('nova-plan-list',novaWorkspace.plan,'plan');}
function setNovaWorkspaceOpen(open){if(open&&selected!=='nova'){showNotice('Nova’s Today workspace is available when Nova is active.',false,'info');return;}setOpen('more-menu',false);setOpen('companion-picker',false);setOpen('nova-workspace',open);if(open)renderNovaWorkspace();}
function applyAppearanceUi(){
  document.documentElement.style.setProperty('--avatar-scale',AVATAR_SCALES[avatarScale]);document.body.dataset.avatarGlow=String(avatarGlow);document.body.classList.toggle('quiet-mode',quietMode);document.body.classList.toggle('glance-enabled',glanceEnabled);
  for(const scale of Object.keys(AVATAR_SCALES))$(`avatar-scale-${scale}`).setAttribute('aria-pressed',String(scale===avatarScale));
  $('avatar-glow').setAttribute('aria-pressed',String(avatarGlow));$('avatar-glow').textContent=avatarGlow?'Presence glow':'Presence glow off';
  $('quiet-mode').setAttribute('aria-pressed',String(quietMode));$('quiet-mode').textContent=quietMode?'Quiet desktop on':'Quiet desktop';
  $('glance-toggle').setAttribute('aria-pressed',String(glanceEnabled));$('glance-toggle').textContent=glanceEnabled?'Glance rail on':'Glance rail';$('glance-city-control').textContent=glanceCity?`City · ${glanceCity}`:'Set city';
  $('appearance-summary').textContent=`${avatarScale==='normal'?'Natural':avatarScale[0].toUpperCase()+avatarScale.slice(1)} scale · glow ${avatarGlow?'on':'off'}${quietMode?' · quiet':''}${glanceEnabled?' · glance':''}`;
}
function selectAvatarScale(scale){if(!Object.hasOwn(AVATAR_SCALES,scale))return;avatarScale=scale;localStorage.setItem('myavatar-avatar-scale',scale);applyAppearanceUi();}
function setAvatarGlow(value){avatarGlow=Boolean(value);localStorage.setItem('myavatar-avatar-glow',avatarGlow?'on':'off');applyAppearanceUi();}
function setQuietMode(value){quietMode=Boolean(value);localStorage.setItem('myavatar-quiet-mode',quietMode?'on':'off');applyAppearanceUi();}
function updateGlanceRail(){const now=new Date();$('glance-date').textContent=new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric'}).format(now);$('glance-time').textContent=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(now);$('glance-city').hidden=!glanceCity;$('glance-city').textContent=glanceCity;}
function setGlanceCity(){const next=window.prompt('City for the glance rail',glanceCity);if(next===null)return;glanceCity=next.trim().slice(0,40);if(glanceCity)localStorage.setItem('myavatar-glance-city',glanceCity);else localStorage.removeItem('myavatar-glance-city');updateGlanceRail();applyAppearanceUi();}
setRuntimeReady(false);
applyAppearanceUi();
updateGlanceRail();
setInterval(updateGlanceRail,30000);
appState.addEventListener('change',setPresenceLine);
setPresenceLine();
function applyProfileUi({profile='fast',selection='auto',hardware=null,settings=null}={}){
  activeProfile=profile;profileSelection=selection;
  document.body.dataset.performance=profile;
  if(settings)avatar.configure({maxFps:settings.maxFps,effectFps:settings.effectFps,profile});
  for(const id of PROFILE_IDS){const button=$(`profile-${id}`);if(button)button.setAttribute('aria-pressed',String(id===selection));}
  const ram=hardware?.memoryGb?` (${hardware.memoryGb} GB RAM)`:'';
  $('profile-summary').textContent=selection==='auto'?`Auto · ${profile[0].toUpperCase()+profile.slice(1)}${ram}`:`${profile[0].toUpperCase()+profile.slice(1)} · selected manually`;
  $('deck-profile').textContent=profile.toUpperCase();
}
function compactGigabytes(megabytes){return Number.isFinite(megabytes)?`${Math.round(megabytes/1024)}G`:'—';}
function renderPerformance(metrics={},provider='unknown'){
  const memory=metrics.systemMemoryUsedMb?`${compactGigabytes(metrics.systemMemoryUsedMb)}/${compactGigabytes(metrics.systemMemoryTotalMb)}`:'—';
  const context=metrics.contextWindow?`${metrics.contextUsed||0}/${Math.round(metrics.contextWindow/1000)}K`:'—';
  const generation=Number.isFinite(metrics.tokensPerSecond)?`${metrics.tokensPerSecond}/s`:'—';
  const cpu=Number.isFinite(metrics.cpuPercent)?`${metrics.cpuPercent}%`:'—';
  $('deck-memory').textContent=memory;$('deck-context').textContent=context;$('deck-generation').textContent=generation;$('deck-cpu').textContent=cpu;
  $('metric-memory').textContent=metrics.systemMemoryUsedMb?`${metrics.systemMemoryUsedMb} / ${metrics.systemMemoryTotalMb} MB`:'Unavailable';
  $('metric-context').textContent=metrics.contextWindow?`${metrics.contextUsed||0} / ${metrics.contextWindow} tok`:'—';
  $('metric-generation').textContent=Number.isFinite(metrics.tokensPerSecond)?`${metrics.tokensPerSecond} tok/s`:'Awaiting a reply';
  $('metric-cpu').textContent=Number.isFinite(metrics.cpuPercent)?`${metrics.cpuPercent}% service`:'Sampling…';
  $('metric-model').textContent=metrics.model||runtimeInfo?.model||provider;
}
function selectProfile(selection){
  if(!PROFILE_IDS.includes(selection))return;
  if(activeTurn!==null){showNotice('Finish or stop the current response before changing performance.',false,'warning');return;}
  profileSelection=selection;localStorage.setItem('myavatar-performance-profile',selection);setOpen('more-menu',false);
  if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'set_profile',profile:selection}));
  else showNotice('Runtime unavailable. The profile will apply when it reconnects.',true,'warning');
}
function setPaused(value){if(!runtimeReady)return;paused=Boolean(value);if(paused){stopVoiceCapture();stopSpeechPlayback();turnPlayback.cancelTurn();}appState.set(paused?STATES.PAUSED:STATES.IDLE);$('pause-toggle').querySelector('[data-control-label]').textContent=paused?'Resume':'Pause';$('pause-toggle').setAttribute('aria-label',paused?'Resume companion':'Pause companion');setRuntimeStatus(paused?'Paused':'Ready');if(!paused)startVoiceCapture({automatic:false});}
function setVoiceButton(active){$('mic-toggle').querySelector('[data-control-label]').textContent=active?'Stop':'Mic';$('mic-toggle').setAttribute('aria-label',active?'Stop microphone':'Start microphone');$('mic-toggle').setAttribute('aria-pressed',String(active));}
function bytesToBase64(bytes){let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
function stopSpeechPlayback(){
  audioEngine.stop();
  avatar.setMouth(0);avatar.setExpression('relaxed');
  return true;
}
function recoverTurn(message='Ready'){
  clearTimeout(recoveryTimer);appState.set(STATES.ERROR);setRuntimeStatus(message);
  recoveryTimer=setTimeout(()=>{appState.set(STATES.RECOVERY);setRuntimeStatus('Recovering…');recoveryTimer=setTimeout(()=>{if(paused)return;appState.set(STATES.IDLE);setRuntimeStatus('Ready');resumeLiveListening();},650);},500);
}
function pcmToWavBase64(samples,sampleRate=16000){
  const buffer=new ArrayBuffer(44+samples.length*2);const view=new DataView(buffer);
  const write=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  write(0,'RIFF');view.setUint32(4,36+samples.length*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++){const sample=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,sample<0?sample*0x8000:sample*0x7fff,true);}
  return bytesToBase64(new Uint8Array(buffer));
}
function float32ToBase64(samples){return bytesToBase64(new Uint8Array(samples.buffer,samples.byteOffset,samples.byteLength));}
function flushStreamingSpeech(){
  if(!streamingVoiceId||!streamingSamples)return;
  const merged=new Float32Array(streamingSamples);let offset=0;for(const frame of streamingFrames){merged.set(frame,offset);offset+=frame.length;}
  streamingFrames=[];streamingSamples=0;
  runtimeSocket?.send(JSON.stringify({type:'voice_stream_audio',streamId:streamingVoiceId,audio:float32ToBase64(resample(merged,audioEngine.ctx?.sampleRate||16000))}));
}
function streamLiveSpeech(frame,{sampleRate}={}){
  if(!liveVoiceEnabled||activeTurn!==null||runtimeSocket?.readyState!==WebSocket.OPEN)return;
  if(!streamingVoiceId){streamingVoiceId=`voice-${++nextStreamingVoice}`;runtimeSocket.send(JSON.stringify({type:'voice_stream_start',streamId:streamingVoiceId}));}
  streamingFrames.push(frame.slice());streamingSamples+=frame.length;
  if(streamingSamples>=sampleRate*.16)flushStreamingSpeech();
}
function rejectLiveSpeech(){
  if(streamingVoiceId)runtimeSocket?.send(JSON.stringify({type:'voice_stream_cancel',streamId:streamingVoiceId}));
  streamingVoiceId=null;streamingFrames=[];streamingSamples=0;
}
function resumeLiveListening(){if(runtimeReady&&liveVoiceEnabled&&!paused&&turnPlayback.canResumeListening()){resumeActiveLiveCapture();appState.set(STATES.LISTENING);setVoiceButton(true);setRuntimeStatus('Listening');}}
function beginBargeIn(){
  if(!liveVoiceEnabled||paused)return;
  const turn=activeTurn??turnPlayback.activeTurn;if(turn===null)return;
  bargePending=true;runtimeSocket?.send(JSON.stringify({type:'stop',turn}));chat.interrupt(turn);turnPlayback.cancelTurn();stopSpeechPlayback();activeTurn=null;voiceTurn=null;
  appState.set(STATES.LISTENING);setRuntimeStatus('Listening…');showNotice('Listening—go ahead.',false,'info');
}
function handleVoiceUtterance(samples,{bargeIn=false}={}){
  if(bargeIn)beginBargeIn();
  if(!liveVoiceEnabled||paused||activeTurn!==null||runtimeSocket?.readyState!==WebSocket.OPEN)return;
  bargePending=false;
  const turn=++nextTurn;voiceTurn=turn;activeTurn=turn;appState.set(STATES.THINKING);setRuntimeStatus('Thinking…');$('send-message').hidden=true;$('stop-response').hidden=false;
  const streamId=streamingVoiceId;flushStreamingSpeech();if(streamId)runtimeSocket.send(JSON.stringify({type:'voice_stream_end',streamId}));streamingVoiceId=null;
  runtimeSocket.send(JSON.stringify({type:'voice',turn,audio:pcmToWavBase64(samples),mime:'audio/wav',streamId}));
}
async function startVoiceCapture({automatic=false}={}){
  if(liveVoiceEnabled)return true;
  if(!runtimeReady){if(!automatic)showNotice('Local models are still warming.',false,'info');return false;}
  if(paused){if(!automatic)showNotice('Resume the companion before starting voice.',false,'info');return false;}
  const socket=runtimeSocket;
  if(!socket||socket.readyState!==WebSocket.OPEN){if(!automatic)showNotice('Conversation service unavailable. Typed chat is available.',true,'warning');return false;}
  try{
    const started=await audioEngine.startLive(handleVoiceUtterance,{threshold:.0048,onsetMs:90,minSpeechMs:180,silenceMs:440,shortSilenceMs:300,shortTurnMs:520,preRollMs:260,calibrationMs:0,releaseRatio:.68,onLiveSpeechFrame:streamLiveSpeech,onLiveSpeechRejected:rejectLiveSpeech,onBargeIn:beginBargeIn,bargeIn:{guardMs:450,threshold:.018,onsetMs:140,confirmMs:320,minSpeechMs:220,silenceMs:320,preRollMs:220}});
    if(!started||!audioEngine.setListening(true))throw Error('Microphone listening could not be started.');
    liveVoiceEnabled=true;setVoiceButton(true);appState.set(STATES.LISTENING);setRuntimeStatus('Listening');if(!automatic)showNotice('Listening…');return true;
  }catch(error){endActiveCapture();liveVoiceEnabled=false;setVoiceButton(false);showNotice(`Microphone unavailable: ${error.message}`,false,'warning');return false;}
}
function stopVoiceCapture(){
  const wasActive=liveVoiceEnabled;rejectLiveSpeech();endActiveCapture();liveVoiceEnabled=false;setVoiceButton(false);if(wasActive){appState.set(paused?STATES.PAUSED:STATES.IDLE);setRuntimeStatus(paused?'Paused':'Ready');}return wasActive;
}
async function playGreeting(audioData){
  if(!audioData)return false;
  if(liveVoiceEnabled)stopVoiceCapture();
  stopSpeechPlayback();const turn=++nextTurn;turnPlayback.beginTurn(turn);turnPlayback.noteServerEvent({type:'audio',turn});
  const playing=audioEngine.enqueue(audioData,()=>{avatar.setExpression('happy');appState.set(STATES.SPEAKING);setRuntimeStatus('Speaking…');},()=>{avatar.setExpression('relaxed');showNotice('');startVoiceCapture({automatic:true});});
  turnPlayback.noteServerEvent({type:'done',turn});return playing;
}
async function playSpeech(audioData,turn){
  return audioEngine.enqueue(audioData,()=>{appState.set(STATES.SPEAKING);setRuntimeStatus('Speaking…');showNotice('');},()=>{
    if(turnPlayback.canResumeListening()){avatar.setExpression('relaxed');appState.set(STATES.IDLE);setRuntimeStatus('Ready');resumeLiveListening();showNotice('');$('send-message').hidden=false;$('stop-response').hidden=true;}
    else if(!audioEngine.queue.length){appState.set(STATES.THINKING);setRuntimeStatus('Thinking…');}
  });
}
function scheduleRuntimeReconnect(){
  if(reconnectTimer||reconnectAttempts>=MAX_RECONNECT_ATTEMPTS)return;
  reconnectAttempts+=1;setRuntimeStatus('Reconnecting…');
  reconnectTimer=setTimeout(()=>{reconnectTimer=null;connectRuntime();},Math.min(1000*2**Math.min(reconnectAttempts-1,4),10000));
}
function connectRuntime(){
  if(runtimeSocket&&(runtimeSocket.readyState===WebSocket.OPEN||runtimeSocket.readyState===WebSocket.CONNECTING))return;
  setRuntimeStatus(reconnectAttempts?'Reconnecting…':'Starting…');
  const saved=localStorage.getItem('myavatar-performance-profile');const startupProfile=PROFILE_IDS.includes(saved)?saved:'auto';
  const socket=new WebSocket(`ws://127.0.0.1:8787/?token=local-mvp&profile=${encodeURIComponent(startupProfile)}`);runtimeSocket=socket;
  socket.addEventListener('open',()=>{reconnectAttempts=0;setRuntimeStatus('Connecting…');});
  socket.addEventListener('error',()=>{if(runtimeSocket===socket)setRuntimeStatus('Unavailable');});
  socket.addEventListener('close',()=>{if(runtimeSocket!==socket)return;runtimeSocket=null;setRuntimeReady(false);stopVoiceCapture();clearTimeout(recoveryTimer);appState.set(STATES.ERROR);if(activeTurn!==null){chat.applyRuntimeEvent({type:'error',turn:activeTurn,message:'The local runtime disconnected.'});activeTurn=null;$('send-message').hidden=false;$('stop-response').hidden=true;}setRuntimeStatus('Unavailable');showNotice('Reconnecting to the local runtime…',false,'info');scheduleRuntimeReconnect();});
}
function renderMessages(){
  const messages=$('messages');
  const items=chat.snapshot();
  messages.replaceChildren();
  if(!items.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='What can I help with?';messages.append(empty);return;}
  for(const item of items){
    const row=document.createElement('p');row.className=`message ${item.role} ${item.status}`;
    const label=document.createElement('strong');label.textContent=item.role==='user'?'You':item.role==='assistant'?chat.botName:'Status';
    const text=document.createElement('span');text.textContent=item.text||item.meta?.error|| (item.status==='streaming'?'Thinking…':'');
    row.append(label,text);
    if(item.status==='failed'&&chat.canRetry(item)){const retry=document.createElement('button');retry.type='button';retry.dataset.retryTurn=String(item.turn);retry.textContent='Try again';row.append(retry);}
    messages.append(row);
  }
  messages.scrollTop=messages.scrollHeight;
}
chat.addEventListener('change',()=>{renderMessages();const focus=chat.focus();if(focus)localStorage.setItem('myavatar-last-topic',focus);});
 $('messages').addEventListener('click',event=>{const button=event.target.closest('[data-retry-turn]');if(!button||activeTurn!==null)return;const text=chat.userTextForTurn(Number(button.dataset.retryTurn));$('message').value=text;$('chat-form').requestSubmit();});
window.addEventListener('myavatar:runtime-event',event=>{
  const detail=event.detail;chat.applyRuntimeEvent(detail);const nextPresence=presenceStateForEvent(detail,appState.value);
  if(detail?.type!=='done'||(turnPlayback.canResumeListening()&&!bargePending))appState.set(nextPresence);
  if(detail?.type==='config'){
    setRuntimeReady(true);
    const current=companionById[detail.botId];
    if(current){selected=current.id;$('companion-name').textContent=current.name;$('chat-companion').textContent=current.name.toUpperCase();stage.setAttribute('aria-label',`${current.name} avatar`);document.body.dataset.companion=current.id;document.documentElement.style.setProperty('--accent',current.accent);avatar.showRobot(current.id);setPresenceLine();$('message').value=chat.draft(current.id);$('pause-toggle').querySelector('[data-control-label]').textContent=paused?'Resume':'Pause';$('workspace-toggle').disabled=current.id!=='nova';}
    runtimeInfo=detail.runtime||runtimeInfo;
    applyProfileUi({profile:detail.runtime?.profile||activeProfile,selection:detail.runtime?.profileSelection||profileSelection,hardware:detail.runtime?.hardware,settings:detail.runtime?.profileSettings});
    setRuntimeStatus(appState.value===STATES.RECOVERY?'Recovering…':'Ready');
    if(!greetingSent){greetingSent=true;clearTimeout(greetingTimer);greetingTimer=setTimeout(()=>startVoiceCapture({automatic:true}),8000);if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'greeting',recentTopic:localStorage.getItem('myavatar-last-topic')||'',previousGreeting:localStorage.getItem('myavatar-last-greeting')||''}));}
    else if(!liveVoiceEnabled&&!paused)startVoiceCapture({automatic:true});
  }
  if(detail?.type==='readiness'){
    setRuntimeReady(detail.readiness?.ready===true);
    if(detail.readiness?.state==='warming'){appState.set(STATES.SLEEPING);setRuntimeStatus(detail.readiness.message||'Warming…');}
    if(detail.readiness?.state==='unavailable'){appState.set(STATES.ERROR);setRuntimeStatus('Unavailable');showNotice(detail.readiness.message||'Runtime warmup failed.',true,'warning');}
  }
  if(detail?.type==='profile'){
    runtimeInfo={...runtimeInfo,profile:detail.profile,profileSelection:detail.selection,profileSettings:detail.settings,hardware:detail.hardware};
    applyProfileUi({profile:detail.profile,selection:detail.selection,hardware:detail.hardware,settings:detail.settings});
    showNotice(`${detail.selection==='auto'?'Auto':'Manual'} · ${detail.profile} profile active`,false,'info');
    setTimeout(()=>showNotice(''),1800);
  }
  if(detail?.type==='presence')setRuntimeStatus({IDLE:'Ready',LISTENING:'Listening',THINKING:'Understanding…',SPEAKING:'Speaking…',WORKING:'Working',PAUSED:'Paused',SLEEPING:'Sleeping',ERROR:'Needs attention',RECOVERY:'Recovering…'}[detail.state]||$('runtime-status').textContent);
  if(['job','delegation'].includes(detail?.type)&&['started','queued','running','working'].includes(detail.status))setRuntimeStatus('Working');
  if(detail?.type==='greeting'){
    clearTimeout(greetingTimer);greetingTimer=null;
    if(detail.text)localStorage.setItem('myavatar-last-greeting',detail.text);
    if(detail.audio)playGreeting(detail.audio).catch(()=>startVoiceCapture({automatic:true}));else{showNotice(detail.text||'Ready');startVoiceCapture({automatic:true});setTimeout(()=>showNotice(''),1600);}
  }
  if(detail?.type==='health'){
    const health=detail.health||{};
    const provider=health.provider||runtimeInfo?.provider||'unknown';
    const metrics=detail.metrics||{};$('performance-state').textContent=health.available?'Healthy':'Unavailable';renderPerformance(metrics,provider);
    if(healthRequested){healthRequested=false;if(health.available&&!document.body.classList.contains('performance-open'))showNotice(`Runtime: ${provider} · ${runtimeInfo?.profile||'unknown'} · ready`,false,'info');else if(!health.available)showNotice(`Runtime unavailable: ${health.reason||'provider health check failed.'}`,true,'warning');}
  }
  if(detail?.type==='transcript')showNotice(`Heard: ${detail.text}`);
  if(detail?.type==='partial_transcript'){setRuntimeStatus('Hearing…');showNotice('');}
  if(detail?.type==='recognizing'){setRuntimeStatus('Understanding…');showNotice('');}
  if(detail?.type==='audio'){setRuntimeStatus('Speaking…');if(detail.emotion)avatar.setExpression(detail.emotion);playSpeech(detail.audio,detail.turn).catch(error=>{avatar.setExpression('relaxed');appState.set(STATES.IDLE);showNotice(`Speech output unavailable: ${error.message}`,false,'warning');});}
  if(detail?.type==='speech_unavailable'){recoverTurn('Voice unavailable');showNotice(detail.message,false,'warning');}
  if(['done','error'].includes(detail?.type)){
    activeTurn=null;voiceTurn=null;
    if(detail.type==='error'){
      stopSpeechPlayback();recoverTurn('Needs attention');
    }else if(turnPlayback.canResumeListening()&&!bargePending){appState.set(STATES.IDLE);setRuntimeStatus('Ready');resumeLiveListening();}
    $('send-message').hidden=!turnPlayback.canResumeListening();$('stop-response').hidden=turnPlayback.canResumeListening();
    if(detail.type==='error'){
      const expectedEmptyTurn=detail.message?.includes('No speech was recognized');
      showNotice(expectedEmptyTurn?'':detail.message,false,expectedEmptyTurn?'info':'warning');
    }
  }
});

$('chat-toggle').addEventListener('click',()=>{setOpen('nova-workspace',false);setOpen('companion-picker',false);setOpen('chat-panel',$('chat-panel').hidden);});
$('chat-close').addEventListener('click',()=>setOpen('chat-panel',false));
$('clear-chat').addEventListener('click',()=>{if(activeTurn!==null){const turn=activeTurn;if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'stop',turn}));stopSpeechPlayback();chat.interrupt(turn);}chat.clear();activeTurn=null;voiceTurn=null;appState.set(STATES.IDLE);resumeLiveListening();$('message').value='';chat.setDraft('');$('send-message').hidden=false;$('stop-response').hidden=true;showNotice('');});
$('runtime-retry').addEventListener('click',()=>{reconnectAttempts=0;showNotice('');connectRuntime();});
$('companion-toggle').addEventListener('click',()=>{setNovaWorkspaceOpen(false);setOpen('chat-panel',false);setOpen('companion-picker',$('companion-picker').hidden);});
$('workspace-toggle').addEventListener('click',()=>setNovaWorkspaceOpen($('nova-workspace').hidden));
$('picker-close').addEventListener('click',()=>setOpen('companion-picker',false));
$('more-toggle').addEventListener('click',()=>{setOpen('nova-workspace',false);setOpen('chat-panel',false);setOpen('companion-picker',false);setOpen('more-menu',$('more-menu').hidden);});
$('more-close').addEventListener('click',()=>setOpen('more-menu',false));
$('companion-picker-menu').addEventListener('click',()=>{setOpen('more-menu',false);setOpen('companion-picker',true);});
$('nova-workspace-close').addEventListener('click',()=>setNovaWorkspaceOpen(false));
$('nova-calendar-prev').addEventListener('click',()=>{novaCalendarCursor=new Date(novaCalendarCursor.getFullYear(),novaCalendarCursor.getMonth()-1,1);renderNovaCalendar();});
$('nova-calendar-next').addEventListener('click',()=>{novaCalendarCursor=new Date(novaCalendarCursor.getFullYear(),novaCalendarCursor.getMonth()+1,1);renderNovaCalendar();});
$('nova-focus-form').addEventListener('submit',event=>{event.preventDefault();novaWorkspace=normalizeNovaWorkspace({...novaWorkspace,focus:$('nova-focus').value});saveNovaWorkspace();showNotice(novaWorkspace.focus?'Focus saved locally.':'Focus cleared.',false,'info');});
function addWorkspaceItem(kind,textId,dueId=null){const text=$(textId).value;const due=dueId?$(dueId).value:'';novaWorkspace=addNovaItem(novaWorkspace,kind,{text,due});$(textId).value='';if(dueId)$(dueId).value='';saveNovaWorkspace();}
$('nova-reminder-form').addEventListener('submit',event=>{event.preventDefault();addWorkspaceItem('reminder','nova-reminder','nova-reminder-due');});
$('nova-event-form').addEventListener('submit',event=>{event.preventDefault();addWorkspaceItem('event','nova-event','nova-event-due');});
$('nova-plan-form').addEventListener('submit',event=>{event.preventDefault();addWorkspaceItem('plan','nova-plan');});
$('nova-workspace').addEventListener('click',event=>{const toggle=event.target.closest('[data-workspace-toggle]');const remove=event.target.closest('[data-workspace-remove]');const action=toggle?.dataset.workspaceToggle||remove?.dataset.workspaceRemove;if(!action)return;const [kind,itemId]=action.split(':');novaWorkspace=toggle?toggleNovaItem(novaWorkspace,kind,itemId):removeNovaItem(novaWorkspace,kind,itemId);saveNovaWorkspace();});
$('pause-toggle').addEventListener('click',()=>{if(activeTurn!==null){showNotice('Stop the current response before pausing the companion.',false,'warning');return;}setPaused(!paused);setOpen('more-menu',false);showNotice(paused?'Companion paused.':'Companion resumed.',false,'info');});
$('runtime-health').addEventListener('click',()=>{if(runtimeSocket?.readyState!==WebSocket.OPEN){showNotice('Runtime unavailable. Reconnecting…',true,'warning');return;}setPerformanceOpen($('performance-panel').hidden);});
$('profile-auto').addEventListener('click',()=>selectProfile('auto'));
$('profile-fast').addEventListener('click',()=>selectProfile('fast'));
$('profile-balanced').addEventListener('click',()=>selectProfile('balanced'));
for(const scale of Object.keys(AVATAR_SCALES))$(`avatar-scale-${scale}`).addEventListener('click',()=>selectAvatarScale(scale));
$('avatar-glow').addEventListener('click',()=>setAvatarGlow(!avatarGlow));
$('quiet-mode').addEventListener('click',()=>setQuietMode(!quietMode));
$('glance-toggle').addEventListener('click',()=>{glanceEnabled=!glanceEnabled;localStorage.setItem('myavatar-glance-rail',glanceEnabled?'on':'off');applyAppearanceUi();});
$('glance-city-control').addEventListener('click',setGlanceCity);
$('hide-widget').addEventListener('click',()=>{setOpen('more-menu',false);desktop?.minimize?.();});
$('quit-app').addEventListener('click',()=>desktop?.close?.());
const options=$('companion-options');
for(const companion of companions){
  const button=document.createElement('button');button.type='button';button.dataset.companion=companion.id;button.style.setProperty('--companion-accent',companion.accent);
  button.innerHTML=`${companion.name}<small>${companion.description}</small>`;options.append(button);
  button.addEventListener('click',()=>{
    if(activeTurn!==null){setOpen('companion-picker',false);showNotice('Finish or stop the current response before switching companions.',false,'warning');return;}
    chat.setDraft($('message').value,selected);
    setNovaWorkspaceOpen(false);
    selected=companion.id;const current=companionById[selected];$('companion-name').textContent=current.name;$('chat-companion').textContent=current.name.toUpperCase();stage.setAttribute('aria-label',`${current.name} avatar`);document.body.dataset.companion=selected;document.documentElement.style.setProperty('--accent',current.accent);setPresenceLine();
    $('workspace-toggle').disabled=current.id!=='nova';
    avatar.showRobot(selected);setOpen('companion-picker',false);
    if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'switch_bot',botId:selected}));
    else showNotice('Runtime unavailable. Bot switching will apply when it reconnects.',true,'warning');
  });
}
$('mic-toggle').addEventListener('click',()=>liveVoiceEnabled?stopVoiceCapture():startVoiceCapture());
$('message').addEventListener('input',()=>chat.setDraft($('message').value));
$('chat-form').addEventListener('submit',event=>{event.preventDefault();const text=$('message').value.trim();if(!runtimeReady){showNotice('Local models are still warming.',false,'info');return;}if(paused){showNotice('Resume the companion before sending a message.',false,'info');return;}if(!text||activeTurn!==null||!turnPlayback.canResumeListening())return;const socket=runtimeSocket;if(!socket||socket.readyState!==WebSocket.OPEN){connectRuntime();showNotice(socket?.readyState===WebSocket.CONNECTING?'Starting runtime…':'Runtime unavailable.',!socket||socket.readyState!==WebSocket.CONNECTING,'warning');return;}const turn=++nextTurn;activeTurn=turn;appState.set(STATES.THINKING);setRuntimeStatus('Thinking…');chat.addUserText(text,turn);chat.applyRuntimeEvent({type:'token',turn,text:'',botId:chat.botId});$('message').value='';$('send-message').hidden=true;$('stop-response').hidden=false;socket.send(JSON.stringify({type:'turn',turn,text,mode:'typed',speak:liveVoiceEnabled}));});
$('stop-response').addEventListener('click',()=>{const turn=activeTurn??turnPlayback.activeTurn;if(turn===null)return;if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'stop',turn}));stopSpeechPlayback();chat.interrupt(turn);activeTurn=null;voiceTurn=null;appState.set(STATES.IDLE);setRuntimeStatus('Ready');resumeLiveListening();$('send-message').hidden=false;$('stop-response').hidden=true;showNotice('');});
renderMessages();
window.addEventListener('myavatar:socket-close',()=>stopSpeechPlayback());
$('clear-chat').addEventListener('click',()=>{if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'clear_history'}));});
connectRuntime();
setInterval(()=>{if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'health'}));},5000);
