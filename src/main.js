import './style.css';
import {Avatar} from './avatar/Avatar.js';
import {AudioEngine,toBase64} from './audio/engine.js';
import {AppState} from './conversation/state.js';
const $=id=>document.getElementById(id);
const avatar=new Avatar($('stage'));const audio=new AudioEngine(v=>avatar.setMouth(v));const state=new AppState();
const emotionEmoji={happy:'✦',sad:'◔',relaxed:'◌',surprised:'!',listening:'◉',thinking:'⋯',speaking:'♫'};
let expressionEmotion='relaxed';
function showEmoji(emotion){$('widget-emoji').textContent=emotionEmoji[emotion]||emotionEmoji.relaxed;$('widget-emoji').title=emotion;}
avatar.onExpression=emotion=>{expressionEmotion=emotion;showEmoji(emotion);};
let inputKind="text";
let liveOn=false,resumeTimer;
let turn=0,recording=false,starting=false,complete=false,decodeChain=Promise.resolve(),pendingAudio=0,assistantNode,metrics={},started,firstToken,firstAudio,config;
state.addEventListener('change',()=>{avatar.setState(state.value);$('status').textContent=state.value[0]+state.value.slice(1).toLowerCase();if(['LISTENING','THINKING','SPEAKING'].includes(state.value))showEmoji(state.value.toLowerCase());else showEmoji(expressionEmotion);});
const socket=new WebSocket(`ws://127.0.0.1:8765/ws?token=${import.meta.env.VITE_API_TOKEN||'development'}`);
const send=data=>{if(socket.readyState!==WebSocket.OPEN)throw Error('Local service is disconnected. Restart the app.');socket.send(JSON.stringify(data));};
const error=e=>$('error').textContent=e.message||e;
socket.onopen=()=>{$('status').textContent='Preparing…';};socket.onclose=()=>{$('mic').disabled=true;interrupt(false);if(!$('error').textContent)error('Local service disconnected. Restart with npm start.');};
function message(role,text){const p=document.createElement('div');p.className='message';const label=document.createElement('div');label.className='role';label.textContent=role==='You'?role:`${emotionEmoji[expressionEmotion]||'◌'} ${role}`;const body=document.createElement('div');body.textContent=text;p.append(label,body);$('messages').append(p);p.scrollIntoView();return body;}
function displayMetrics(){const labels={speech_to_stt_ms:'Speech → STT',stt_to_first_token_ms:inputKind==='speech'?'STT → token':'Text → token',token_to_audio_ms:'Token → audio',end_to_first_audio_ms:inputKind==='speech'?'Speech → audio':'Text → audio',end_to_end_ms:'Through playback'};$('metrics').textContent=Object.entries(labels).filter(([k])=>metrics[k]!=null).map(([k,label])=>`${label}: ${(metrics[k]/1000).toFixed(2)}s`).join(' · ');}
function finish(){if(complete&&!audio.playing&&!audio.queue.length&&!pendingAudio){state.set('IDLE');metrics.end_to_end_ms=Math.round(performance.now()-started);displayMetrics();send({type:'metrics',turn,metrics});avatar.setExpression('relaxed');complete=false;if(liveOn){const current=turn;resumeTimer=setTimeout(()=>{if(liveOn&&turn===current){audio.setListening(true);state.set('LISTENING');}},config?.audio?.resumeDelayMs??250);}}}
function interrupt(notify=true){clearTimeout(resumeTimer);turn++;if(recording||liveOn){audio.stopRecord();recording=false;liveOn=false;updateMicLabel();}audio.stop();pendingAudio=0;decodeChain=Promise.resolve();complete=false;state.set('IDLE');avatar.setExpression('relaxed');if(notify&&socket.readyState===1)send({type:'stop'});}
function begin(data){audio.setListening(false);turn++;inputKind=data.pcm?'speech':'text';metrics={input_kind:inputKind};started=performance.now()-(data.endDetectionMs||0);firstToken=null;firstAudio=null;complete=false;assistantNode=null;$('error').textContent='';$('metrics').textContent='';send({type:'turn',turn,...data});state.set('THINKING');}
function startListeningSoon(){if($('interaction').value!=='live'||$('mic').disabled||liveOn||recording)return;setTimeout(()=>{$('mic').click();},180);}
function playGreeting(m){
 interrupt(false);message(config.bots?.[config.conversation.persona]?.name||'Companion',m.text);state.set('SPEAKING');avatar.setExpression('happy');
 audio.enqueue(m.audio,()=>state.set('SPEAKING'),()=>{state.set('IDLE');avatar.setExpression('relaxed');startListeningSoon();}).catch(e=>{error(e);startListeningSoon();});
}
socket.onmessage=event=>{
 const m=JSON.parse(event.data);if(m.type==='preparing'){document.body.classList.add('model-loading');$('status').lastChild.textContent='Preparing local models…';$('mic').disabled=true;return;}if(m.type==='ready'){document.body.classList.remove('model-loading');$('mic').disabled=false;state.set('IDLE');updateMicLabel();return;}if(m.type==='setup_error'){document.body.classList.remove('model-loading');$('mic').disabled=true;error('Local model setup: '+m.message);return;}if(m.type==='config'){config=m.config; $('interaction').value=config.audio?.mode||'live';$('performance').value=config.performanceProfile||'low';performanceNote();avatar.configure(config.avatar);avatar.showRobot(config.conversation.persona);syncBotUI();return;}if(m.type==='bot_history'){$('messages').replaceChildren();for(const item of m.history)message(item.role==='user'?'You':config.bots[config.conversation.persona]?.name||'Companion',item.content);return;}if(m.type==='greeting'){playGreeting(m);return;}if(m.turn!==turn)return;
 if(m.type==='state')state.set(m.state);
 if(m.type==='transcript'){if(inputKind==='speech')metrics.speech_to_stt_ms=Math.round(performance.now()-started);message('You',m.text);assistantNode=message(config.bots?.[config.conversation.persona]?.name||'Companion','');}
 if(m.type==='first_token')firstToken=performance.now();
 if(m.type==='token'&&assistantNode){assistantNode.textContent+=m.text;assistantNode.scrollIntoView();}
 if(m.type==='emotion')avatar.setExpression(m.emotion);
 if(m.type==='audio'){
   const current=turn;pendingAudio++;
   decodeChain=decodeChain.then(async()=>{if(current!==turn)return;await audio.enqueue(m.audio,()=>{if(current!==turn)return;state.set('SPEAKING');if(!firstAudio){firstAudio=performance.now();metrics.token_to_audio_ms=Math.round(firstAudio-firstToken);metrics.end_to_first_audio_ms=Math.round(firstAudio-started);displayMetrics();}},()=>{if(current===turn)finish();});}).catch(e=>{if(current===turn){interrupt();error(e);}}).finally(()=>{if(current===turn){pendingAudio--;finish();}});
 }
 if(m.type==='metrics'){Object.assign(metrics,m.metrics);displayMetrics();}
 if(m.type==='done'){complete=true;finish();}
 if(m.type==='error'){interrupt();error(m.message);}
};
function updateMicLabel(){
 $('mic').textContent=liveOn?'Mic on · end conversation':recording?'Finish & send':$('interaction').value==='live'?'Start live conversation':'Start microphone';
 $('widget-mic').title=liveOn?'End live conversation':recording?'Finish and send':'Start live conversation';
 $('widget-mic').setAttribute('aria-pressed',String(liveOn||recording));
 $('detail').textContent=$('interaction').value==='live'?'Mic stays on · pause to send · listening resumes after the reply':'Click once to talk, again to send · microphone is off until enabled';
}
$('mic').onclick=async()=>{
 if(starting)return;
 try{
  if(liveOn){interrupt();return;}
  if(recording){const pcm=audio.stopRecord();recording=false;updateMicLabel();begin({pcm:toBase64(new Uint8Array(pcm.buffer))});return;}
  interrupt();starting=true;$('mic').disabled=true;$('error').textContent='';
  const requestTurn=turn;
  if($('interaction').value==='live'){
    await audio.startLive((pcm,meta)=>{if(liveOn)begin({pcm:toBase64(new Uint8Array(pcm.buffer)),...meta});},config.audio?.vad);
    if(requestTurn!==turn){audio.stopRecord();return;}
    liveOn=true;audio.setListening(true);
  }else{
    await audio.record(()=>$('mic').click());
    if(requestTurn!==turn){audio.stopRecord();return;}
    recording=true;
  }
  state.set('LISTENING');updateMicLabel();
 }catch(e){audio.stopRecord();recording=false;liveOn=false;updateMicLabel();state.set('IDLE');error(e);}
 finally{starting=false;$('mic').disabled=socket.readyState!==1;}
};
$('interaction').onchange=()=>{interrupt();updateMicLabel();};
$('stop').onclick=()=>interrupt();
$('text-form').onsubmit=async event=>{event.preventDefault();try{const text=$('text').value.trim();if(!text)return;if($('mic').disabled)throw Error('Wait for local voice preparation to finish.');interrupt();await audio.ready();$('text').value='';begin({text});}catch(e){error(e);}};
$('clear').onclick=()=>{interrupt();send({type:'clear'});$('messages').replaceChildren();};
$('transcript-toggle').onclick=()=>{$('transcript').hidden=!$('transcript').hidden;};
function openSettings(){closeWidgetMenu(false);if(document.body.classList.contains('widget')){window.desktop?.mode('full');setTimeout(()=>$('settings').showModal(),180);}else $('settings').showModal();}
$('settings-toggle').onclick=openSettings;
$('save').onclick=event=>{event.preventDefault();interrupt();send({type:'settings',interaction:$('interaction').value,performanceProfile:$('performance').value});$('settings').close();window.desktop?.mode('widget');};
function performanceNote(){$('performance-note').textContent=$('performance').value==='high'?'Uses the 9B model with smoother, more natural speech pacing. Best on the M1 Pro.':$('performance').value==='medium'?'Uses the installed 4B model for stronger replies. Best on 16 GB Macs.':'Uses the smallest local model and lower-power rendering.';}
$('performance').onchange=performanceNote;
window.addEventListener('beforeunload',()=>{audio.stream?.getTracks().forEach(t=>t.stop());audio.stop();});
// Public animation interface for experiments and automated shell validation.
window.avatar=avatar;window.appState=state;


