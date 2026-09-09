import {ChatStore,shouldFollowScroll} from './chat-store.js';

const STATUS_LABEL={streaming:'Writing…',interrupted:'Interrupted',failed:'Failed'};

function renderMessage(doc,item,botName){
  const wrapper=doc.createElement('div');
  wrapper.className=`message ${item.role==='user'?'user':item.role==='assistant'?'assistant':'system-message'}`;
  wrapper.dataset.messageId=item.id;wrapper.dataset.status=item.status;wrapper.dataset.type=item.type;
  const label=doc.createElement('div');label.className='role';
  label.textContent=item.role==='user'?'You':item.role==='assistant'?botName:'System';
  const body=doc.createElement('div');body.className='message-body';body.textContent=item.text;
  wrapper.append(label,body);
  const status=STATUS_LABEL[item.status];
  if(status){const note=doc.createElement('small');note.className='message-status';note.textContent=status;wrapper.append(note);}
  if(item.meta?.voiceWarning){const warning=doc.createElement('small');warning.className='message-voice-warning';warning.textContent='Voice unavailable · text response preserved';warning.title=item.meta.voiceWarning;wrapper.append(warning);}
  if(item.type==='approval'){wrapper.classList.add('action-request');body.textContent='Approval required for an action.';}
  return wrapper;
}

function renderContainer(doc,container,store,{compact=false}={}){
  if(!container)return;
  const follow=shouldFollowScroll(container);
  const oldHeight=container.scrollHeight;const oldTop=container.scrollTop;
  const messages=store.snapshot();
  const fragment=doc.createDocumentFragment();
  if(compact&&!messages.length){const hint=doc.createElement('p');hint.className='hint';hint.textContent='Talk naturally or type a message.';fragment.append(hint);}
  for(const item of messages)fragment.append(renderMessage(doc,item,store.botName));
  container.replaceChildren(fragment);
  if(follow){container.scrollTop=container.scrollHeight;container.dataset.newMessages='false';}
  else{container.scrollTop=Math.max(0,oldTop+(container.scrollHeight-oldHeight));container.dataset.newMessages='true';}
}

export function mountCanonicalChat(win=window,doc=document){
  if(win.__myavatarChatStore)return win.__myavatarChatStore;
  const store=new ChatStore();win.__myavatarChatStore=store;
  const full=doc.getElementById('messages'),compact=doc.getElementById('widget-messages');
  const fullInput=doc.getElementById('text'),widgetInput=doc.getElementById('widget-text');
  let queued=false;
  const render=()=>{queued=false;renderContainer(doc,full,store);renderContainer(doc,compact,store,{compact:true});};
  const queueRender=()=>{if(queued)return;queued=true;queueMicrotask(render);};
  const syncDraft=()=>{const value=store.draft();if(fullInput&&fullInput.value!==value)fullInput.value=value;if(widgetInput&&widgetInput.value!==value)widgetInput.value=value;};
  store.addEventListener('change',event=>{if(event.detail?.kind==='bot'||event.detail?.kind==='draft')syncDraft();queueRender();});
  win.addEventListener('myavatar:runtime-event',event=>{store.applyRuntimeEvent(event.detail);});
  win.addEventListener('myavatar:client-message',event=>{
    const message=event.detail;
    if(message?.type==='turn')store.setDraft('');
    if(message?.type==='stop')store.interruptLatest();
  });
  for(const input of [fullInput,widgetInput].filter(Boolean))input.addEventListener('input',()=>{store.setDraft(input.value);});
  for(const container of [full,compact].filter(Boolean))container.addEventListener('scroll',()=>{if(shouldFollowScroll(container))container.dataset.newMessages='false';},{passive:true});
  render();syncDraft();return store;
}
