import '../styles/base.css';
import {Avatar} from '../avatar/Avatar.js';

const $=id=>document.getElementById(id);
const stage=$('stage');
const avatar=new Avatar(stage);
const companions={robot:'Rivet',nova:'Nova',butler:'Sterling',pixel:'Pixel',luma:'Luma'};
let selected='robot';

const desktop=globalThis.desktop;
const stopDrag=()=>{document.body.classList.remove('dragging');avatar.setDragging(false);desktop?.stopDrag?.();};
stage.addEventListener('pointerdown',event=>{if(event.button!==0)return;document.body.classList.add('dragging');avatar.setDragging(true);desktop?.startDrag?.();stage.setPointerCapture?.(event.pointerId);});
stage.addEventListener('pointerup',stopDrag);
stage.addEventListener('pointercancel',stopDrag);

function setOpen(id,open){
  const panel=$(id);panel.hidden=!open;
  if(id==='chat-panel'){$('chat-toggle').setAttribute('aria-expanded',String(open));$('chat-toggle').setAttribute('aria-label',open?'Close chat':'Open chat');if(open)$('message').focus();}
  if(id==='companion-picker')$('companion-toggle').setAttribute('aria-expanded',String(open));
}
function showNotice(text){$('notice').textContent=text;$('notice').hidden=!text;}

$('chat-toggle').addEventListener('click',()=>{setOpen('companion-picker',false);setOpen('chat-panel',$('chat-panel').hidden);});
$('chat-close').addEventListener('click',()=>setOpen('chat-panel',false));
$('companion-toggle').addEventListener('click',()=>{setOpen('chat-panel',false);setOpen('companion-picker',$('companion-picker').hidden);});
$('picker-close').addEventListener('click',()=>setOpen('companion-picker',false));
document.querySelectorAll('[data-companion]').forEach(button=>button.addEventListener('click',()=>{
  selected=button.dataset.companion; $('companion-name').textContent=companions[selected]; $('stage').setAttribute('aria-label',`${companions[selected]} avatar`); document.body.dataset.companion=selected;
  avatar.showRobot(selected);setOpen('companion-picker',false);showNotice(`${companions[selected]} selected.`);setTimeout(()=>showNotice(''),1600);
}));
$('mic-toggle').addEventListener('click',()=>showNotice('Microphone wiring will be added after the MVP shell is approved.'));
$('more-toggle').addEventListener('click',()=>showNotice('MVP keeps one conversation surface.'));
$('chat-form').addEventListener('submit',event=>{event.preventDefault();const text=$('message').value.trim();if(!text)return;showNotice('Conversation service wiring will be added in the next MVP implementation slice.');});
