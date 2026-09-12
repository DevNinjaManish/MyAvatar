const text=value=>String(value||'').replace(/\s+/g,' ').trim();
const id=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

export function emptyNovaWorkspace(){return {focus:'',reminders:[],events:[],plan:[]};}

export function normalizeNovaWorkspace(value){
  const source=value&&typeof value==='object'?value:{};
  const item=(entry,kind)=>({id:typeof entry?.id==='string'?entry.id:id(),text:text(entry?.text),due:typeof entry?.due==='string'?entry.due:'',done:Boolean(entry?.done),kind});
  return {focus:text(source.focus),reminders:Array.isArray(source.reminders)?source.reminders.map(entry=>item(entry,'reminder')).filter(entry=>entry.text):[],events:Array.isArray(source.events)?source.events.map(entry=>item(entry,'event')).filter(entry=>entry.text):[],plan:Array.isArray(source.plan)?source.plan.map(entry=>item(entry,'plan')).filter(entry=>entry.text):[]};
}

export function addNovaItem(workspace,kind,{text:label,due=''}={}){
  const next=normalizeNovaWorkspace(workspace);const value=text(label);if(!['reminder','event','plan'].includes(kind)||!value)return next;
  next[`${kind}s`].push({id:id(),text:value,due:String(due||''),done:false,kind});return next;
}

export function toggleNovaItem(workspace,kind,itemId){
  const next=normalizeNovaWorkspace(workspace);const list=next[`${kind}s`];const item=list?.find(entry=>entry.id===itemId);if(item)item.done=!item.done;return next;
}

export function removeNovaItem(workspace,kind,itemId){
  const next=normalizeNovaWorkspace(workspace);const key=`${kind}s`;if(Array.isArray(next[key]))next[key]=next[key].filter(entry=>entry.id!==itemId);return next;
}
