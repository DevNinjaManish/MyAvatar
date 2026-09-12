import '../styles/base.css';
import {Avatar} from '../avatar/Avatar.js';
import {companions,companionById} from './companions.js';
import {ChatStore} from '../conversation/chat-store.js';
import {installRuntimeEventGuard} from '../conversation/runtime-events.js';
import {installSocketBridge} from '../conversation/socket-bridge.js';
import {AppState,STATES} from '../conversation/state.js';
import {presenceStateForEvent} from '../conversation/presence.js';
import {turnPlayback} from '../audio/turn-playback.js';
import {AudioEngine,endActiveCapture,resumeActiveLiveCapture} from '../audio/engine.js';

const $=id=>document.getElementById(id);
const stage=$('stage');
const avatar=new Avatar(stage);
avatar.showRobot('nova');
const chat=new ChatStore();
const appState=new AppState();
const audioEngine=new AudioEngine(level=>avatar.setMouth(level));
globalThis.appState=appState;
appState.addEventListener('change',()=>avatar.setState(appState.value));
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
const MAX_RECONNECT_ATTEMPTS=Infinity;
const PROFILE_IDS=['auto','fast','balanced'];

const desktop=globalThis.desktop;
const stopDrag=()=>{document.body.classList.remove('dragging');avatar.setDragging(false);desktop?.stopDrag?.();};
stage.addEventListener('pointerdown',event=>{if(event.button!==0||(!event.target?.matches?.('canvas')&&event.target!==stage))return;document.body.classList.add('dragging');avatar.setDragging(true);desktop?.startDrag?.();stage.setPointerCapture?.(event.pointerId);});
stage.addEventListener('pointerup',stopDrag);
stage.addEventListener('pointercancel',stopDrag);

