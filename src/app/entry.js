import '../styles/base.css';
import {Avatar} from '../avatar/Avatar.js';
import {companions,companionById} from './companions.js';
import {ChatStore} from '../conversation/chat-store.js';
import {installRuntimeEventGuard} from '../conversation/runtime-events.js';
import {installSocketBridge} from '../conversation/socket-bridge.js';
import {AppState,STATES} from '../conversation/state.js';
import {presenceStateForEvent} from '../conversation/presence.js';
import {turnPlayback} from '../audio/turn-playback.js';

const $=id=>document.getElementById(id);
const stage=$('stage');
const avatar=new Avatar(stage);
avatar.showRobot('nova');
const chat=new ChatStore();
const appState=new AppState();
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
let voiceRecorder=null;
let voiceStream=null;
let voiceChunks=[];
let voiceTurn=null;
let speechContext=null;
let speechSource=null;
let speechToken=null;
let paused=false;
let runtimeInfo=null;
const MAX_RECONNECT_ATTEMPTS=3;

const desktop=globalThis.desktop;
const stopDrag=()=>{document.body.classList.remove('dragging');avatar.setDragging(false);desktop?.stopDrag?.();};
stage.addEventListener('pointerdown',event=>{if(event.button!==0||(!event.target?.matches?.('canvas')&&event.target!==stage))return;document.body.classList.add('dragging');avatar.setDragging(true);desktop?.startDrag?.();stage.setPointerCapture?.(event.pointerId);});
stage.addEventListener('pointerup',stopDrag);
stage.addEventListener('pointercancel',stopDrag);

