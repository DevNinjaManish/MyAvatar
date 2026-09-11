const ENGINE_LABELS={llm:'LLM',stt:'STT',tts:'TTS',coding:'Coding'};
const stateLabel=state=>({ready:'Ready',preparing:'Preparing',pending:'Starting',deferred:'Deferred',unavailable:'Unavailable'}[state]||'Unknown');

export function systemTelemetryState({readiness={},config={},task=null,metrics=null}={}){
  const engines=readiness.engines||{};
  const engineState=id=>stateLabel(engines[id]?.state);
  const memory=metrics?.memory||{};
  const cpuValue=Number(metrics?.cpuPercent);
  const memoryValue=Number(memory.usedPercent);
  return {
    cpu:metrics?.cpuPercent==null||!Number.isFinite(cpuValue)?'Unavailable':`${Math.max(0,Math.min(100,cpuValue)).toFixed(0)}%`,
    memory:memory.usedPercent==null||!Number.isFinite(memoryValue)?'Unavailable':`${Math.max(0,Math.min(100,memoryValue)).toFixed(0)}% used`,
    memoryDetail:memory.usedMb!=null&&memory.totalMb!=null?`${Math.round(memory.usedMb)} / ${Math.round(memory.totalMb)} MB`:'',
    model:config.llm?.model||'Local model not reported',
    performance:config.performanceProfile==='medium'?'Balanced':config.performanceProfile==='low'?'Fast':'Not reported',
    engines:Object.fromEntries(Object.keys(ENGINE_LABELS).map(id=>[id,engineState(id)])),
    task:task?.phase?String(task.phase):'IDLE',
    taskStatus:task?.status||'ready',
  };
}

export function mountSystemCockpit(win=window,doc=document){
  if(win.__myavatarSystemCockpit)return win.__myavatarSystemCockpit;
  const main=doc.querySelector('main'),stage=doc.getElementById('stage');
  if(!main||!stage)return null;
  const section=doc.createElement('section');section.id='system-workspace';section.hidden=true;section.setAttribute('aria-labelledby','system-title');
  section.innerHTML='<div class="workspace-heading"><div><span class="eyebrow">SYSTEMS COCKPIT</span><h2 id="system-title">Local runtime health</h2><p id="system-status">Reading local runtime state…</p></div><span class="system-refresh">Live · 5s</span></div><div class="system-grid"></div><p class="system-note">Local telemetry only. The avatar and conversation remain the primary workspace.</p>';
  stage.insertAdjacentElement('afterend',section);
  let readiness={},config={},task=null,metrics=null,pollTimer=0;
  const grid=section.querySelector('.system-grid'),status=section.querySelector('#system-status'),widgetHud=doc.getElementById('widget-system-hud'),rail=doc.getElementById('widget-system-rail');
  const render=()=>{const state=systemTelemetryState({readiness,config,task,metrics});const cards=[['CPU',state.cpu,state.cpu==='Unavailable'?'Local metric unavailable':'Process usage'],['Memory',state.memory,state.memoryDetail||'System metric unavailable'],['Active LLM',state.model,state.performance],['STT',state.engines.stt,'Speech recognition'],['TTS',state.engines.tts,'Speech output'],['Coding specialist',state.engines.coding,'Lazy-loaded Rivet engine'],['Current task',state.task,state.taskStatus]];grid.replaceChildren();for(const [label,value,detail] of cards){const card=doc.createElement('article');const heading=doc.createElement('span');heading.textContent=label;const valueNode=doc.createElement('strong');valueNode.textContent=value;const detailNode=doc.createElement('small');detailNode.textContent=detail;card.append(heading,valueNode,detailNode);grid.append(card);}status.textContent=readiness.overall==='degraded'?'Core runtime ready with limited availability':readiness.overall==='preparing'?'Preparing local engines…':'Local runtime status';const numeric=value=>{const match=String(value).match(/\d+/);return match?Math.max(0,Math.min(100,Number(match[0]))):0;};const metric=value=>{const match=String(value).match(/\d+/);return match?`${match[0]}%`:'—';};const railValues={cpu:metric(state.cpu),memory:metric(state.memory)};for(const [key,value] of Object.entries(railValues)){const node=doc.querySelector(`[data-rail-${key}]`);if(node)node.textContent=value;const bar=doc.querySelector(`[data-rail-${key}-bar]`);if(bar)bar.style.width=`${numeric(value)}%`;}const runtime=doc.querySelector('[data-rail-runtime]');if(runtime){runtime.textContent=readiness.overall==='preparing'?'STARTING':readiness.overall==='degraded'?'LIMITED':readiness.overall==='unavailable'?'OFFLINE':'LOCAL';runtime.parentElement.dataset.state=readiness.overall||'unknown';}if(widgetHud){const values={cpu:state.cpu,memory:state.memory,model:state.model,stt:state.engines.stt,tts:state.engines.tts,task:state.task};for(const [key,value] of Object.entries(values)){const node=widgetHud.querySelector(`[data-system-${key}]`);if(node)node.textContent=value;}const hudStatus=widgetHud.querySelector('#widget-system-hud-status');if(hudStatus)hudStatus.textContent=readiness.overall==='degraded'?'Runtime ready · limited availability':readiness.overall==='preparing'?'Preparing local engines…':'Local telemetry only · no external reporting';}};
  const poll=async()=>{if((section.hidden&&(!widgetHud||widgetHud.hidden)&&(!rail||!doc.body.classList.contains('widget')))||!win.desktop?.getSystemMetrics)return;const result=await win.desktop.getSystemMetrics();if(result?.ok)metrics=result;render();};
  const updatePolling=()=>{clearInterval(pollTimer);pollTimer=0;if(!section.hidden||(widgetHud&&!widgetHud.hidden)||(rail&&doc.body.classList.contains('widget'))){void poll();pollTimer=setInterval(poll,5000);}};
  const onMode=event=>{section.hidden=event.detail!=='system'||doc.body.classList.contains('widget');updatePolling();};
  const onHud=()=>updatePolling();
  const onRuntime=event=>{const payload=event.detail||{};if(payload.type==='readiness'||payload.readiness)readiness=payload.readiness||payload;if(payload.type==='config')config=payload.config||{};if(payload.type==='agent_state')task=payload.agentState||null;render();};
  const onTask=event=>{if(event.detail?.botId==='robot')task=event.detail;render();};
  win.addEventListener('myavatar:workspace-mode',onMode);win.addEventListener('myavatar:runtime-event',onRuntime);win.addEventListener('myavatar:agent-task',onTask);win.addEventListener('myavatar:system-hud',onHud);render();onMode({detail:doc.body.dataset.workspace||'coding'});
  const api={snapshot:()=>systemTelemetryState({readiness,config,task,metrics}),dispose(){clearInterval(pollTimer);win.removeEventListener('myavatar:workspace-mode',onMode);win.removeEventListener('myavatar:runtime-event',onRuntime);win.removeEventListener('myavatar:agent-task',onTask);win.removeEventListener('myavatar:system-hud',onHud);section.remove();delete win.__myavatarSystemCockpit;}};
  win.__myavatarSystemCockpit=api;return api;
}
