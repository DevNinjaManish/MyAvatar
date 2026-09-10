export function toolResultPresentation(item={}){
  const meta=item.meta||{};
  if(item.type==='approval'){
    const state=meta.approvalState||'pending';
    if(state==='approved')return {tone:'success',label:'Completed'};
    if(state==='denied')return {tone:'neutral',label:'Denied'};
    if(state==='failed')return {tone:'danger',label:'Failed'};
    if(state==='cancelled')return {tone:'neutral',label:'Cancelled'};
    return {tone:'pending',label:'Approval needed'};
  }
  if(item.type==='tool-result'){
    if(meta.denied)return {tone:'neutral',label:'Denied'};
    if(meta.ok===true)return {tone:'success',label:'Completed'};
    if(meta.ok===false)return {tone:'danger',label:'Failed'};
    return {tone:'neutral',label:'Result'};
  }
  return null;
}

export function toolCardTitle(item={}){
  if(item.type==='approval')return 'Local action';
  if(item.type==='tool-result')return 'Tool result';
  return '';
}
