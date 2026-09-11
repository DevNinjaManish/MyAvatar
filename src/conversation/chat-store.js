const FINAL_STATUSES=new Set(['complete','interrupted','failed']);
const VALID_STATUSES=new Set(['streaming',...FINAL_STATUSES]);
const MAX_FOCUS_CHARS=140;

export function shouldFollowScroll({scrollTop=0,clientHeight=0,scrollHeight=0}={},threshold=56){
  return scrollHeight-clientHeight-scrollTop<=threshold;
}
function cleanFocus(text){
  const value=String(text??'').replace(/\s+/g,' ').trim();
  if(!value)return '';
  return value.length<=MAX_FOCUS_CHARS?value:value.slice(0,MAX_FOCUS_CHARS-1).trimEnd()+'…';
}

export class ChatStore extends EventTarget{
  constructor(){super();this.botId='robot';this.botName='Rivet';this.messagesByBot=new Map();this.drafts=new Map();this.focusByBot=new Map();}
  _messages(bot=this.botId){if(!this.messagesByBot.has(bot))this.messagesByBot.set(bot,[]);return this.messagesByBot.get(bot);}
  snapshot(bot=this.botId){return this._messages(bot).map(item=>({...item,meta:{...(item.meta||{})}}));}
  draft(bot=this.botId){return this.drafts.get(bot)||'';}
  setDraft(text,bot=this.botId){this.drafts.set(bot,String(text??''));this._emit('draft');}
  addUserText(text,turn){return this._upsert({id:`turn-${turn}-user`,role:'user',text:String(text||''),status:'complete',turn});}
  focus(bot=this.botId){return this.focusByBot.get(bot)||'';}
  setFocus(text,bot=this.botId){const value=cleanFocus(text);if(value)this.focusByBot.set(bot,value);else this.focusByBot.delete(bot);this._emit('focus');return value;}
  setBot(botId,name){if(typeof botId==='string'&&botId)this.botId=botId;if(typeof name==='string'&&name)this.botName=name;this._emit('bot');}
  clear(bot=this.botId){this.messagesByBot.set(bot,[]);this.focusByBot.delete(bot);this._emit('messages');this._emit('focus');}
  loadHistory(history=[],bot=this.botId){
    const items=[];let index=0,lastUser='';
    for(const entry of Array.isArray(history)?history:[]){
      if(!entry||!['user','assistant'].includes(entry.role))continue;
      const text=String(entry.content||'');
      items.push({id:`history-${bot}-${index++}`,botId:bot,role:entry.role,type:'message',text,status:'complete',turn:null,meta:{}});
      if(entry.role==='user'&&text.trim())lastUser=text;
    }
    this.messagesByBot.set(bot,items);
    if(lastUser)this.focusByBot.set(bot,cleanFocus(lastUser));else this.focusByBot.delete(bot);
    this._emit('messages');this._emit('focus');
  }
  addStructured({id,type,text='',status='complete',turn=null,meta={}}){return this._upsert({id,role:'system',type,text,status,turn,meta});}
  _find(turn,role='assistant'){return this._messages().find(item=>item.turn===turn&&item.role===role);}
  _findApproval(requestId){return this._messages().find(item=>item.type==='approval'&&item.meta?.requestId===requestId);}
  userTextForTurn(turn){return this._find(turn,'user')?.text||'';}
  canRetry(item){return Boolean(item&&item.role==='assistant'&&['failed','interrupted'].includes(item.status)&&Number.isInteger(item.turn)&&!item.meta?.sideEffect);}
  _markSideEffect(turn){const item=this._find(turn,'assistant');if(item){item.meta.sideEffect=true;this._emit('messages');}}
  cancelPendingApprovals(turn=null){let changed=false;for(const item of this._messages()){if(item.type==='approval'&&item.meta?.approvalState==='pending'&&(turn===null||item.turn===turn)){item.meta.approvalState='cancelled';changed=true;}}if(changed)this._emit('messages');return changed;}
  _upsert({id,role,type='message',text='',status='streaming',turn=null,meta={}}){
    if(!VALID_STATUSES.has(status))throw Error(`Invalid message status: ${status}`);
    const list=this._messages();let item=list.find(entry=>entry.id===id);
    if(item){Object.assign(item,{role,type,text,status,turn});item.meta={...item.meta,...meta};}
    else{item={id,botId:this.botId,role,type,text,status,turn,meta:{...meta}};list.push(item);}
    this._emit('messages');return item;
  }
  applyRuntimeEvent(event){
    if(!event||typeof event!=='object')return;
    if(event.type==='config'){
      const id=event.botId||event.config?.conversation?.persona||this.botId;
      const name=event.config?.bots?.[id]?.name||this.botName;
      this.setBot(id,name);return;
    }
    if(event.botId&&event.botId!==this.botId)return;
    const turn=Number.isInteger(event.turn)?event.turn:null;
    if(event.type==='bot_history'){this.loadHistory(event.history,this.botId);return;}
    if(event.type==='transcript'&&turn!==null){this._upsert({id:`turn-${turn}-user`,role:'user',text:String(event.text||''),status:'complete',turn});this.setFocus(event.text);return;}
    if(event.type==='token'&&turn!==null){
      let item=this._find(turn,'assistant');
      if(!item)item=this._upsert({id:`turn-${turn}-assistant`,role:'assistant',text:'',status:'streaming',turn});
      if(FINAL_STATUSES.has(item.status))return;
      item.text+=String(event.text||'');this._emit('messages');return;
    }
    if(event.type==='emotion'&&turn!==null){const item=this._find(turn,'assistant');if(item){item.meta.emotion=event.emotion;this._emit('messages');}return;}
    if(event.type==='speech_unavailable'&&turn!==null){
      let item=this._find(turn,'assistant');if(!item)item=this._upsert({id:`turn-${turn}-assistant`,role:'assistant',text:'',status:'streaming',turn});
      item.meta.voiceWarning=String(event.message||'Voice unavailable; response remains available as text.');this._emit('messages');return;
    }
    if(event.type==='done'&&turn!==null){const item=this._find(turn,'assistant');if(item&&!FINAL_STATUSES.has(item.status)){item.status='complete';this._emit('messages');}return;}
    if(event.type==='error'&&turn!==null){const item=this._find(turn,'assistant');if(item&&!FINAL_STATUSES.has(item.status)){item.status='failed';item.meta.error=String(event.message||'Response failed.');this._emit('messages');}return;}
    if(event.type==='greeting'){
      const id=`greeting-${event.operationId||event.sequence||Date.now()}`;
      this._upsert({id,role:'assistant',text:String(event.text||''),status:'complete',meta:{emotion:'happy'}});return;
    }
    if(event.type==='action_request'){
      if(turn!==null)this._markSideEffect(turn);
      const action=event.action||{};
      const target=action.kind==='set_volume'?`${action.value}%`:String(action.value||'');
      const label=action.kind==='set_volume'?`Change system volume to ${target}`:`${String(action.kind||'action').replaceAll('_',' ')} ${target}`.trim();
      this._upsert({id:`approval-${event.requestId||event.sequence}`,role:'system',type:'approval',text:label,status:'complete',turn,meta:{requestId:event.requestId,action,approvalState:'pending',sideEffect:true}});return;
    }
    if(event.type==='action_result'){
      if(turn!==null)this._markSideEffect(turn);
      const approval=this._findApproval(event.requestId);
      const approvalState=event.denied?'denied':event.ok?'approved':'failed';
      if(approval){approval.meta.approvalState=approvalState;approval.meta.resultOk=Boolean(event.ok);this._emit('messages');}
      else this.addStructured({id:`action-result-${event.requestId||event.sequence}`,type:'tool-result',text:event.ok?'Action completed.':event.denied?'Action denied.':'Action failed.',turn,meta:{requestId:event.requestId,ok:Boolean(event.ok),denied:Boolean(event.denied),sideEffect:true}});
    }
  }
  interrupt(turn){const item=this._find(turn,'assistant');if(item&&!FINAL_STATUSES.has(item.status)){item.status='interrupted';this.cancelPendingApprovals(turn);this._emit('messages');}}
  interruptLatest(){const list=this._messages();for(let i=list.length-1;i>=0;i--){const item=list[i];if(item.role==='assistant'&&!FINAL_STATUSES.has(item.status)){item.status='interrupted';this.cancelPendingApprovals(item.turn);this._emit('messages');return item;}}this.cancelPendingApprovals();return null;}
  _emit(kind){this.dispatchEvent(new CustomEvent('change',{detail:{kind,botId:this.botId}}));}
}