function setOpen(id,open){
  const panel=$(id);const changed=panel.hidden===open;panel.hidden=!open;
  if(id==='chat-panel'){$('chat-toggle').setAttribute('aria-expanded',String(open));$('chat-toggle').setAttribute('aria-label',open?'Close chat':'Open chat');if(changed)desktop?.resize?.(open?770:500);if(open)$('message').focus({preventScroll:true});}
  if(id==='companion-picker')$('companion-toggle').setAttribute('aria-expanded',String(open));
  if(id==='more-menu'){$('more-toggle').setAttribute('aria-expanded',String(open));$('more-toggle').setAttribute('aria-label',open?'Close more options':'More options');}
}
function showNotice(text,retry=false,variant='info'){const visible=Boolean(text);$('notice-text').textContent=text;$('notice').dataset.variant=variant;$('runtime-retry').hidden=!retry;$('notice').hidden=!visible;}
function setRuntimeStatus(text){$('runtime-status').textContent=text;}
function setPaused(value){paused=Boolean(value);appState.set(paused?STATES.PAUSED:STATES.IDLE);$('pause-toggle').textContent=paused?'Resume':'Pause';$('pause-toggle').setAttribute('aria-label',paused?'Resume companion':'Pause companion');setRuntimeStatus(paused?'Paused':'Ready');}
function setVoiceButton(active){$('mic-toggle').textContent=active?'Stop':'Mic';$('mic-toggle').setAttribute('aria-label',active?'Stop microphone':'Start microphone');$('mic-toggle').setAttribute('aria-pressed',String(active));}
function bytesToBase64(bytes){let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
function base64ToBytes(value){const binary=atob(value);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
function stopSpeechPlayback(){
  if(!speechSource)return false;
  const source=speechSource; const token=speechToken; speechSource=null; speechToken=null;
  if(token)turnPlayback.discardAudio(token);
  try{source.onended=null;source.stop();source.disconnect();}catch{}
  return true;
}
async function playSpeech(audioData,turn){
  speechContext??=new AudioContext();await speechContext.resume();
  const token=turnPlayback.beginAudioDecode();
  if(!token)return false;
  try{
    const buffer=await speechContext.decodeAudioData(base64ToBytes(audioData).buffer.slice(0));
    if(!turnPlayback.finishAudioDecode(token,true))return false;
    stopSpeechPlayback();
    const source=speechContext.createBufferSource();source.buffer=buffer;source.connect(speechContext.destination);
    speechSource=source;speechToken=token;turnPlayback.playbackStarted(token);showNotice('Speaking…');
    source.onended=()=>{if(speechSource!==source)return;speechSource=null;speechToken=null;turnPlayback.playbackEnded(token);if(!activeTurn){appState.set(STATES.IDLE);showNotice('');}};
    source.start();return true;
  }catch(error){turnPlayback.finishAudioDecode(token,false);throw error;}
}
function stopVoiceCapture(){if(!voiceRecorder)return false;voiceRecorder.stop();voiceStream?.getTracks().forEach(track=>track.stop());setVoiceButton(false);voiceStream=null;return true;}
async function startVoiceCapture(){
  const socket=runtimeSocket;
  if(paused){showNotice('Resume the companion before starting voice.',false,'info');return;}
  if(!socket||socket.readyState!==WebSocket.OPEN){showNotice('Conversation service unavailable. Typed chat is available.',true,'warning');return;}
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder!=='function'){showNotice('Microphone recording is unavailable. Typed chat is available.',false,'warning');return;}
  try{
    voiceStream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    const mime=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'';
    voiceRecorder=new MediaRecorder(voiceStream,mime?{mimeType:mime}:undefined);voiceChunks=[];setVoiceButton(true);showNotice('Listening…');
    voiceRecorder.addEventListener('dataavailable',event=>{if(event.data.size)voiceChunks.push(event.data);});
    voiceRecorder.addEventListener('stop',async()=>{
      const chunks=voiceChunks;voiceChunks=[];voiceRecorder=null;const blob=new Blob(chunks,{type:mime||'audio/webm'});if(!blob.size){showNotice('No microphone audio was captured. Typed chat is available.',false,'warning');return;}
    const turn=++nextTurn;voiceTurn=turn;activeTurn=turn;appState.set(STATES.THINKING);$('send-message').hidden=true;$('stop-response').hidden=false;showNotice('Transcribing…');
      try{socket.send(JSON.stringify({type:'voice',turn,audio:bytesToBase64(new Uint8Array(await blob.arrayBuffer())),mime:blob.type}));}
      catch(error){activeTurn=null;voiceTurn=null;$('send-message').hidden=false;$('stop-response').hidden=true;showNotice(`Voice unavailable: ${error.message}`,false,'warning');}
    },{once:true});
    voiceRecorder.start();appState.set(STATES.LISTENING);
  }catch(error){voiceStream?.getTracks().forEach(track=>track.stop());voiceStream=null;voiceRecorder=null;setVoiceButton(false);showNotice(`Microphone unavailable: ${error.message}`,false,'warning');}
}
function scheduleRuntimeReconnect(){
  if(reconnectTimer||reconnectAttempts>=MAX_RECONNECT_ATTEMPTS)return;
  reconnectAttempts+=1;setRuntimeStatus('Reconnecting…');
  reconnectTimer=setTimeout(()=>{reconnectTimer=null;connectRuntime();},Math.min(1000*2**(reconnectAttempts-1),4000));
}
function connectRuntime(){
  if(runtimeSocket&&(runtimeSocket.readyState===WebSocket.OPEN||runtimeSocket.readyState===WebSocket.CONNECTING))return;
  setRuntimeStatus(reconnectAttempts?'Reconnecting…':'Starting…');
  const socket=new WebSocket('ws://127.0.0.1:8787/?token=local-mvp');runtimeSocket=socket;
  socket.addEventListener('open',()=>{reconnectAttempts=0;setRuntimeStatus('Connecting…');});
  socket.addEventListener('error',()=>{if(runtimeSocket===socket)setRuntimeStatus('Unavailable');});
  socket.addEventListener('close',()=>{if(runtimeSocket!==socket)return;runtimeSocket=null;if(activeTurn!==null){chat.applyRuntimeEvent({type:'error',turn:activeTurn,message:'The local runtime disconnected.'});activeTurn=null;$('send-message').hidden=false;$('stop-response').hidden=true;}if(reconnectAttempts<MAX_RECONNECT_ATTEMPTS){setRuntimeStatus('Reconnecting…');showNotice('Reconnecting to the local runtime…',false,'info');scheduleRuntimeReconnect();}else{setRuntimeStatus('Unavailable');showNotice('Runtime unavailable. Typed chat will return when it reconnects.',true,'warning');}});
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
  if(detail?.type!=='done'||!speechSource)appState.set(nextPresence);
  if(detail?.type==='config'){
    const current=companionById[detail.botId];
    if(current){selected=current.id;$('companion-name').textContent=current.name;stage.setAttribute('aria-label',`${current.name} avatar`);document.body.dataset.companion=current.id;document.documentElement.style.setProperty('--accent',current.accent);avatar.showRobot(current.id);$('message').value=chat.draft(current.id);$('pause-toggle').textContent=paused?'Resume':'Pause';}
    runtimeInfo=detail.runtime||runtimeInfo;
    setRuntimeStatus('Ready');
  }
  if(detail?.type==='transcript')showNotice('Thinking…');
  if(detail?.type==='audio')playSpeech(detail.audio,detail.turn).catch(error=>{appState.set(STATES.IDLE);showNotice(`Speech output unavailable: ${error.message}`,false,'warning');});
  if(detail?.type==='speech_unavailable'){appState.set(STATES.IDLE);showNotice(detail.message,false,'warning');}
  if(['done','error'].includes(detail?.type)){activeTurn=null;voiceTurn=null;if(detail.type==='error'){stopSpeechPlayback();appState.set(STATES.IDLE);}else if(!speechSource)appState.set(STATES.IDLE);$('send-message').hidden=false;$('stop-response').hidden=true;if(detail.type==='error')showNotice(detail.message,false,'warning');}
});

