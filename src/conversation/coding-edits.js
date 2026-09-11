function send(win,payload){
  const socket=win.__myAvatarSocket;
  if(!socket||socket.readyState!==win.WebSocket.OPEN)throw new Error('Local service is disconnected.');
  socket.send(JSON.stringify(payload));
}

const repairTransactions=new Set();
let verificationStatus=null;

function card(doc,className){const node=doc.createElement('div');node.className=`coding-edit-card ${className||''}`.trim();return node;}
function appendToChats(doc,factory){for(const target of [doc.getElementById('messages'),doc.getElementById('widget-messages')].filter(Boolean)){const node=factory();target.append(node);if(target.id==='widget-messages')target.scrollTop=target.scrollHeight;}}

function makePatchCard(win,doc,event){
  const tx=event.transaction;const repair=tx.repairRound===1;if(repair)repairTransactions.add(tx.id);
  const node=card(doc,repair?'coding-patch-card coding-repair-card':'coding-patch-card');node.dataset.transactionId=tx.id;
  const title=doc.createElement('strong');title.textContent=repair?'Rivet prepared one repair attempt':'Rivet prepared a code change';
  const meta=doc.createElement('div');meta.className='coding-edit-meta';meta.textContent=`${tx.files.map(file=>`${file.path} (+${file.additions}/-${file.deletions})`).join(' · ')} · expires in ${Math.round((tx.expiresInSeconds||600)/60)} min`;
  const pre=doc.createElement('pre');pre.textContent=event.diff||'';const actions=doc.createElement('div');actions.className='coding-edit-actions';
  const approve=doc.createElement('button');approve.type='button';approve.textContent=repair?'Apply repair':'Apply change';const reject=doc.createElement('button');reject.type='button';reject.textContent='Reject';
  const decide=decision=>{try{send(win,{type:'coding_edit_decision',transactionId:tx.id,decision,turn:event.turn});approve.disabled=true;reject.disabled=true;}catch(error){const failure=doc.createElement('span');failure.className='coding-edit-error';failure.textContent=String(error.message||error);node.append(failure);}};
  approve.onclick=()=>decide('approve');reject.onclick=()=>decide('reject');actions.append(approve,reject);node.append(title,meta,pre,actions);return node;
}

function appendVerification(doc,node,verification){
  if(!verification)return;const section=doc.createElement('div');section.className=`coding-verification coding-verification-${verification.status||'unknown'}`;
  const heading=doc.createElement('strong');heading.textContent=verification.message||'Verification finished.';section.append(heading);
  for(const check of verification.checks||[]){const row=doc.createElement('div');row.className='coding-verification-check';const label=doc.createElement('span');label.textContent=`${check.ok?'Pass':'Fail'} · ${check.label||check.id}`;row.append(label);if(check.output){const pre=doc.createElement('pre');pre.textContent=check.output;row.append(pre);}section.append(row);}node.append(section);
}

function makeResultCard(win,doc,event){
  const node=card(doc,event.error?'coding-result-card coding-result-error':'coding-result-card');const title=doc.createElement('strong');title.textContent=event.message||'Coding edit updated.';node.append(title);appendVerification(doc,node,event.verification);
  const txId=event.result?.id;const isRepair=Boolean(txId&&repairTransactions.has(txId))||event.repairRound===1||event.result?.repairRound===1;
  if(event.verification?.status==='failed'&&!isRepair&&txId){const repair=doc.createElement('button');repair.type='button';repair.textContent='Propose one repair';repair.onclick=()=>{try{repair.disabled=true;send(win,{type:'coding_repair',transactionId:txId,turn:event.turn});}catch(error){repair.disabled=false;const failure=doc.createElement('span');failure.className='coding-edit-error';failure.textContent=String(error.message||error);node.append(failure);}};node.append(repair);}
  else if(event.verification?.status==='failed'&&isRepair){const stop=doc.createElement('div');stop.className='coding-repair-limit';stop.textContent='Repair attempt used. Rivet stopped after one verification retry.';node.append(stop);}
  if(event.result?.rollbackAvailable){const rollback=doc.createElement('button');rollback.type='button';rollback.textContent='Rollback';rollback.onclick=()=>{try{rollback.disabled=true;send(win,{type:'coding_rollback',transactionId:event.result.id,turn:event.turn});}catch(error){rollback.disabled=false;const failure=doc.createElement('span');failure.className='coding-edit-error';failure.textContent=String(error.message||error);node.append(failure);}};node.append(rollback);}return node;
}

function makeVerificationStatus(doc,event){const node=card(doc,'coding-verification-status');const title=doc.createElement('strong');title.textContent=event.message||'Rivet is testing the change…';const detail=doc.createElement('span');detail.textContent=event.status==='running'?'Safe allowlisted checks are running. Stop will cancel them.':event.status==='cancelled'?'Verification stopped.':'';node.append(title,detail);return node;}

async function chooseWorkspace(win,doc){
  const status=doc.querySelector('.coding-workspace-status');
  if(!win.desktop?.chooseRivetWorkspace){if(status)status.textContent='Native folder picker unavailable.';return;}
  if(status)status.textContent='Choosing project…';
  const result=await win.desktop.chooseRivetWorkspace();
  if(!result?.ok){if(status)status.textContent=result?.error||'Folder selection failed.';return;}
  if(result.canceled){if(status)status.textContent='Workspace unchanged.';return;}
  if(!result.workspacePath){if(status)status.textContent='Selected folder could not be shared with Rivet.';return;}
  send(win,{type:'coding_workspace',path:result.workspacePath});
}

function mountWorkspaceControl(win,doc){
  const host=doc.getElementById('messages');if(!host||doc.getElementById('rivet-workspace-control'))return;
  const node=card(doc,'coding-workspace-card');node.id='rivet-workspace-control';const label=doc.createElement('label');label.textContent='Rivet workspace';const button=doc.createElement('button');button.type='button';button.textContent='Choose project…';const status=doc.createElement('span');status.className='coding-workspace-status';status.textContent='Using MyAvatar';button.onclick=()=>{button.disabled=true;chooseWorkspace(win,doc).catch(error=>{status.textContent=String(error.message||error);}).finally(()=>{button.disabled=false;});};node.append(label,button,status);host.prepend(node);
}

export function mountCodingEdits(win=window,doc=document){
  mountWorkspaceControl(win,doc);const socket=win.__myAvatarSocket;if(!socket)return;
  socket.addEventListener('message',raw=>{let event;try{event=JSON.parse(raw.data);}catch{return;}
    if(event.type==='coding_patch')appendToChats(doc,()=>makePatchCard(win,doc,event));
    if(event.type==='coding_edit_result')appendToChats(doc,()=>makeResultCard(win,doc,event));
    if(event.type==='coding_verification'){verificationStatus=event.status;appendToChats(doc,()=>makeVerificationStatus(doc,event));}
    if(event.type==='coding_workspace_picker')chooseWorkspace(win,doc).catch(()=>{});
    if(event.type==='coding_workspace'){repairTransactions.clear();verificationStatus=null;const status=doc.querySelector('.coding-workspace-status');if(status)status.textContent=`Using ${event.workspace?.name||'workspace'}`;}
  });
}