function setOpen(id,open){
  const panel=$(id);const changed=panel.hidden===open;panel.hidden=!open;
  if(id==='chat-panel'){$('chat-toggle').setAttribute('aria-expanded',String(open));$('chat-toggle').setAttribute('aria-label',open?'Close chat':'Open chat');if(changed)desktop?.resize?.(open?770:500);if(open)$('message').focus({preventScroll:true});}
  if(id==='companion-picker')$('companion-toggle').setAttribute('aria-expanded',String(open));
  if(id==='more-menu'){$('more-toggle').setAttribute('aria-expanded',String(open));$('more-toggle').setAttribute('aria-label',open?'Close more options':'More options');if(changed)desktop?.resize?.(open?770:500);}
}
function showNotice(text,retry=false,variant='info'){const visible=Boolean(text);$('notice-text').textContent=text;$('notice').dataset.variant=variant;$('runtime-retry').hidden=!retry;$('notice').hidden=!visible;}
function setRuntimeStatus(text){$('runtime-status').textContent=text;}
function applyProfileUi({profile='fast',selection='auto',hardware=null,settings=null}={}){
  activeProfile=profile;profileSelection=selection;
  if(settings)avatar.configure({maxFps:settings.maxFps,effectFps:settings.effectFps});
  for(const id of PROFILE_IDS){const button=$(`profile-${id}`);if(button)button.setAttribute('aria-pressed',String(id===selection));}
  const ram=hardware?.memoryGb?` (${hardware.memoryGb} GB RAM)`:'';
  $('profile-summary').textContent=selection==='auto'?`Auto · ${profile[0].toUpperCase()+profile.slice(1)}${ram}`:`${profile[0].toUpperCase()+profile.slice(1)} · selected manually`;
}
function selectProfile(selection){
  if(!PROFILE_IDS.includes(selection))return;
  if(activeTurn!==null){showNotice('Finish or stop the current response before changing performance.',false,'warning');return;}
  profileSelection=selection;localStorage.setItem('myavatar-performance-profile',selection);setOpen('more-menu',false);
  if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'set_profile',profile:selection}));
  else showNotice('Runtime unavailable. The profile will apply when it reconnects.',true,'warning');
}
function setPaused(value){paused=Boolean(value);if(paused){stopVoiceCapture();stopSpeechPlayback();turnPlayback.cancelTurn();}appState.set(paused?STATES.PAUSED:STATES.IDLE);$('pause-toggle').textContent=paused?'Resume':'Pause';$('pause-toggle').setAttribute('aria-label',paused?'Resume companion':'Pause companion');setRuntimeStatus(paused?'Paused':'Ready');if(!paused)startVoiceCapture({automatic:false});}
function setVoiceButton(active){$('mic-toggle').textContent=active?'Stop':'Mic';$('mic-toggle').setAttribute('aria-label',active?'Stop microphone':'Start microphone');$('mic-toggle').setAttribute('aria-pressed',String(active));}
function bytesToBase64(bytes){let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
function stopSpeechPlayback(){
  audioEngine.stop();
  avatar.setMouth(0);avatar.setExpression('relaxed');
  return true;
}
function pcmToWavBase64(samples,sampleRate=16000){
  const buffer=new ArrayBuffer(44+samples.length*2);const view=new DataView(buffer);
  const write=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  write(0,'RIFF');view.setUint32(4,36+samples.length*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++){const sample=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,sample<0?sample*0x8000:sample*0x7fff,true);}
  return bytesToBase64(new Uint8Array(buffer));
}
function resumeLiveListening(){if(liveVoiceEnabled&&!paused&&turnPlayback.canResumeListening()){resumeActiveLiveCapture();appState.set(STATES.LISTENING);setVoiceButton(true);setRuntimeStatus('Listening');}}
function handleVoiceUtterance(samples,{bargeIn=false}={}){
  if(bargeIn&&liveVoiceEnabled&&!paused){const turn=activeTurn??turnPlayback.activeTurn;if(turn!==null){runtimeSocket?.send(JSON.stringify({type:'stop',turn}));chat.interrupt(turn);}stopSpeechPlayback();activeTurn=null;}
  if(!liveVoiceEnabled||paused||activeTurn!==null||runtimeSocket?.readyState!==WebSocket.OPEN)return;
  const turn=++nextTurn;voiceTurn=turn;activeTurn=turn;appState.set(STATES.THINKING);setRuntimeStatus('Thinking…');$('send-message').hidden=true;$('stop-response').hidden=false;
  runtimeSocket.send(JSON.stringify({type:'voice',turn,audio:pcmToWavBase64(samples),mime:'audio/wav'}));
}
async function startVoiceCapture({automatic=false}={}){
  if(liveVoiceEnabled)return true;
  if(paused){if(!automatic)showNotice('Resume the companion before starting voice.',false,'info');return false;}
  const socket=runtimeSocket;
  if(!socket||socket.readyState!==WebSocket.OPEN){if(!automatic)showNotice('Conversation service unavailable. Typed chat is available.',true,'warning');return false;}
  try{
    const started=await audioEngine.startLive(handleVoiceUtterance,{threshold:.0055,onsetMs:110,minSpeechMs:220,silenceMs:650,preRollMs:220,onBargeIn:()=>{
      const turn=activeTurn??turnPlayback.activeTurn;if(turn!==null){runtimeSocket?.send(JSON.stringify({type:'stop',turn}));chat.interrupt(turn);}stopSpeechPlayback();activeTurn=null;appState.set(STATES.LISTENING);setRuntimeStatus('Listening');
    },bargeIn:{guardMs:500,threshold:.014,onsetMs:180,minSpeechMs:220,silenceMs:650,preRollMs:160}});
    if(!started||!audioEngine.setListening(true))throw Error('Microphone listening could not be started.');
    liveVoiceEnabled=true;setVoiceButton(true);appState.set(STATES.LISTENING);setRuntimeStatus('Listening');if(!automatic)showNotice('Listening…');return true;
  }catch(error){endActiveCapture();liveVoiceEnabled=false;setVoiceButton(false);showNotice(`Microphone unavailable: ${error.message}`,false,'warning');return false;}
}
function stopVoiceCapture(){
  const wasActive=liveVoiceEnabled;endActiveCapture();liveVoiceEnabled=false;setVoiceButton(false);if(wasActive){appState.set(paused?STATES.PAUSED:STATES.IDLE);setRuntimeStatus(paused?'Paused':'Ready');}return wasActive;
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
  const socket=new WebSocket('ws://127.0.0.1:8787/?token=local-mvp');runtimeSocket=socket;
  socket.addEventListener('open',()=>{reconnectAttempts=0;setRuntimeStatus('Connecting…');const saved=localStorage.getItem('myavatar-performance-profile');if(PROFILE_IDS.includes(saved)&&saved!=='auto')socket.send(JSON.stringify({type:'set_profile',profile:saved}));});
  socket.addEventListener('error',()=>{if(runtimeSocket===socket)setRuntimeStatus('Unavailable');});
  socket.addEventListener('close',()=>{if(runtimeSocket!==socket)return;runtimeSocket=null;stopVoiceCapture();if(activeTurn!==null){chat.applyRuntimeEvent({type:'error',turn:activeTurn,message:'The local runtime disconnected.'});activeTurn=null;$('send-message').hidden=false;$('stop-response').hidden=true;}setRuntimeStatus('Reconnecting…');showNotice('Reconnecting to the local runtime…',false,'info');scheduleRuntimeReconnect();});
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
chat.addEventListener('change',renderMessages);
 $('messages').addEventListener('click',event=>{const button=event.target.closest('[data-retry-turn]');if(!button||activeTurn!==null)return;const text=chat.userTextForTurn(Number(button.dataset.retryTurn));$('message').value=text;$('chat-form').requestSubmit();});
window.addEventListener('myavatar:runtime-event',event=>{
  const detail=event.detail;chat.applyRuntimeEvent(detail);const nextPresence=presenceStateForEvent(detail,appState.value);
  if(detail?.type!=='done'||turnPlayback.canResumeListening())appState.set(nextPresence);
  if(detail?.type==='config'){
    const current=companionById[detail.botId];
    if(current){selected=current.id;$('companion-name').textContent=current.name;stage.setAttribute('aria-label',`${current.name} avatar`);document.body.dataset.companion=current.id;document.documentElement.style.setProperty('--accent',current.accent);avatar.showRobot(current.id);$('message').value=chat.draft(current.id);$('pause-toggle').textContent=paused?'Resume':'Pause';}
    runtimeInfo=detail.runtime||runtimeInfo;
    applyProfileUi({profile:detail.runtime?.profile||activeProfile,selection:detail.runtime?.profileSelection||profileSelection,hardware:detail.runtime?.hardware,settings:detail.runtime?.profileSettings});
    setRuntimeStatus('Ready');
    if(!greetingSent){greetingSent=true;clearTimeout(greetingTimer);greetingTimer=setTimeout(()=>startVoiceCapture({automatic:true}),8000);if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'greeting'}));}
    else if(!liveVoiceEnabled&&!paused)startVoiceCapture({automatic:true});
  }
  if(detail?.type==='profile'){
    runtimeInfo={...runtimeInfo,profile:detail.profile,profileSelection:detail.selection,profileSettings:detail.settings,hardware:detail.hardware};
    applyProfileUi({profile:detail.profile,selection:detail.selection,hardware:detail.hardware,settings:detail.settings});
    showNotice(`${detail.selection==='auto'?'Auto':'Manual'} · ${detail.profile} profile active`,false,'info');
    setTimeout(()=>showNotice(''),1800);
  }
  if(detail?.type==='greeting'){
    clearTimeout(greetingTimer);greetingTimer=null;
    if(detail.audio)playGreeting(detail.audio).catch(()=>startVoiceCapture({automatic:true}));else{showNotice(detail.text||'Ready');startVoiceCapture({automatic:true});setTimeout(()=>showNotice(''),1600);}
  }
  if(detail?.type==='health'){
    const health=detail.health||{};
    const provider=health.provider||runtimeInfo?.provider||'unknown';
    if(health.available)showNotice(`Runtime: ${provider} · ${runtimeInfo?.profile||'unknown'} · ready`,false,'info');
    else showNotice(`Runtime unavailable: ${health.reason||'provider health check failed.'}`,true,'warning');
  }
  if(detail?.type==='transcript')showNotice('Thinking…');
  if(detail?.type==='audio'){setRuntimeStatus('Speaking…');if(detail.emotion)avatar.setExpression(detail.emotion);playSpeech(detail.audio,detail.turn).catch(error=>{avatar.setExpression('relaxed');appState.set(STATES.IDLE);showNotice(`Speech output unavailable: ${error.message}`,false,'warning');});}
  if(detail?.type==='speech_unavailable'){appState.set(STATES.IDLE);resumeLiveListening();showNotice(detail.message,false,'warning');}
  if(['done','error'].includes(detail?.type)){
    activeTurn=null;voiceTurn=null;
    if(detail.type==='error'){
      stopSpeechPlayback();appState.set(STATES.IDLE);resumeLiveListening();
    }else if(turnPlayback.canResumeListening()){appState.set(STATES.IDLE);setRuntimeStatus('Ready');resumeLiveListening();}
    $('send-message').hidden=!turnPlayback.canResumeListening();$('stop-response').hidden=turnPlayback.canResumeListening();
    if(detail.type==='error'){
      const expectedEmptyTurn=detail.message?.includes('No speech was recognized');
      showNotice(expectedEmptyTurn?'':detail.message,false,expectedEmptyTurn?'info':'warning');
    }
  }
});

