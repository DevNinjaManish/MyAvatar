function send(win,payload){
  const socket=win.__myAvatarSocket;
  if(!socket||socket.readyState!==win.WebSocket.OPEN)throw new Error('Local service is disconnected.');
  socket.send(JSON.stringify(payload));
}

const repairTransactions=new Set();
let repairRequestPending=false;

function card(doc,className){
  const node=doc.createElement('div');
  node.className=`coding-edit-card ${className||''}`.trim();
  return node;
}

function appendToChats(doc,factory){
  const targets=[doc.getElementById('messages'),doc.getElementById('widget-messages')].filter(Boolean);
  for(const target of targets){
    const node=factory();
    target.append(node);
    if(target.id==='widget-messages')target.scrollTop=target.scrollHeight;
  }
}

function makePatchCard(win,doc,event){
  const tx=event.transaction;
  if(repairRequestPending){repairTransactions.add(tx.id);repairRequestPending=false;}
  const repair=repairTransactions.has(tx.id)||tx.repairRound===1;
  const node=card(doc,repair?'coding-patch-card coding-repair-card':'coding-patch-card');
  node.dataset.transactionId=tx.id;
  const title=doc.createElement('strong');title.textContent=repair?'Rivet prepared one repair attempt':'Rivet prepared a code change';
  const meta=doc.createElement('div');meta.className='coding-edit-meta';
  const changed=tx.files.map(file=>`${file.path} (+${file.additions}/-${file.deletions})`).join(' · ');
  meta.textContent=`${changed} · expires in ${Math.round((tx.expiresInSeconds||600)/60)} min`;
  const pre=doc.createElement('pre');pre.textContent=event.diff||'';
  const actions=doc.createElement('div');actions.className='coding-edit-actions';
  const approve=doc.createElement('button');approve.type='button';approve.textContent=repair?'Apply repair':'Apply change';
  const reject=doc.createElement('button');reject.type='button';reject.textContent='Reject';
  const decide=decision=>{
    try{
      send(win,{type:'coding_edit_decision',transactionId:tx.id,decision,turn:event.turn});
      approve.disabled=true;reject.disabled=true;
    }catch(error){
      const failure=doc.createElement('span');failure.className='coding-edit-error';failure.textContent=String(error.message||error);node.append(failure);
    }
  };
  approve.onclick=()=>decide('approve');reject.onclick=()=>decide('reject');
  actions.append(approve,reject);node.append(title,meta,pre,actions);
  return node;
}

function appendVerification(doc,node,verification){
  if(!verification)return;
  const section=doc.createElement('div');
  section.className=`coding-verification coding-verification-${verification.status||'unknown'}`;
  const heading=doc.createElement('strong');heading.textContent=verification.message||'Verification finished.';section.append(heading);
  for(const check of verification.checks||[]){
    const row=doc.createElement('div');row.className='coding-verification-check';
    const label=doc.createElement('span');label.textContent=`${check.ok?'Pass':'Fail'} · ${check.label||check.id}`;row.append(label);
    if(check.output){const pre=doc.createElement('pre');pre.textContent=check.output;row.append(pre);}
    section.append(row);
  }
  node.append(section);
}

function repairRequest(event){
  const files=(event.result?.files||[]).map(item=>item.path).filter(Boolean).slice(0,8);
  const failures=(event.verification?.checks||[]).filter(check=>check.ok===false).map(check=>{
    const output=String(check.output||'').slice(-5000);
    return `${check.label||check.id||'Verification'}:\n${output}`;
  }).join('\n\n').slice(-8000);
  if(!files.length||!failures)return '';
  return `Repair only the verification failure from the code change you just applied. Limit the repair to these changed files: ${files.join(', ')}. Do not broaden the scope or refactor unrelated code. This is the only automatic repair attempt; produce a minimal patch and stop after it. Failed verification output:\n${failures}`;
}

function makeResultCard(win,doc,event){
  const node=card(doc,event.error?'coding-result-card coding-result-error':'coding-result-card');
  const title=doc.createElement('strong');title.textContent=event.message||'Coding edit updated.';
  node.append(title);
  appendVerification(doc,node,event.verification);
  const txId=event.result?.id;
  const isRepair=Boolean(txId&&repairTransactions.has(txId))||event.repairRound===1||event.result?.repairRound===1;
  if(event.verification?.status==='failed'&&!isRepair){
    const prompt=repairRequest(event);
    if(prompt){
      const repair=doc.createElement('button');repair.type='button';repair.textContent='Propose one repair';
      repair.onclick=()=>{
        try{
          repair.disabled=true;repairRequestPending=true;
          send(win,{type:'turn',turn:event.turn,text:prompt});
        }catch(error){
          repairRequestPending=false;repair.disabled=false;
          const failure=doc.createElement('span');failure.className='coding-edit-error';failure.textContent=String(error.message||error);node.append(failure);
        }
      };
      node.append(repair);
    }
  }else if(event.verification?.status==='failed'&&isRepair){
    const stop=doc.createElement('div');stop.className='coding-repair-limit';stop.textContent='Repair attempt used. Rivet stopped after one verification retry.';node.append(stop);
  }
  if(event.result?.rollbackAvailable){
    const rollback=doc.createElement('button');rollback.type='button';rollback.textContent='Rollback';
    rollback.onclick=()=>{
      try{rollback.disabled=true;send(win,{type:'coding_rollback',transactionId:event.result.id,turn:event.turn});}
      catch(error){rollback.disabled=false;const failure=doc.createElement('span');failure.className='coding-edit-error';failure.textContent=String(error.message||error);node.append(failure);}
    };
    node.append(rollback);
  }
  return node;
}

function mountWorkspaceControl(win,doc){
  const host=doc.getElementById('messages');
  if(!host||doc.getElementById('rivet-workspace-control'))return;
  const node=card(doc,'coding-workspace-card');node.id='rivet-workspace-control';
  const label=doc.createElement('label');label.textContent='Rivet workspace';
  const input=doc.createElement('input');input.type='text';input.placeholder='Local project folder path';input.autocomplete='off';
  const button=doc.createElement('button');button.type='button';button.textContent='Set workspace';
  const status=doc.createElement('span');status.className='coding-workspace-status';status.textContent='Using MyAvatar';
  button.onclick=()=>{
    const path=input.value.trim();if(!path)return;
    try{send(win,{type:'coding_workspace',path});button.disabled=true;setTimeout(()=>{button.disabled=false;},400);}
    catch(error){button.disabled=false;status.textContent=String(error.message||error);}
  };
  node.append(label,input,button,status);host.prepend(node);
}

export function mountCodingEdits(win=window,doc=document){
  mountWorkspaceControl(win,doc);
  const socket=win.__myAvatarSocket;
  if(!socket)return;
  socket.addEventListener('message',raw=>{
    let event;try{event=JSON.parse(raw.data);}catch{return;}
    if(event.type==='coding_patch')appendToChats(doc,()=>makePatchCard(win,doc,event));
    if(event.type==='coding_edit_result')appendToChats(doc,()=>makeResultCard(win,doc,event));
    if(event.type==='coding_workspace'){
      repairRequestPending=false;repairTransactions.clear();
      const status=doc.querySelector('.coding-workspace-status');
      if(status)status.textContent=`Using ${event.workspace?.name||event.workspace?.path||'workspace'}`;
    }
  });
}
