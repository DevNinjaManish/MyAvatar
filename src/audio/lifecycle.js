import {endActiveCapture,getActiveCaptureSnapshot} from './engine.js';

export function captureAction(action,snapshot=getActiveCaptureSnapshot()){
  if(!snapshot?.active)return 'none';
  if(action==='end-conversation')return 'end';
  if(action==='full-mic-click'&&snapshot.mode==='live')return 'end';
  if(action==='disconnect'||action==='unload')return 'end';
  return 'none';
}

export function installCaptureLifecycleGuards(win=window,doc=document){
  if(win.__myavatarCaptureLifecycleInstalled)return;
  win.__myavatarCaptureLifecycleInstalled=true;
  const endFor=action=>{if(captureAction(action)==='end')endActiveCapture();};
  doc.getElementById('widget-end-conversation')?.addEventListener('click',()=>endFor('end-conversation'),{capture:true});
  doc.getElementById('mic')?.addEventListener('click',()=>endFor('full-mic-click'),{capture:true});
  win.addEventListener('myavatar:socket-close',()=>endFor('disconnect'));
  win.addEventListener('beforeunload',()=>endFor('unload'));
}
