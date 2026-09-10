const DETAIL_LIMIT=260;

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

export function toolResultDetail(item={}){
  if(item.type!=='tool-result')return {summary:String(item.text||''),detail:'',expandable:false};
  const meta=item.meta||{};
  const summary=String(meta.summary||item.text||'Tool result').trim();
  const explicit=String(meta.detail||meta.output||meta.log||meta.diff||'').trim();
  if(explicit)return {summary,detail:explicit,expandable:true};
  if(summary.length<=DETAIL_LIMIT)return {summary,detail:'',expandable:false};
  const split=summary.lastIndexOf('\n',DETAIL_LIMIT);
  const cut=split>80?split:DETAIL_LIMIT;
  return {summary:summary.slice(0,cut).trimEnd()+'…',detail:summary,expandable:true};
}
