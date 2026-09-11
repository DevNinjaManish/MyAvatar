import '../styles/base.css';
import {Avatar} from '../avatar/Avatar.js';
import {companions,companionById} from './companions.js';

const $=id=>document.getElementById(id);
const stage=$('stage');
const avatar=new Avatar(stage);
let selected='rivet';

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
const options=$('companion-options');
for(const companion of companions){
  const button=document.createElement('button');button.type='button';button.dataset.companion=companion.id;button.style.setProperty('--companion-accent',companion.accent);
  button.innerHTML=`${companion.name}<small>${companion.description}</small>`;options.append(button);
  button.addEventListener('click',()=>{
    selected=companion.id;const current=companionById[selected];$('companion-name').textContent=current.name;stage.setAttribute('aria-label',`${current.name} avatar`);document.body.dataset.companion=selected;document.documentElement.style.setProperty('--accent',current.accent);
    avatar.showRobot(selected);setOpen('companion-picker',false);showNotice(`${current.name} selected.`);setTimeout(()=>showNotice(''),1600);
  });
}
$('mic-toggle').addEventListener('click',()=>showNotice('Microphone wiring will be added after the MVP shell is approved.'));
$('more-toggle').addEventListener('click',()=>showNotice('MVP keeps one conversation surface.'));
$('chat-form').addEventListener('submit',event=>{event.preventDefault();const text=$('message').value.trim();if(!text)return;showNotice('Conversation service wiring will be added in the next MVP implementation slice.');});
