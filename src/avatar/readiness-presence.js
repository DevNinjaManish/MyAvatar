const PRESENCE={
  sleeping:{label:'Powered down',icon:'◌'},
  charging:{label:'Charging up',icon:'⟳'},
  ready:{label:'Ready',icon:'●'},
  limited:{label:'Ready · limited',icon:'◐'},
  broken:{label:'Needs attention',icon:'!'},
};

export function readinessPresenceState(readiness={},eventType=''){
  if(eventType==='setup_error'||eventType==='error')return {...PRESENCE.broken,state:'broken'};
  if(eventType==='socket_close')return {...PRESENCE.sleeping,state:'sleeping'};
  const overall=readiness?.overall;
  if(overall==='ready')return {...PRESENCE.ready,state:'ready'};
  if(overall==='degraded')return {...PRESENCE.limited,state:'limited'};
  if(overall==='preparing'||overall==='pending')return {...PRESENCE.charging,state:'charging'};
  if(overall==='unavailable')return {...PRESENCE.broken,state:'broken'};
  return {...PRESENCE.sleeping,state:'sleeping'};
}

export function mountReadinessPresence(win=window,doc=document){
  if(win.__myavatarReadinessPresence)return win.__myavatarReadinessPresence;
  const stage=doc.getElementById('stage');
  if(!stage)return null;
  const badge=doc.createElement('div');badge.className='readiness-presence';badge.setAttribute('role','status');stage.append(badge);
  let current=readinessPresenceState();
  const render=()=>{stage.dataset.readinessPresence=current.state;badge.textContent=`${current.icon} ${current.label}`;badge.dataset.state=current.state;badge.title=current.label;};
  const onReadiness=event=>{current=readinessPresenceState(event.detail);render();};
  const onRuntime=event=>{const payload=event.detail||{};if(payload.readiness)current=readinessPresenceState(payload.readiness,payload.type);else if(['setup_error','error'].includes(payload.type))current=readinessPresenceState({},payload.type);render();};
  const onClose=()=>{current=readinessPresenceState({},'socket_close');render();};
  win.addEventListener('myavatar:readiness',onReadiness);win.addEventListener('myavatar:runtime-event',onRuntime);win.addEventListener('myavatar:socket-close',onClose);render();
  const api={snapshot:()=>({...current}),dispose(){win.removeEventListener('myavatar:readiness',onReadiness);win.removeEventListener('myavatar:runtime-event',onRuntime);win.removeEventListener('myavatar:socket-close',onClose);badge.remove();delete win.__myavatarReadinessPresence;}};
  win.__myavatarReadinessPresence=api;return api;
}