setInterval(()=>{$('fps').textContent=`${avatar.fps} FPS · ${(config?.bots?.[config.conversation.persona]?.name||'Rivet')} · robot`;},1000);


function windowMode(mode){
 document.body.classList.toggle('widget',mode==='widget');$('bot-library').hidden=true;
 closeWidgetMenu(false);
 $('stage').setAttribute('role','img');
 $('stage').setAttribute('aria-label',(config?.bots?.[config.conversation.persona]?.name||'Companion')+' avatar');
 $('stage').tabIndex=-1;
 $('stage').removeAttribute('title');
}
if(window.desktop){windowMode('widget');window.desktop.onMode(windowMode);}else{$('collapse').hidden=true;$('close-window').hidden=true;}
$('expand').onclick=()=>window.desktop?.mode('full');
$('collapse').onclick=()=>window.desktop?.mode('widget');
$('close-window').onclick=()=>window.desktop?.close();
$('widget-mic').onclick=()=>{if(!$('mic').disabled)$('mic').click();};
$('widget-stop').onclick=()=>$('stop').click();
$('widget-settings').onclick=openSettings;
$('widget-minimize').onclick=()=>window.desktop?.minimize();
$('widget-close').onclick=()=>window.desktop?.close();
function syncWidgetStatus(){
 const failed=!!$('error').textContent, preparing=document.body.classList.contains('model-loading');
 $('widget-status').textContent=failed?'Needs attention':preparing?'Preparing…':state.value==='IDLE'?($('mic').disabled?'Connecting…':'Ready'):$('status').textContent;
 document.body.dataset.state=failed?'error':preparing?'preparing':state.value.toLowerCase();
 $('widget-mic').disabled=$('mic').disabled;
 $('widget-mic').classList.toggle('active',recording||liveOn);
 $('widget-mic').setAttribute('aria-label',liveOn?'End conversation':recording?'Finish and send':'Start conversation');
 $('widget-stop').hidden=state.value!=='SPEAKING';
}
new MutationObserver(syncWidgetStatus).observe($('status').parentElement,{subtree:true,childList:true,attributes:true});
function closeWidgetMenu(restoreFocus=true){$('widget-menu').hidden=true;$('widget-quality-panel').hidden=true;$('widget-quality').setAttribute('aria-expanded','false');$('widget-more').setAttribute('aria-expanded','false');if(restoreFocus)$('widget-more').focus();}
$('widget-more').onclick=()=>{const opening=$('widget-menu').hidden;closeBotLibrary();closeWidgetMenu(false);if(opening){$('widget-menu').hidden=false;$('widget-more').setAttribute('aria-expanded','true');$('menu-close').focus();}};
$('menu-close').onclick=()=>closeWidgetMenu();
window.addEventListener('pointerdown',event=>{if(!$('widget-menu').hidden&&!$('widget-menu').contains(event.target)&&!$('widget-more').contains(event.target))closeWidgetMenu(false);});