$('chat-toggle').addEventListener('click',()=>{setOpen('companion-picker',false);setOpen('chat-panel',$('chat-panel').hidden);});
$('chat-close').addEventListener('click',()=>setOpen('chat-panel',false));
$('clear-chat').addEventListener('click',()=>{if(activeTurn!==null){const turn=activeTurn;if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'stop',turn}));stopSpeechPlayback();chat.interrupt(turn);}chat.clear();activeTurn=null;voiceTurn=null;appState.set(STATES.IDLE);resumeLiveListening();$('message').value='';chat.setDraft('');$('send-message').hidden=false;$('stop-response').hidden=true;showNotice('');});
$('runtime-retry').addEventListener('click',()=>{reconnectAttempts=0;showNotice('');connectRuntime();});
$('companion-toggle').addEventListener('click',()=>{setOpen('chat-panel',false);setOpen('companion-picker',$('companion-picker').hidden);});
$('picker-close').addEventListener('click',()=>setOpen('companion-picker',false));
$('more-toggle').addEventListener('click',()=>{setOpen('chat-panel',false);setOpen('companion-picker',false);setOpen('more-menu',$('more-menu').hidden);});
$('more-close').addEventListener('click',()=>setOpen('more-menu',false));
$('pause-toggle').addEventListener('click',()=>{if(activeTurn!==null){showNotice('Stop the current response before pausing the companion.',false,'warning');return;}setPaused(!paused);setOpen('more-menu',false);showNotice(paused?'Companion paused.':'Companion resumed.',false,'info');});
$('runtime-health').addEventListener('click',()=>{setOpen('more-menu',false);if(runtimeSocket?.readyState!==WebSocket.OPEN){showNotice('Runtime unavailable. Reconnecting…',true,'warning');return;}showNotice('Checking runtime health…',false,'info');runtimeSocket.send(JSON.stringify({type:'health'}));});
$('profile-auto').addEventListener('click',()=>selectProfile('auto'));
$('profile-fast').addEventListener('click',()=>selectProfile('fast'));
$('profile-balanced').addEventListener('click',()=>selectProfile('balanced'));
$('hide-widget').addEventListener('click',()=>{setOpen('more-menu',false);desktop?.minimize?.();});
$('quit-app').addEventListener('click',()=>desktop?.close?.());
const options=$('companion-options');
for(const companion of companions){
  const button=document.createElement('button');button.type='button';button.dataset.companion=companion.id;button.style.setProperty('--companion-accent',companion.accent);
  button.innerHTML=`${companion.name}<small>${companion.description}</small>`;options.append(button);
  button.addEventListener('click',()=>{
    if(activeTurn!==null){setOpen('companion-picker',false);showNotice('Finish or stop the current response before switching companions.',false,'warning');return;}
    chat.setDraft($('message').value,selected);
    selected=companion.id;const current=companionById[selected];$('companion-name').textContent=current.name;stage.setAttribute('aria-label',`${current.name} avatar`);document.body.dataset.companion=selected;document.documentElement.style.setProperty('--accent',current.accent);
    avatar.showRobot(selected);setOpen('companion-picker',false);
    if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'switch_bot',botId:selected}));
    else showNotice('Runtime unavailable. Bot switching will apply when it reconnects.',true,'warning');
  });
}
$('mic-toggle').addEventListener('click',()=>liveVoiceEnabled?stopVoiceCapture():startVoiceCapture());
$('message').addEventListener('input',()=>chat.setDraft($('message').value));
$('chat-form').addEventListener('submit',event=>{event.preventDefault();const text=$('message').value.trim();if(paused){showNotice('Resume the companion before sending a message.',false,'info');return;}if(!text||activeTurn!==null||!turnPlayback.canResumeListening())return;const socket=runtimeSocket;if(!socket||socket.readyState!==WebSocket.OPEN){connectRuntime();showNotice(socket?.readyState===WebSocket.CONNECTING?'Starting runtime…':'Runtime unavailable.',!socket||socket.readyState!==WebSocket.CONNECTING,'warning');return;}const turn=++nextTurn;activeTurn=turn;appState.set(STATES.THINKING);setRuntimeStatus('Thinking…');chat.addUserText(text,turn);chat.applyRuntimeEvent({type:'token',turn,text:'',botId:chat.botId});$('message').value='';$('send-message').hidden=true;$('stop-response').hidden=false;socket.send(JSON.stringify({type:'turn',turn,text,mode:'typed',speak:liveVoiceEnabled}));});
$('stop-response').addEventListener('click',()=>{const turn=activeTurn??turnPlayback.activeTurn;if(turn===null)return;if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'stop',turn}));stopSpeechPlayback();chat.interrupt(turn);activeTurn=null;voiceTurn=null;appState.set(STATES.IDLE);setRuntimeStatus('Ready');resumeLiveListening();$('send-message').hidden=false;$('stop-response').hidden=true;showNotice('');});
renderMessages();
window.addEventListener('myavatar:socket-close',()=>stopSpeechPlayback());
$('clear-chat').addEventListener('click',()=>{if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'clear_history'}));});
connectRuntime();
