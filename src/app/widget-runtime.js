import '../styles/base.css';
import {Avatar} from '../avatar/Avatar.js';
import {AudioEngine,toBase64} from '../audio/engine.js';
import {AppState} from '../conversation/state.js';
import {mergeCalendarEvents,readLocalCalendar,saveLocalCalendarEvent} from '../calendar/local-calendar.js';
const $=id=>document.getElementById(id);
const avatar=new Avatar($('stage'));const audio=new AudioEngine(v=>avatar.setMouth(v));const state=new AppState();
const emotionEmoji={happy:'😊',sad:'😔',relaxed:'😌',surprised:'😮',curious:'🤔',listening:'👂',thinking:'💭',speaking:'🔊'};
const emotionLabel={happy:'Happy',sad:'Sad',relaxed:'Relaxed',surprised:'Surprised',curious:'Curious'};
let expressionEmotion='relaxed';
function showEmoji(emotion){$('widget-emoji').textContent=emotionEmoji[emotion]||emotionEmoji.relaxed;$('widget-emoji').title=emotion;}
avatar.onExpression=emotion=>{expressionEmotion=emotion;showEmoji(emotion);};
let inputKind="text";
let liveOn=false,micMuted=false,resumeTimer,latestWidgetReply=null,widgetUnread=0;
let lastWidgetError='',lastWidgetErrorAt=0;
let avatarInteractionTimer=0,lastAvatarInteraction=0,avatarInteractionIndex=0;
let screenAwareness=false,screenTimer=0,lastScreenObservation=0,lastUserActivity=performance.now();
let turn=0,recording=false,starting=false,complete=false,decodeChain=Promise.resolve(),pendingAudio=0,assistantNode,metrics={},started,firstToken,firstAudio,config,thinkingTimer;
state.addEventListener('change',()=>{
  avatar.setState(state.value);
  $('status').textContent=state.value[0]+state.value.slice(1).toLowerCase();
  if(['LISTENING','THINKING','SPEAKING'].includes(state.value))showEmoji(state.value.toLowerCase());else showEmoji(expressionEmotion);
  clearTimeout(thinkingTimer);
  if(state.value==='THINKING'){
    thinkingTimer=setTimeout(()=>{if(state.value==='THINKING')audio.playFiller();},600);
  }
});
const socket=new WebSocket(`ws://127.0.0.1:8765/ws?token=${import.meta.env.VITE_API_TOKEN||'development'}`);
const send=data=>{if(socket.readyState!==WebSocket.OPEN)throw Error('Local service is disconnected. Restart the app.');socket.send(JSON.stringify(data));};
const error=e=>{
 const text=String(e?.message||e||'Unknown error');$('error').textContent=text;
 const now=Date.now();if(text===lastWidgetError&&now-lastWidgetErrorAt<5000)return text;
 lastWidgetError=text;lastWidgetErrorAt=now;
 const item=document.createElement('div');item.className='message system-error';
 const label=document.createElement('div');label.className='role';label.textContent=`⚠ System · ${new Date(now).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;
 const body=document.createElement('div');body.textContent=text;item.append(label,body);$('widget-messages').append(item);$('widget-messages').scrollTop=$('widget-messages').scrollHeight;
 if(!document.body.classList.contains('widget-chat-open')){widgetUnread++;syncWidgetUnread();}
 return text;
};
socket.onopen=()=>{$('status').textContent='Preparing…';};socket.onclose=()=>{$('mic').disabled=true;interrupt(false);if(!$('error').textContent)error('Local service disconnected. Restart with npm start.');};
function parseEmotionText(text){
 const match=String(text).match(/^\s*\[(happy|sad|relaxed|surprised|curious)\]\s*/i);
 return match?{emotion:match[1].toLowerCase(),text:String(text).slice(match[0].length)}:{emotion:null,text:String(text)};
}
function setMessageEmotion(body,role,emotion){
 if(!body?.roleNode||role==='You')return;
 const mood=emotionLabel[emotion]||emotionLabel.relaxed;
 body.roleNode.textContent=`${emotionEmoji[emotion]||emotionEmoji.relaxed} ${mood} · ${role}`;
 body.roleNode.dataset.emotion=emotion||'relaxed';
}
function appendMessage(container,role,text,compact=false,emotion='relaxed'){
 if(compact)container.querySelector('.widget-empty-state')?.remove();
 const item=document.createElement('div');item.className='message '+(role==='You'?'user':'assistant');
 const label=document.createElement('div');label.className='role';label.textContent=role;
 const body=document.createElement('div');body.textContent=text;item.append(label,body);container.append(item);
 body.roleNode=label;setMessageEmotion(body,role,emotion);
 if(compact)container.scrollTop=container.scrollHeight;else item.scrollIntoView();
 return body;
}
function syncWidgetUnread(){
 $('widget-chat-toggle').dataset.unread=widgetUnread?String(Math.min(widgetUnread,9)):'';
}
function message(role,text,emotion=expressionEmotion){
 const parsed=role==='You'?{emotion:null,text:String(text)}:parseEmotionText(text);emotion=parsed.emotion||emotion;
 const nodes={full:appendMessage($('messages'),role,parsed.text,false,emotion),widget:appendMessage($('widget-messages'),role,parsed.text,true,emotion)};
 if(role!=='You'){
   latestWidgetReply=nodes.widget;$('widget-copy-last').disabled=!text;
   if(!document.body.classList.contains('widget-chat-open')){widgetUnread++;syncWidgetUnread();}
 }
 return nodes;
}
function clearMessages(){
 $('messages').replaceChildren();$('widget-messages').replaceChildren();
 const empty=document.createElement('div');empty.className='widget-empty-state';
 const title=document.createElement('strong');title.textContent='What can I help with?';
 const hint=document.createElement('span');hint.textContent='Talk naturally or choose a quick start.';
 const prompts=document.createElement('div');prompts.className='widget-quick-prompts';
 for(const [label,prompt] of [['Plan my day','Plan my day'],['Today’s calendar','What is on my calendar today?'],['Start a task','Help me get started with a task']]){const button=document.createElement('button');button.type='button';button.dataset.widgetPrompt=prompt;button.textContent=label;prompts.append(button);}
 empty.append(title,hint,prompts);$('widget-messages').append(empty);
 latestWidgetReply=null;widgetUnread=0;$('widget-copy-last').disabled=true;syncWidgetUnread();
}
function actionRequest(request){
 const card=document.createElement('div');card.className='action-request';
 const label=request.action.kind==='set_volume'?'change system volume to '+request.action.value+'%':request.action.kind.replace('_',' ')+' '+request.action.value;
 card.textContent=(config?.bots?.[config.conversation.persona]?.name||'Companion')+' wants to '+label+'.';
 const allow=document.createElement('button');allow.textContent='Allow once';
 const deny=document.createElement('button');deny.textContent='Deny';
 const decide=decision=>{send({type:'action_decision',requestId:request.requestId,decision});card.replaceChildren(document.createTextNode(decision==='allow_once'?'Action approved.':'Action denied.'));};
 allow.onclick=()=>decide('allow_once');deny.onclick=()=>decide('deny');card.append(allow,deny);$('messages').append(card);card.scrollIntoView();
}
function displayMetrics(){const labels={speech_to_stt_ms:'Speech → STT',stt_to_first_token_ms:inputKind==='speech'?'STT → token':'Text → token',token_to_audio_ms:'Token → audio',end_to_first_audio_ms:inputKind==='speech'?'Speech → audio':'Text → audio',end_to_end_ms:'Through playback'};$('metrics').textContent=Object.entries(labels).filter(([k])=>metrics[k]!=null).map(([k,label])=>`${label}: ${(metrics[k]/1000).toFixed(2)}s`).join(' · ');}
function finish(){if(complete&&!audio.playing&&!audio.queue.length&&!pendingAudio){state.set('IDLE');metrics.end_to_end_ms=Math.round(performance.now()-started);displayMetrics();send({type:'metrics',turn,metrics});avatar.setExpression('relaxed');complete=false;if(liveOn&&!micMuted){const current=turn;resumeTimer=setTimeout(()=>{if(liveOn&&!micMuted&&turn===current){audio.setListening(true);state.set('LISTENING');}},config?.audio?.resumeDelayMs??250);}}}
function interrupt(notify=true, sessionStop=false){
  clearTimeout(resumeTimer);
  turn++;
  if(recording){
    audio.stopRecord();
    recording=false;
    updateMicLabel();
  }
  if(sessionStop){
    liveOn=false;
    micMuted=false;
    updateMicLabel();
  }
  audio.stop();
  pendingAudio=0;
  decodeChain=Promise.resolve();
  complete=false;
  state.set('IDLE');
  avatar.setExpression('relaxed');
  if(notify&&socket.readyState===1)send({type:'stop'});
}
function begin(data){
  if($('interaction').value!=='live')audio.setListening(false);
  turn++;inputKind=data.pcm?'speech':'text';metrics={input_kind:inputKind};started=performance.now()-(data.endDetectionMs||0);firstToken=null;firstAudio=null;complete=false;assistantNode=null;$('error').textContent='';$('metrics').textContent='';send({type:'turn',turn,...data});state.set('THINKING');
  if($('interaction').value==='live'&&!data.screenObservation){
    setTimeout(()=> {
      if(!micMuted&&(state.value==='THINKING'||state.value==='SPEAKING')){
        audio.setListening(true);
      }
    }, 800);
  }
}
async function beginUserTurn(data){
  if(screenAwareness&&!data.image&&window.desktop?.captureScreen){
    const capture=await window.desktop.captureScreen();
    if(capture?.ok){
      const image=capture.image?.split(',',2)[1];
      if(image){data={...data,image,screenSource:capture.source||'Display'};lastScreenObservation=performance.now();}
    }else{
      screenAwareness=false;syncScreenAwareness();error(capture?.error||'Screen awareness could not capture this turn.');
    }
  }
  begin(data);
}
function startListeningSoon(){if($('interaction').value!=='live'||$('mic').disabled||liveOn||recording)return;setTimeout(()=>{$('mic').click();},180);}
function playGreeting(m){
 interrupt(false);state.set('SPEAKING');avatar.setExpression('happy');
 audio.enqueue(m.audio,()=>state.set('SPEAKING'),()=>{state.set('IDLE');avatar.setExpression('relaxed');startListeningSoon();}).catch(e=>{error(e);startListeningSoon();});
}
socket.onmessage=event=>{
 let m;try{m=JSON.parse(event.data);}catch{return;}if(m.type==='preparing'){document.body.classList.add('model-loading');$('status').lastChild.textContent=m.stage||'Preparing local models…';$('onboarding-status').textContent=m.stage||'Preparing local models…';$('mic').disabled=true;return;}if(m.type==='ready'){document.body.classList.remove('model-loading');$('mic').disabled=false;$('onboarding-status').textContent='Local models are ready. When you continue, macOS will ask to use your microphone.';state.set('IDLE');updateMicLabel();return;}if(m.type==='setup_error'){document.body.classList.remove('model-loading');$('mic').disabled=true;$('onboarding-status').textContent='Setup needs attention: '+m.message;error('Local model setup: '+m.message);return;}if(m.type==='config'){config=m.config; $('interaction').value=config.audio?.mode||'live';$('performance').value=config.performanceProfile||'low';$('memory-enabled').checked=!!config.memory?.enabled;$('onboarding-bot').value=config.conversation.persona;$('onboarding-performance').value=config.performanceProfile||'low';performanceNote();avatar.configure(config.avatar);avatar.showRobot(config.conversation.persona);syncBotUI();openOnboarding();return;}if(m.type==='bot_history')return;if(m.type==='greeting'){playGreeting(m);return;}if(m.type==='action_request'){actionRequest(m);return;}if(m.turn!==turn)return;
 if(m.type==='state')state.set(m.state);
 if(m.type==='transcript'&&inputKind==='speech')metrics.speech_to_stt_ms=Math.round(performance.now()-started);
 if(m.type==='first_token')firstToken=performance.now();
 if(m.type==='token')$('widget-copy-last').disabled=false;
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
 $('detail').textContent=micMuted?'Microphone muted · conversation remains active':$('interaction').value==='live'?'Mic stays on · pause to send · listening resumes after the reply':'Click once to talk, again to send · microphone is off until enabled';
 syncWidgetStatus();
}
$('mic').onclick=async()=>{
 if(starting)return;
 try{
  if(liveOn){interrupt(true,true);return;}
  if(recording){const pcm=audio.stopRecord();recording=false;updateMicLabel();await beginUserTurn({pcm:toBase64(new Uint8Array(pcm.buffer))});return;}
  interrupt();starting=true;$('mic').disabled=true;$('error').textContent='';
  const requestTurn=turn;
  if($('interaction').value==='live'){
    await audio.startLive((pcm,meta)=>{
      if(!liveOn)return;
      if(state.value==='SPEAKING'){
        interrupt();
      }
      beginUserTurn({pcm:toBase64(new Uint8Array(pcm.buffer)),...meta}).catch(error);
    },config.audio?.vad);
    if(requestTurn!==turn){audio.stopRecord();return;}
    liveOn=true;micMuted=false;audio.setListening(true);
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
async function submitText(input){
 try{const text=input.value.trim();if(!text)return;lastUserActivity=performance.now();if($('mic').disabled)throw Error('Wait for local voice preparation to finish.');interrupt();await audio.ready();$('text').value='';$('widget-text').value='';await beginUserTurn({text});}catch(e){error(e);}
}
$('text-form').onsubmit=event=>{event.preventDefault();submitText($('text'));};
$('widget-text-form').onsubmit=event=>{event.preventDefault();submitText($('widget-text'));};
$('widget-text').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();$('widget-text-form').requestSubmit();}});
document.addEventListener('click',event=>{const button=event.target.closest('[data-widget-prompt]');if(!button)return;$('widget-text').value=button.dataset.widgetPrompt;$('widget-text-form').requestSubmit();});
for(const [source,target] of [[$('text'),$('widget-text')],[$('widget-text'),$('text')]])source.addEventListener('input',()=>{target.value=source.value;});
function clearConversation(){interrupt();send({type:'clear'});clearMessages();}
$('clear').onclick=clearConversation;
$('widget-clear-chat').onclick=clearConversation;
$('widget-copy-last').onclick=async()=>{
 if(!latestWidgetReply?.textContent)return;
 await navigator.clipboard.writeText(latestWidgetReply.textContent);
 $('widget-copy-last').textContent='Copied';setTimeout(()=>{$('widget-copy-last').textContent='Copy';},900);
};
$('transcript-toggle').onclick=()=>{$('transcript').hidden=!$('transcript').hidden;};
const workspaceModes={calendar:'Plan time, review events, and prepare meeting notes.',coding:'Inspect the project, plan changes, review diffs, and run checks.',creative:'Create images, refine ideas, and review visual drafts.',inbox:'Review messages and prepare replies for your approval.',system:'See local CPU, memory, disk, model, and task health.'};
const recommendedWorkspace={nova:'calendar',robot:'coding',butler:'calendar',pixel:'creative',luma:'creative'};
let miniCalendarMonth=new Date(),miniCalendarEvents=[];
let localCalendarEvents=readLocalCalendar();
const calendarEvents=events=>mergeCalendarEvents(events,localCalendarEvents);
function publishCalendarContext(available,label,events=[]){window.__myavatarCalendarContext={available,label,events};window.dispatchEvent(new CustomEvent('myavatar:calendar-context',{detail:window.__myavatarCalendarContext}));}
function renderMiniCalendar(){const month=$('widget-calendar-month'),grid=$('widget-calendar-grid');if(!month||!grid)return;const year=miniCalendarMonth.getFullYear(),index=miniCalendarMonth.getMonth();month.textContent=miniCalendarMonth.toLocaleDateString(undefined,{month:'long',year:'numeric'});grid.innerHTML='';const first=new Date(year,index,1).getDay(),days=new Date(year,index+1,0).getDate(),today=new Date();for(let slot=0;slot<first+days;slot++){const day=slot<first?null:slot-first+1;const cell=document.createElement('span');if(!day){cell.className='empty';grid.append(cell);continue;}cell.textContent=String(day);const sameToday=day===today.getDate()&&index===today.getMonth()&&year===today.getFullYear();if(sameToday)cell.classList.add('today');const hasEvent=miniCalendarEvents.some(event=>{const date=new Date(event.start);return !Number.isNaN(date.valueOf())&&date.getDate()===day&&date.getMonth()===index&&date.getFullYear()===year;});if(hasEvent)cell.classList.add('has-event');cell.setAttribute('aria-label',`${month.textContent} ${day}`);grid.append(cell);}}
function renderCalendarWing(events){const content=$('widget-code-wing')?.querySelector('.widget-wing-content');if(!content)return;content.innerHTML='';const wrap=document.createElement('div');wrap.className='calendar-wing';if(!events.length){wrap.innerHTML='<div class="workspace-empty"><strong>Your calendar is clear.</strong><span>No events in the next 14 days.</span></div>';}for(const event of events.slice(0,12)){const card=document.createElement('article');card.className='calendar-event';const title=document.createElement('strong');title.textContent=event.title;const meta=document.createElement('span');meta.textContent=`${event.start} · ${event.calendar}`;card.append(title,meta);wrap.append(card);}content.append(wrap);}
function renderMiniCalendarEvents(events,status){const list=$('widget-mini-calendar-events');list.innerHTML='';if(!events.length){list.innerHTML='<p>Your local calendar is clear.</p>';return;}for(const event of events.slice(0,5)){const card=document.createElement('article');card.className='mini-calendar-event';const title=document.createElement('strong');title.textContent=event.title;const meta=document.createElement('span');meta.textContent=`${event.start} · ${event.calendar}`;card.append(title,meta);list.append(card);}status.textContent=`${events.length} upcoming event${events.length===1?'':'s'} · ${localCalendarEvents.length?'Mac + local':'Mac Calendar'}`;}
async function loadMiniCalendar(){const status=$('widget-mini-calendar-status'),list=$('widget-mini-calendar-events');localCalendarEvents=readLocalCalendar();status.textContent='Reading calendars…';list.innerHTML='<p>Loading events…</p>';const result=await window.desktop?.getCalendarEvents?.();const nativeEvents=result?.ok?result.events||[]:[];miniCalendarEvents=calendarEvents(nativeEvents);const sourceLabel=result?.ok?'Mac Calendar + local fallback':'Local calendar fallback · Mac access unavailable';publishCalendarContext(Boolean(result?.ok)||localCalendarEvents.length>0,miniCalendarEvents.length?`${miniCalendarEvents.length} upcoming event${miniCalendarEvents.length===1?'':'s'} · ${sourceLabel}`:sourceLabel,miniCalendarEvents);renderMiniCalendar();renderMiniCalendarEvents(miniCalendarEvents,status);if(!result?.ok&&localCalendarEvents.length===0){status.textContent='Using local calendar fallback';list.innerHTML='<p class="mini-calendar-error">Mac Calendar is unavailable. Add a local event below, or allow access in System Settings.</p>';}}
 async function loadCalendarWorkspace(){
  const status=$('calendar-status'),list=$('calendar-events');
  if(!window.desktop?.getCalendarEvents){localCalendarEvents=readLocalCalendar();const events=calendarEvents([]);publishCalendarContext(localCalendarEvents.length>0,'Local calendar fallback · Mac access unavailable',events);status.textContent='Local calendar fallback · Mac access unavailable';list.replaceChildren();if(!events.length){list.innerHTML='<div class="workspace-empty"><strong>Your local calendar is clear.</strong><span>Add an event here, or connect Mac Calendar.</span></div>';return;}for(const event of events){const card=document.createElement('article');card.className='calendar-event';const title=document.createElement('strong');title.textContent=event.title;const meta=document.createElement('span');meta.textContent=`${event.start} · ${event.calendar}`;card.append(title,meta);list.append(card);}return;}
  status.textContent='Reading your Mac Calendar…';list.innerHTML='<p class="workspace-empty">Loading events…</p>';
  const result=await window.desktop.getCalendarEvents();
  localCalendarEvents=readLocalCalendar();const nativeEvents=result?.ok?result.events||[]:[];const events=calendarEvents(nativeEvents);publishCalendarContext(Boolean(result?.ok)||localCalendarEvents.length>0,events.length?`${events.length} upcoming event${events.length===1?'':'s'} · ${result?.ok?'Mac + local':'local fallback'}`:'Local calendar fallback · Mac access unavailable',events);status.textContent=result?.ok?'Mac Calendar + local fallback':'Local calendar fallback · Mac access unavailable';
  list.innerHTML='';
  if(!events.length){list.innerHTML='<div class="workspace-empty"><strong>Your local calendar is clear.</strong><span>Add an event here, or allow Mac Calendar access to read existing events.</span></div>';return;}
  for(const event of events){const card=document.createElement('article');card.className='calendar-event';const title=document.createElement('strong');title.textContent=event.title;const meta=document.createElement('span');meta.textContent=`${event.start} · ${event.calendar}`;card.append(title,meta);list.append(card);}
 }
 function setWorkspaceMode(mode,announce=true){
 const selected=workspaceModes[mode]?mode:'coding';document.body.dataset.workspace=selected;window.dispatchEvent(new CustomEvent('myavatar:workspace-mode',{detail:selected}));
 document.querySelectorAll('[data-workspace-mode]').forEach(button=>{const active=button.dataset.workspaceMode===selected;button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false');});
 $('detail').textContent=workspaceModes[selected];$('calendar-workspace').hidden=selected!=='calendar'||document.body.classList.contains('widget');$('stage').hidden=false;if(selected==='calendar'&&!document.body.classList.contains('widget'))void loadCalendarWorkspace();if(announce)$('status').setAttribute('aria-label',`${selected} workspace`);
 }
document.querySelectorAll('[data-workspace-mode]').forEach(button=>button.onclick=()=>setWorkspaceMode(button.dataset.workspaceMode));
$('calendar-refresh').onclick=()=>void loadCalendarWorkspace();
function openLocalCalendarDialog(){const dialog=$('local-calendar-dialog');$('local-calendar-date').value=new Date().toISOString().slice(0,10);dialog.showModal();$('local-calendar-title').focus();}
$('calendar-local-add').onclick=openLocalCalendarDialog;$('widget-local-calendar-add').onclick=openLocalCalendarDialog;
$('local-calendar-form').onsubmit=event=>{event.preventDefault();const title=$('local-calendar-title').value.trim(),start=`${$('local-calendar-date').value}T${$('local-calendar-time').value}`;if(!title||!start)return;saveLocalCalendarEvent({title,start});localCalendarEvents=readLocalCalendar();$('local-calendar-dialog').close();void loadCalendarWorkspace();if(!document.body.classList.contains('widget'))return;void loadMiniCalendar();};
setWorkspaceMode('coding',false);
function requestCalendarLayout(open){void window.desktop?.widgetCalendar?.({open:Boolean(open)});}
function requestCreativeLayout(open){void window.desktop?.widgetSpecialist?.(Boolean(open));}
$('widget-calendar-toggle').onclick=()=>{const panel=$('widget-mini-calendar'),opening=panel.hidden;window.closeAttachedWorkspace?.();panel.hidden=!opening;document.body.classList.toggle('widget-calendar-open',opening);syncSpecialistState('calendar',opening);requestCalendarLayout(opening);if(opening){renderMiniCalendar();void loadMiniCalendar();}};
$('widget-mini-calendar-close').onclick=()=>{$('widget-mini-calendar').hidden=true;document.body.classList.remove('widget-calendar-open');syncSpecialistState('calendar',false);requestCalendarLayout(false);};
$('widget-mini-calendar-refresh').onclick=()=>void loadMiniCalendar();
$('widget-calendar-prev').onclick=()=>{miniCalendarMonth.setMonth(miniCalendarMonth.getMonth()-1);renderMiniCalendar();};
$('widget-calendar-next').onclick=()=>{miniCalendarMonth.setMonth(miniCalendarMonth.getMonth()+1);renderMiniCalendar();};
$('widget-calendar-today').onclick=()=>{miniCalendarMonth=new Date();renderMiniCalendar();};
function renderCreativeWorkspace(botId){
 const isPixel=botId==='pixel', panel=$('widget-creative-workspace'), content=$('widget-creative-content');
 if(!panel||!content)return;
 $('widget-creative-eyebrow').textContent=isPixel?'PIXEL · MARKETING':'LUMA · DESIGN';
 $('widget-creative-title').textContent=isPixel?'Campaign workspace':'Design workspace';
 content.replaceChildren();
 const rows=isPixel
  ? [['Objective','Shape the next campaign message'],['Current hook','Start a conversation with one clear idea'],['Next experiment','Compare two concise hooks'],['Output','Copy and variants appear in chat']]
  : [['Brief','Clarify the screen or product moment'],['Key decision','Choose the clearest hierarchy'],['Critique','Review spacing, contrast, and emphasis'],['Output','Design notes and visual prompts appear in chat']];
 for(const [label,value] of rows){const row=document.createElement('div');row.className='widget-specialist-row';const key=document.createElement('span');key.textContent=label;const text=document.createElement('strong');text.textContent=value;row.append(key,text);content.append(row);}
}
$('widget-creative-toggle').onclick=()=>{const panel=$('widget-creative-workspace'),opening=panel.hidden;renderCreativeWorkspace(config?.conversation?.persona);panel.hidden=!opening;document.body.classList.toggle('widget-creative-open',opening);syncSpecialistState('creative',opening);requestCreativeLayout(opening);};
$('widget-creative-close').onclick=()=>{$('widget-creative-workspace').hidden=true;document.body.classList.remove('widget-creative-open','widget-creative-context-open');syncSpecialistState('creative',false);requestCreativeLayout(false);};
function openSettings(){closeWidgetMenu(false);if(document.body.classList.contains('widget')){window.desktop?.mode('full');setTimeout(()=>$('settings').showModal(),180);}else $('settings').showModal();}
$('settings-toggle').onclick=openSettings;
$('save').onclick=event=>{event.preventDefault();interrupt();send({type:'settings',interaction:$('interaction').value,performanceProfile:$('performance').value,memoryEnabled:$('memory-enabled').checked});$('settings').close();window.desktop?.mode('widget');};
function performanceNote(){$('performance-note').textContent=$('performance').value==='medium'?'Balanced is recommended for natural everyday voice conversations.':'Fast minimizes memory and time to first response.';}
$('performance').onchange=performanceNote;
function openOnboarding(){
 if(localStorage.getItem('myavatar.onboarding.complete')||$('onboarding').open)return;
 if(window.desktop)window.desktop.mode('full');
 setTimeout(()=>{if(!$('onboarding').open)$('onboarding').showModal();},180);
}
$('onboarding-start').onclick=event=>{
 event.preventDefault();if(!config||socket.readyState!==1)return;
 localStorage.setItem('myavatar.onboarding.complete','1');
 send({type:'onboarding',bot:$('onboarding-bot').value,performanceProfile:$('onboarding-performance').value,interaction:$('interaction').value});
 $('onboarding').close();window.desktop?.mode('widget');
};
$('onboarding-later').onclick=()=>{localStorage.setItem('myavatar.onboarding.complete','1');window.desktop?.mode('widget');};
window.addEventListener('beforeunload',()=>{audio.stream?.getTracks().forEach(t=>t.stop());audio.stop();});
// Public animation interface for experiments and automated shell validation.
window.avatar=avatar;window.appState=state;


setInterval(()=>{$('fps').textContent=`${avatar.fps} FPS · ${(config?.bots?.[config.conversation.persona]?.name||'Rivet')} · robot`;},1000);


function windowMode(mode){
 document.body.classList.toggle('widget',mode==='widget');$('bot-library').hidden=true;
 setWorkspaceMode(document.body.dataset.workspace||recommendedWorkspace[config?.conversation?.persona]||'coding',false);
 if(mode!=='widget')setWidgetChat(false,false);
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
$('widget-mic').onclick=()=>{
 if($('mic').disabled)return;
 if(!liveOn){$('mic').click();return;}
 micMuted=!micMuted;audio.setListening(!micMuted);
 if(micMuted&&state.value==='LISTENING')state.set('IDLE');
 else if(!micMuted&&state.value==='IDLE')state.set('LISTENING');
 updateMicLabel();
};
$('widget-end-conversation').onclick=()=>{if(liveOn)interrupt(true,true);closeWidgetMenu(false);};
$('widget-stop').onclick=()=>$('stop').click();
$('widget-awareness').onclick=async()=>{
 screenAwareness=!screenAwareness;syncScreenAwareness();
 if(screenAwareness){
   if(!['IDLE','LISTENING'].includes(state.value))interrupt();
   $('status').textContent='Looking at your screen…';
   await observeScreen();
 }
};
$('widget-settings').onclick=openSettings;
$('widget-minimize').onclick=()=>window.desktop?.minimize();
$('widget-close').onclick=()=>window.desktop?.close();
function syncWidgetStatus(){
 const failed=!!$('error').textContent, preparing=document.body.classList.contains('model-loading');
 $('widget-status').textContent=failed?'Needs attention':preparing?'Preparing…':state.value==='IDLE'?($('mic').disabled?'Connecting…':'Ready'):$('status').textContent;
 document.body.dataset.state=failed?'error':preparing?'preparing':state.value.toLowerCase();
 $('widget-mic').disabled=$('mic').disabled;
 $('widget-mic').classList.toggle('active',(recording||liveOn)&&!micMuted);
 $('widget-mic').classList.toggle('muted',micMuted);
 const micLabel=recording?'Finish and send':!liveOn?'Start conversation':micMuted?'Unmute microphone':'Mute microphone';
 $('widget-mic').setAttribute('aria-label',micLabel);$('widget-mic').title=micLabel;
 $('widget-mic').setAttribute('aria-pressed',String(liveOn?micMuted:recording));
 const micIcon=micMuted?'widget-mute':'widget-mic';
 if($('widget-mic').dataset.icon!==micIcon){$('widget-mic').dataset.icon=micIcon;$('widget-mic').innerHTML=iconSvg(widgetIcons[micIcon]);}
 $('widget-end-conversation').hidden=!liveOn;
 if(micMuted)$('widget-status').textContent='Muted';
 $('widget-stop').hidden=state.value!=='SPEAKING';
 const chatState=$('widget-chat-state');if(chatState)chatState.textContent=failed?'Needs attention':preparing?'Preparing':state.value==='THINKING'?'Working…':state.value==='SPEAKING'?'Replying…':state.value==='LISTENING'?'Listening…':'Ready';
}
function syncScreenAwareness(){
 $('widget-awareness').setAttribute('aria-pressed',String(screenAwareness));
 $('widget-awareness').setAttribute('aria-label',screenAwareness?'Screen awareness on':'Screen awareness off');
 $('widget-awareness').title=screenAwareness?'Screen awareness on · click to pause':'Screen awareness off · click to start';
 clearInterval(screenTimer);screenTimer=0;
 if(screenAwareness)screenTimer=setInterval(()=>{if(performance.now()-lastUserActivity>45000&&performance.now()-lastScreenObservation>180000)observeScreen();},15000);
}
async function observeScreen(){
 if(!screenAwareness||!window.desktop?.captureScreen||!['IDLE','LISTENING'].includes(state.value)||starting)return;
 const capture=await window.desktop.captureScreen();
 if(!capture?.ok){screenAwareness=false;syncScreenAwareness();error(capture?.error||'Screen awareness could not start.');return;}
 const image=capture.image?.split(',',2)[1];if(!image)return;
 lastScreenObservation=performance.now();audio.setListening(false);interrupt();await audio.ready();
 begin({text:'Look at the current screen and briefly say what I appear to be doing.',image,screenObservation:true,screenSource:capture.source||'Display'});
}
new MutationObserver(syncWidgetStatus).observe($('status').parentElement,{subtree:true,childList:true,attributes:true});
function closeWidgetMenu(restoreFocus=true){$('widget-menu').hidden=true;$('widget-quality-panel').hidden=true;$('widget-system-hud').hidden=true;$('widget-quality').setAttribute('aria-expanded','false');$('widget-system-hud-toggle').setAttribute('aria-expanded','false');$('widget-more').setAttribute('aria-expanded','false');window.dispatchEvent(new CustomEvent('myavatar:system-hud',{detail:false}));if(restoreFocus)$('widget-more').focus();}
$('widget-more').onclick=()=>{const opening=$('widget-menu').hidden;closeBotLibrary();closeWidgetMenu(false);if(opening){$('widget-menu').hidden=false;$('widget-more').setAttribute('aria-expanded','true');$('menu-close').focus();}};
$('menu-close').onclick=()=>closeWidgetMenu();
$('widget-system-hud-toggle').onclick=()=>{const hud=$('widget-system-hud'),open=hud.hidden;hud.hidden=!open;$('widget-system-hud-toggle').setAttribute('aria-expanded',String(open));window.dispatchEvent(new CustomEvent('myavatar:system-hud',{detail:open}));};
window.addEventListener('pointerdown',event=>{if(!$('widget-menu').hidden&&!$('widget-menu').contains(event.target)&&!$('widget-more').contains(event.target))closeWidgetMenu(false);});



window.addEventListener('keydown',event=>{
  if(event.metaKey&&event.shiftKey&&event.key.toLowerCase()==='m'){event.preventDefault();if(!$('widget-mic').disabled)$('widget-mic').click();}
  if(event.key==='Escape'&&document.body.classList.contains('widget-chat-open')){setWidgetChat(false);return;}
  if(event.key==='Escape'&&!$('widget-menu').hidden){closeWidgetMenu();return;}
  if(event.key==='Escape'&&!$('bot-library').hidden){closeBotLibrary();return;}
  if(event.key==='Escape'&&!$('settings').open){interrupt();if(window.desktop)window.desktop.mode('widget');}
});



// Pointer capture keeps the drag active as the native window follows the cursor.
for(const surface of [$('stage'),$('widget-drag')]){
  let pointer=null,origin=null,moved=false;
  const endDrag=event=>{
    if(pointer===null)return;
    const id=pointer;pointer=null;
    window.desktop?.stopDrag();
    document.body.classList.remove('dragging');
    avatar.setDragging(false);
    if(surface.hasPointerCapture(id))surface.releasePointerCapture(id);
    if(surface===$('stage')&&!moved&&event?.type==='pointerup')interactWithAvatar();
  };
  surface.addEventListener('pointerdown',event=>{
    if(!window.desktop||!document.body.classList.contains('widget')||event.button!==0)return;
    event.preventDefault();pointer=event.pointerId;origin={x:event.clientX,y:event.clientY};moved=false;
    surface.setPointerCapture(pointer);
    document.body.classList.add('dragging');
    avatar.setDragging(true);
    window.desktop.startDrag();
  });
  surface.addEventListener('pointermove',event=>{if(pointer!==null&&origin&&Math.hypot(event.clientX-origin.x,event.clientY-origin.y)>5)moved=true;});
  surface.addEventListener('pointerup',endDrag);
  surface.addEventListener('pointercancel',endDrag);
  surface.addEventListener('lostpointercapture',endDrag);
  window.addEventListener('blur',endDrag);
  window.addEventListener('beforeunload',endDrag);
}

function interactWithAvatar(){
 if(state.value!=='IDLE'||performance.now()-lastAvatarInteraction<550)return;
 lastAvatarInteraction=performance.now();lastUserActivity=lastAvatarInteraction;
 const reactions={robot:['curious','happy'],nova:['happy','curious','surprised'],butler:['curious','happy'],pixel:['surprised','happy','curious'],luma:['curious','happy']};
 const choices=reactions[config?.conversation?.persona]||['happy'];
 const emotion=choices[avatarInteractionIndex++%choices.length];
 document.body.classList.remove('avatar-touched');void $('stage').offsetWidth;document.body.classList.add('avatar-touched');
 clearTimeout(avatarInteractionTimer);avatar.setExpression(emotion);
 avatarInteractionTimer=setTimeout(()=>{document.body.classList.remove('avatar-touched');if(state.value==='IDLE')avatar.setExpression('relaxed');},900);
}

 const botIconFolderById = {robot:'rivet',nova:'nova',butler:'butler',pixel:'pixel',luma:'luma'};

function syncBotUI(){
 closeWidgetUtilities();
 const id=config.conversation.persona,name=config.bots?.[id]?.name||'Companion';
 const planningBot=id==='butler'?'STERLING':'NOVA';
 $('widget-calendar-eyebrow').textContent=planningBot;$('calendar-eyebrow').textContent=`${planningBot}’S WORKSPACE`;
 setWorkspaceMode(recommendedWorkspace[id]||'coding',false);
 syncSpecialistButton(id);
 $('widget-calendar-toggle').hidden=id!=='nova';if(id!=='nova'){$('widget-mini-calendar').hidden=true;document.body.classList.remove('widget-calendar-open');}
 $('widget-coding-tools').hidden=id!=='robot';$('widget-creative-toggle').hidden=!['luma','pixel'].includes(id);$('widget-creative-workspace').hidden=true;document.body.classList.remove('widget-creative-open','widget-creative-context-open');if(id==='butler'||id==='nova'){$('widget-calendar-toggle').hidden=false;$('widget-calendar-toggle').setAttribute('aria-label',id==='butler'?'Open planning calendar':'Open calendar');$('widget-calendar-toggle').title=id==='butler'?'Open planning calendar':'Open calendar';}else{$('widget-calendar-toggle').setAttribute('aria-label','Open calendar');$('widget-calendar-toggle').title='Open calendar';}
 $('widget-name').textContent=name;const profile=config.performanceProfile||'medium';$('widget-quality').textContent='Performance · '+(config.performanceProfiles?.[profile]?.name||'Balanced · Recommended');$('widget-quality').title='Performance: '+(config.performanceProfiles?.[profile]?.name||'Balanced · Recommended')+' · click to change';$('widget-quality-slider').value=String({low:0,medium:1}[profile]??1);$('widget-bot').title='Choose a robot · current: '+name;$('widget-bot').setAttribute('aria-label',$('widget-bot').title);$('bot-select').value=id;
 $('widget-panels-title').textContent=id==='robot'?'Build with Rivet':`${name} workspace`;
 $('stage').setAttribute('aria-label',name+' avatar');
 $('widget-drag').setAttribute('aria-label','Drag to move '+name);
 document.body.dataset.bot=id;
 const iconFolder = botIconFolderById[id] || 'rivet';
 $('widget-bot-icon').src=`/assets/bots/${iconFolder}/portrait.png`;
 $('widget-bot-icon').alt=name;
 $('widget-picker-toggle').title=`Choose companion · current: ${name}`;
 $('widget-picker-toggle').setAttribute('aria-label',$('widget-picker-toggle').title);
}
function switchBot(id){
 if(!config?.bots?.[id]||socket.readyState!==1)return;
 interrupt();avatar.showRobot(id);window.dispatchEvent(new Event('myavatar:bot-switch'));
 send({type:'bot',bot:id});
}
function openBotLibrary(){
 if(!config)return;
 const cards=$('bot-cards');cards.replaceChildren();
 for(const [id,bot] of Object.entries(config.bots||{})){
   const button=document.createElement('button');button.className='bot-card '+id;
   const selected=id===config.conversation.persona;
   button.setAttribute('aria-pressed',String(selected));
   const iconFolder = botIconFolderById[id] || 'rivet';
   const icon=document.createElement('img');icon.className='bot-mark';icon.src=`/assets/bots/${iconFolder}/portrait.png`;icon.alt='';
   const info=document.createElement('span');const name=document.createElement('b');name.textContent=bot.name+(selected?' · current':'');
   const detail=document.createElement('small');detail.textContent=({nova:'Charming, playful assistant',robot:'Witty repair robot',butler:'Wise British-style butler',pixel:'Bold marketing intern',luma:'Product designer & creative director'})[id]||'Custom companion';
   info.append(name,detail);button.append(icon,info);
   button.onclick=()=>{if(!selected)switchBot(id);closeBotLibrary();};cards.append(button);
 }
 closeWidgetMenu(false);$('bot-library').hidden=false;$('widget-picker-toggle').setAttribute('aria-expanded','true');$('library-close').focus();
}
function closeBotLibrary(){$('bot-library').hidden=true;$('widget-picker-toggle').setAttribute('aria-expanded','false');}
$('widget-bot').onclick=()=>{$('bot-library').hidden?openBotLibrary():closeBotLibrary();};
$('widget-picker-toggle').onclick=()=>{$('bot-library').hidden?openBotLibrary():closeBotLibrary();};
$('widget-quality').onclick=()=>{$('widget-quality-panel').hidden=!$('widget-quality-panel').hidden;$('widget-quality').setAttribute('aria-expanded',String(!$('widget-quality-panel').hidden));};
$('widget-quality-slider').onchange=()=>{const profile=['low','medium'][Number($('widget-quality-slider').value)];if(profile===config.performanceProfile)return;closeWidgetMenu();interrupt();send({type:'settings',interaction:$('interaction').value,performanceProfile:profile});};
$('library-close').onclick=closeBotLibrary;
window.addEventListener('pointerdown',event=>{if(!$('bot-library').hidden&&!$('bot-library').contains(event.target)&&!$('widget-bot').contains(event.target)&&!$('widget-picker-toggle').contains(event.target))closeBotLibrary();});

$('bot-select').onchange=()=>switchBot($('bot-select').value);

const widgetIcons={
 'widget-mic':'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M9 22h6"/>',
 'widget-mute':'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 10.5 6.1M12 19v3M9 22h6M3 3l18 18"/>',
 'widget-stop':'<rect x="6" y="6" width="12" height="12" rx="3"/>',
 'widget-chat-toggle':'<path d="M5 5h14v10H9l-4 4V5Z"/><path d="M8 9h8M8 12h5"/>',
 'widget-calendar':'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>',
 'widget-coding':'<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
 'widget-creative':'<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/>',
 'widget-awareness':'<path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
 'widget-bot':'<path d="M4 8h15l-4-4M20 16H5l4 4"/>',
 'widget-settings':'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.1 2.1-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V20h-3v-.08A1.7 1.7 0 0 0 10.68 18.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.1-2.1.06-.06A1.7 1.7 0 0 0 7.04 15a1.7 1.7 0 0 0-1.56-1.04H5v-3h.08A1.7 1.7 0 0 0 6.6 9.92a1.7 1.7 0 0 0-.34-1.88L6.2 7.98l2.1-2.1.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.28 4.7V4h3v.08a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.1 2.1-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.04H20v3h-.08A1.7 1.7 0 0 0 18.4 15Z"/>',
 'widget-minimize':'<path d="M5 12h14"/>',
 'expand':'<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>',
 'widget-close':'<path d="m7 7 10 10M17 7 7 17"/>'
};
const iconSvg=paths=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg>';
for(const [id,paths] of Object.entries(widgetIcons).filter(([id])=>['widget-mic','widget-stop','widget-chat-toggle','widget-awareness','expand'].includes(id)))$(id).innerHTML=iconSvg(paths);

const specialistByBot={nova:{kind:'calendar',label:'Open calendar',title:'Open Nova calendar'},butler:{kind:'calendar',label:'Open planning calendar',title:'Open Butler planning calendar'},robot:{kind:'coding',label:'Open coding tools',title:'Open Rivet coding tools'},pixel:{kind:'creative',label:'Open creative workspace',title:'Open Pixel creative workspace'},luma:{kind:'creative',label:'Open creative workspace',title:'Open Luma creative workspace'}};
let activeSpecialist='';
function syncSpecialistButton(id){
 const specialist=specialistByBot[id],button=$('widget-specialist-toggle');
 activeSpecialist=specialist?.kind||'';
 button.hidden=!specialist;
 button.setAttribute('aria-expanded','false');
 if(!specialist)return;
 button.innerHTML=iconSvg(widgetIcons[`widget-${specialist.kind}`]);
 button.setAttribute('aria-label',specialist.label);button.title=specialist.title;
}
function syncSpecialistState(kind,open){
 if(kind!==activeSpecialist)return;
 const button=$('widget-specialist-toggle'),specialist=specialistByBot[config?.conversation?.persona];
 const isOpen=Boolean(open);
 button.setAttribute('aria-expanded',String(isOpen));
 button.setAttribute('aria-label',isOpen?`Close ${specialist?.label?.replace(/^Open /,'')||'specialist workspace'}`:(specialist?.label||'Open specialist workspace'));
 button.title=button.getAttribute('aria-label');
}
window.addEventListener('myavatar:specialist-state',event=>syncSpecialistState(event.detail?.kind,event.detail?.open));
$('widget-specialist-toggle').onclick=()=>{if(activeSpecialist==='calendar')$('widget-calendar-toggle').click();else if(activeSpecialist==='coding')$('widget-coding-tools').click();else if(activeSpecialist==='creative')$('widget-creative-toggle').click();};

function setWidgetChat(open,focus=true){
 const shouldOpen=Boolean(open)&&document.body.classList.contains('widget');
 document.body.classList.toggle('widget-chat-open',shouldOpen);
 $('widget-chat-toggle').setAttribute('aria-expanded',String(shouldOpen));
 $('widget-chat-toggle').setAttribute('aria-label',shouldOpen?'Close chat':'Open chat');
 $('widget-chat-toggle').title=shouldOpen?'Close chat':'Open chat';
 if(shouldOpen){widgetUnread=0;syncWidgetUnread();syncWidgetStatus();}
 window.desktop?.widgetChat(shouldOpen);
 if(focus){if(shouldOpen)$('widget-text').focus();else $('widget-chat-toggle').focus();}
}
function closeWidgetUtilities(keep=''){
 if(keep!=='chat')setWidgetChat(false,false);
 if(keep!=='calendar'){$('widget-mini-calendar').hidden=true;document.body.classList.remove('widget-calendar-open');syncSpecialistState('calendar',false);requestCalendarLayout(false);}
 if(keep!=='creative'){$('widget-creative-workspace').hidden=true;document.body.classList.remove('widget-creative-open');syncSpecialistState('creative',false);requestCreativeLayout(false);}
 if(keep!=='coding')window.closeCodingWorkspace?.();
}
$('widget-chat-toggle').onclick=()=>setWidgetChat(!document.body.classList.contains('widget-chat-open'));
$('widget-chat-close').onclick=()=>setWidgetChat(false);
