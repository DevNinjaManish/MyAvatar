import {ChatStore,shouldFollowScroll} from './chat-store.js';

const STATUS_LABEL={streaming:'Writing…',interrupted:'Interrupted',failed:'Failed'};
const APPROVAL_LABEL={approved:'Approved · action completed',denied:'Denied',failed:'Action failed'};

function button(doc,label,action){const node=doc.createElement('button');node.type='button';node.className='message-action';node.textContent=label;node.dataset.action=action;return node;}

function renderMessage(doc,item,botName,store,win){
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

  if(item.type==='approval'){
    wrapper.classList.add('action-request');
    const state=item.meta?.approvalState||'pending';
    body.textContent=state==='pending'?`${item.text}. Allow this once?`:item.text;
    if(state==='pending'){
      const actions=doc.createElement('div');actions.className='message-actions approval-actions';
      const allow=button(doc,'Allow once','approve'),deny=button(doc,'Deny','deny');
      const decide=decision=>{
        allow.disabled=true;deny.disabled=true;
        win.dispatchEvent(new CustomEvent('myavatar:approval-decision',{detail:{requestId:item.meta.requestId,decision}}));
      };
      allow.onclick=()=>decide('allow_once');deny.onclick=()=>decide('deny');actions.append(allow,deny);wrapper.append(actions);
    }else{
      const result=doc.createElement('small');result.className='message-status approval-result';result.textContent=APPROVAL_LABEL[state]||state;wrapper.append(result);
    }
    return wrapper;
  }

  if(item.type==='tool-result'){
    wrapper.classList.add('tool-result');
    return wrapper;
  }

  if(item.type==='message'&&item.text){
    const actions=doc.createElement('div');actions.className='message-actions';
    const copy=button(doc,'Copy','copy');
    copy.onclick=async()=>{try{await win.navigator?.clipboard?.writeText(item.text);copy.textContent='Copied';setTimeout(()=>{copy.textContent='Copy';},900);}catch{}};
    actions.append(copy);
    if(store.canRetry(item)&&store.userTextForTurn(item.turn)){
      const retry=button(doc,'Retry','retry');
      retry.onclick=()=>{
        const text=store.userTextForTurn(item.turn);
        if(!text||store.draft().trim())return;
        store.setDraft(text);
        const form=doc.body.classList.contains('widget')?doc.getElementById('widget-text-form'):doc.getElementById('text-form');
        form?.requestSubmit?.();
      };
      retry.title='Retry only this non-side-effecting response';actions.append(retry);
    }
    wrapper.append(actions);
  }
  return wrapper;
}

function renderContainer(doc,container,store,win,{compact=false}={}){
  if(!container)return;
  const follow=shouldFollowScroll(container);
  const oldHeight=container.scrollHeight;const oldTop=container.scrollTop;
  const messages=store.snapshot();
  const fragment=doc.createDocumentFragment();
  const focus=store.focus();
  if(focus&&messages.length){
    const note=doc.createElement('div');note.className='session-focus';note.title='Temporary session context for this companion';
    const label=doc.createElement('strong');label.textContent='Current focus';
    const text=doc.createElement('span');text.textContent=focus;
    note.append(label,text);fragment.append(note);
  }
  if(compact&&!messages.length){const hint=doc.createElement('p');hint.className='hint';hint.textContent='Talk naturally or type a message.';fragment.append(hint);}
  for(const item of messages)fragment.append(renderMessage(doc,item,store.botName,store,win));
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
  const render=()=>{queued=false;renderContainer(doc,full,store,win);renderContainer(doc,compact,store,win,{compact:true});};
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