window.addEventListener('keydown',event=>{
  if(event.metaKey&&event.shiftKey&&event.key.toLowerCase()==='m'){event.preventDefault();if(!$('mic').disabled)$('mic').click();}
  if(event.key==='Escape'&&!$('widget-menu').hidden){closeWidgetMenu();return;}
  if(event.key==='Escape'&&!$('bot-library').hidden){closeBotLibrary();return;}
  if(event.key==='Escape'&&!$('settings').open){interrupt();if(window.desktop)window.desktop.mode('widget');}
});



// Pointer capture keeps the drag active as the native window follows the cursor.
for(const surface of [$('stage'),$('widget-drag')]){
  let pointer=null;
  const endDrag=()=>{
    if(pointer===null)return;
    const id=pointer;pointer=null;
    window.desktop?.stopDrag();
    document.body.classList.remove('dragging');
    avatar.setDragging(false);
    if(surface.hasPointerCapture(id))surface.releasePointerCapture(id);
  };
  surface.addEventListener('pointerdown',event=>{
    if(!window.desktop||!document.body.classList.contains('widget')||event.button!==0)return;
    event.preventDefault();pointer=event.pointerId;
    surface.setPointerCapture(pointer);
    document.body.classList.add('dragging');
    avatar.setDragging(true);
    window.desktop.startDrag();
  });
  surface.addEventListener('pointerup',endDrag);
  surface.addEventListener('pointercancel',endDrag);
  surface.addEventListener('lostpointercapture',endDrag);
  window.addEventListener('blur',endDrag);
  window.addEventListener('beforeunload',endDrag);
}

