import {endActiveCapture,getActiveCaptureSnapshot,resumeActiveLiveCapture} from './engine.js';

export function captureAction(action,snapshot=getActiveCaptureSnapshot()){
  if(!snapshot?.active)return 'none';
  if(action==='end-conversation')return 'end';
  if(action==='full-mic-click'&&snapshot.mode==='live')return 'end';
  if(action==='disconnect'||action==='unload')return 'end';
  return 'none';
}

export function shouldResumeAfterStop(snapshot=getActiveCaptureSnapshot(),muted=false){
  return !!snapshot?.active&&snapshot.mode==='live'&&!muted;
}

export function installCaptureLifecycleGuards(win=window,doc=document){
  if(win.__myavatarCaptureLifecycleInstalled)return;
  win.__myavatarCaptureLifecycleInstalled=true;
  const endFor=action=>{if(captureAction(action)==='end')endActiveCapture();};
  doc.getElementById('widget-end-conversation')?.addEventListener('click',()=>endFor('end-conversation'),{capture:true});
  doc.getElementById('mic')?.addEventListener('click',()=>endFor('full-mic-click'),{capture:true});
  doc.getElementById('stop')?.addEventListener('click',()=>{
    queueMicrotask(()=>{
      const muted=doc.getElementById('widget-mic')?.classList.contains('muted')||false;
      if(shouldResumeAfterStop(getActiveCaptureSnapshot(),muted)&&resumeActiveLiveCapture())win.appState?.set?.('LISTENING');
    });
  });
  win.addEventListener('myavatar:socket-close',()=>endFor('disconnect'));
  win.addEventListener('beforeunload',()=>endFor('unload'));
}
