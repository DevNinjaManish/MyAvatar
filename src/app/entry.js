import '../styles/base.css';
import {Avatar} from '../avatar/Avatar.js';
import {companions,companionById} from './companions.js';
import {ChatStore} from '../conversation/chat-store.js';
import {installRuntimeEventGuard} from '../conversation/runtime-events.js';
import {installSocketBridge} from '../conversation/socket-bridge.js';

const $=id=>document.getElementById(id);
const stage=$('stage');
const avatar=new Avatar(stage);
const chat=new ChatStore();
installSocketBridge(window);
installRuntimeEventGuard(window);
let selected='rivet';
let nextTurn=0;
let activeTurn=null;
let runtimeSocket=null;
let reconnectTimer=null;
let reconnectAttempts=0;
const MAX_RECONNECT_ATTEMPTS=3;

const desktop=globalThis.desktop;
const stopDrag=()=>{document.body.classList.remove('dragging');avatar.setDragging(false);desktop?.stopDrag?.();};
stage.addEventListener('pointerdown',event=>{if(event.button!==0)return;document.body.classList.add('dragging');avatar.setDragging(true);desktop?.startDrag?.();stage.setPointerCapture?.(event.pointerId);});
stage.addEventListener('pointerup',stopDrag);
stage.addEventListener('pointercancel',stopDrag);

function setOpen(id,open){
  const panel=$(id);panel.hidden=!open;
  if(id==='chat-panel'){$('chat-toggle').setAttribute('aria-expanded',String(open));$('chat-toggle').setAttribute('aria-label',open?'Close chat':'Open chat');desktop?.resize?.(open?770:470);if(open)$('message').focus({preventScroll:true});}
  if(id==='companion-picker')$('companion-toggle').setAttribute('aria-expanded',String(open));
}
function showNotice(text,retry=false,variant='info'){$('notice-text').textContent=text;$('notice').dataset.variant=variant;$('runtime-retry').hidden=!retry;$('notice').hidden=!text;}
function setRuntimeStatus(text){$('runtime-status').textContent=text;}
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
  socket.addEventListener('close',()=>{if(runtimeSocket!==socket)return;runtimeSocket=null;if(activeTurn!==null){chat.applyRuntimeEvent({type:'error',turn:activeTurn,message:'The local runtime disconnected.'});activeTurn=null;$('send-message').hidden=false;$('stop-response').hidden=true;}if(reconnectAttempts<MAX_RECONNECT_ATTEMPTS)scheduleRuntimeReconnect();else{setRuntimeStatus('Unavailable');showNotice('Runtime unavailable.',true,'warning');}});
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
window.addEventListener('myavatar:runtime-event',event=>{chat.applyRuntimeEvent(event.detail);if(event.detail?.type==='config')setRuntimeStatus('Ready');if(['done','error'].includes(event.detail?.type)){activeTurn=null;$('send-message').hidden=false;$('stop-response').hidden=true;}});

$('chat-toggle').addEventListener('click',()=>{setOpen('companion-picker',false);setOpen('chat-panel',$('chat-panel').hidden);});
$('chat-close').addEventListener('click',()=>setOpen('chat-panel',false));
$('clear-chat').addEventListener('click',()=>{chat.clear();activeTurn=null;$('send-message').hidden=false;$('stop-response').hidden=true;});
$('runtime-retry').addEventListener('click',()=>{reconnectAttempts=0;showNotice('');connectRuntime();});
$('companion-toggle').addEventListener('click',()=>{setOpen('chat-panel',false);setOpen('companion-picker',$('companion-picker').hidden);});
$('picker-close').addEventListener('click',()=>setOpen('companion-picker',false));
const options=$('companion-options');
for(const companion of companions){
  const button=document.createElement('button');button.type='button';button.dataset.companion=companion.id;button.style.setProperty('--companion-accent',companion.accent);
  button.innerHTML=`${companion.name}<small>${companion.description}</small>`;options.append(button);
  button.addEventListener('click',()=>{
    selected=companion.id;const current=companionById[selected];$('companion-name').textContent=current.name;stage.setAttribute('aria-label',`${current.name} avatar`);document.body.dataset.companion=selected;document.documentElement.style.setProperty('--accent',current.accent);
    avatar.showRobot(selected);setOpen('companion-picker',false);showNotice(`${current.name} selected.`);setTimeout(()=>showNotice(''),1600);
  });
}
$('mic-toggle').addEventListener('click',()=>showNotice('Voice input is not ready. Typed chat is available.',false,'warning'));
$('more-toggle').addEventListener('click',()=>showNotice('MVP keeps one conversation surface.'));
$('chat-form').addEventListener('submit',event=>{event.preventDefault();const text=$('message').value.trim();if(!text||activeTurn!==null)return;const socket=runtimeSocket;if(!socket||socket.readyState!==WebSocket.OPEN){connectRuntime();showNotice(socket?.readyState===WebSocket.CONNECTING?'Starting runtime…':'Runtime unavailable.',!socket||socket.readyState!==WebSocket.CONNECTING,'warning');return;}const turn=++nextTurn;activeTurn=turn;chat.addUserText(text,turn);chat.applyRuntimeEvent({type:'token',turn,text:'',botId:chat.botId});$('message').value='';$('send-message').hidden=true;$('stop-response').hidden=false;socket.send(JSON.stringify({type:'turn',turn,text,mode:'typed'}));});
$('stop-response').addEventListener('click',()=>{if(activeTurn===null)return;const turn=activeTurn;if(runtimeSocket?.readyState===WebSocket.OPEN)runtimeSocket.send(JSON.stringify({type:'stop',turn}));chat.interrupt(turn);activeTurn=null;$('send-message').hidden=false;$('stop-response').hidden=true;});
renderMessages();
connectRuntime();