function syncBotUI(){
 const id=config.conversation.persona,name=config.bots?.[id]?.name||'Companion';
 $('widget-name').textContent=name;const profile=config.performanceProfile||'low';$('widget-quality').textContent='Performance · '+profile[0].toUpperCase()+profile.slice(1);$('widget-quality').title='Performance: '+(config.performanceProfiles?.[profile]?.name||'Low')+' · click to change';$('widget-quality-slider').value=profile==='high'?'2':profile==='medium'?'1':'0';$('widget-bot').title='Choose a robot · current: '+name;$('widget-bot').setAttribute('aria-label',$('widget-bot').title);$('bot-select').value=id;
 $('stage').setAttribute('aria-label',name+' avatar');
 $('widget-drag').setAttribute('aria-label','Drag to move '+name);
 document.body.dataset.bot=id;
}
function switchBot(id){
 if(!config?.bots?.[id]||socket.readyState!==1)return;
 interrupt();avatar.showRobot(id);
 send({type:'bot',bot:id});
}
function openBotLibrary(){
 if(!config)return;
 const cards=$('bot-cards');cards.replaceChildren();
 for(const [id,bot] of Object.entries(config.bots||{})){
   const button=document.createElement('button');button.className='bot-card '+id;
   const selected=id===config.conversation.persona;
   button.setAttribute('aria-pressed',String(selected));
   const icon=document.createElement('span');icon.className='bot-mark';icon.textContent=({nova:'♡',robot:'⚙',butler:'◈',pixel:'✦',luma:'◌'})[id]||'◌';
   const info=document.createElement('span');const name=document.createElement('b');name.textContent=bot.name+(selected?' · current':'');
   const detail=document.createElement('small');detail.textContent=({nova:'Charming, playful assistant',robot:'Witty repair robot',butler:'Wise British-style butler',pixel:'Bold marketing intern',luma:'Product designer & creative director'})[id]||'Custom companion';
   info.append(name,detail);button.append(icon,info);
   button.onclick=()=>{if(!selected)switchBot(id);closeBotLibrary();};cards.append(button);
 }
 closeWidgetMenu(false);$('bot-library').hidden=false;$('library-close').focus();
}
function closeBotLibrary(){$('bot-library').hidden=true;$('widget-more').focus();}
$('widget-bot').onclick=()=>{$('bot-library').hidden?openBotLibrary():closeBotLibrary();};
$('widget-quality').onclick=()=>{$('widget-quality-panel').hidden=!$('widget-quality-panel').hidden;$('widget-quality').setAttribute('aria-expanded',String(!$('widget-quality-panel').hidden));};
$('widget-quality-slider').onchange=()=>{const profile=['low','medium','high'][Number($('widget-quality-slider').value)];if(profile===config.performanceProfile)return;closeWidgetMenu();interrupt();send({type:'settings',interaction:$('interaction').value,performanceProfile:profile});};
$('library-close').onclick=closeBotLibrary;
window.addEventListener('pointerdown',event=>{if(!$('bot-library').hidden&&!$('bot-library').contains(event.target)&&!$('widget-bot').contains(event.target))$('bot-library').hidden=true;});

$('bot-select').onchange=()=>switchBot($('bot-select').value);

const widgetIcons={
 'widget-mic':'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M9 22h6"/>',
 'widget-stop':'<rect x="6" y="6" width="12" height="12" rx="3"/>',
 'widget-bot':'<path d="M4 8h15l-4-4M20 16H5l4 4"/>',
 'widget-settings':'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.1 2.1-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V20h-3v-.08A1.7 1.7 0 0 0 10.68 18.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.1-2.1.06-.06A1.7 1.7 0 0 0 7.04 15a1.7 1.7 0 0 0-1.56-1.04H5v-3h.08A1.7 1.7 0 0 0 6.6 9.92a1.7 1.7 0 0 0-.34-1.88L6.2 7.98l2.1-2.1.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.28 4.7V4h3v.08a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.1 2.1-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.04H20v3h-.08A1.7 1.7 0 0 0 18.4 15Z"/>',
 'widget-minimize':'<path d="M5 12h14"/>',
 'expand':'<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>',
 'widget-close':'<path d="m7 7 10 10M17 7 7 17"/>'
};
for(const [id,paths] of Object.entries(widgetIcons).filter(([id])=>['widget-mic','widget-stop','expand'].includes(id)))$(id).innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg>';