$('chat-toggle').addEventListener('click',()=>{setOpen('companion-picker',false);setOpen('chat-panel',$('chat-panel').hidden);});
$('chat-close').addEventListener('click',()=>setOpen('chat-panel',false));
$('clear-chat').addEventListener('click',()=>{if(activeTurn!==null){const turn=activeTurn;if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'stop',turn}));stopSpeechPlayback();chat.interrupt(turn);}chat.clear();activeTurn=null;voiceTurn=null;appState.set(STATES.IDLE);$('message').value='';chat.setDraft('');$('send-message').hidden=false;$('stop-response').hidden=true;showNotice('');});
$('runtime-retry').addEventListener('click',()=>{reconnectAttempts=0;showNotice('');connectRuntime();});
$('companion-toggle').addEventListener('click',()=>{setOpen('chat-panel',false);setOpen('companion-picker',$('companion-picker').hidden);});
$('picker-close').addEventListener('click',()=>setOpen('companion-picker',false));
$('more-toggle').addEventListener('click',()=>{setOpen('chat-panel',false);setOpen('companion-picker',false);setOpen('more-menu',$('more-menu').hidden);});
$('more-close').addEventListener('click',()=>setOpen('more-menu',false));
$('pause-toggle').addEventListener('click',()=>{if(activeTurn!==null){showNotice('Stop the current response before pausing the companion.',false,'warning');return;}setPaused(!paused);setOpen('more-menu',false);showNotice(paused?'Companion paused.':'Companion resumed.',false,'info');});
$('runtime-health').addEventListener('click',()=>{const profile=runtimeInfo?.profile||'unknown';const provider=runtimeInfo?.provider||'unknown';showNotice(`Runtime: ${provider} · ${profile} · ${runtimeSocket?.readyState===WebSocket.OPEN?'connected':'unavailable'}`,false,runtimeSocket?.readyState===WebSocket.OPEN?'info':'warning');setOpen('more-menu',false);});
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
$('mic-toggle').addEventListener('click',()=>voiceRecorder?stopVoiceCapture():startVoiceCapture());
$('message').addEventListener('input',()=>chat.setDraft($('message').value));
$('chat-form').addEventListener('submit',event=>{event.preventDefault();const text=$('message').value.trim();if(paused){showNotice('Resume the companion before sending a message.',false,'info');return;}if(!text||activeTurn!==null)return;const socket=runtimeSocket;if(!socket||socket.readyState!==WebSocket.OPEN){connectRuntime();showNotice(socket?.readyState===WebSocket.CONNECTING?'Starting runtime…':'Runtime unavailable.',!socket||socket.readyState!==WebSocket.CONNECTING,'warning');return;}const turn=++nextTurn;activeTurn=turn;appState.set(STATES.THINKING);chat.addUserText(text,turn);chat.applyRuntimeEvent({type:'token',turn,text:'',botId:chat.botId});$('message').value='';$('send-message').hidden=true;$('stop-response').hidden=false;socket.send(JSON.stringify({type:'turn',turn,text,mode:'typed'}));});
$('stop-response').addEventListener('click',()=>{if(voiceRecorder){stopVoiceCapture();return;}if(activeTurn===null)return;const turn=activeTurn;if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'stop',turn}));stopSpeechPlayback();chat.interrupt(turn);activeTurn=null;voiceTurn=null;appState.set(STATES.IDLE);$('send-message').hidden=false;$('stop-response').hidden=true;showNotice('');});
renderMessages();
connectRuntime();
