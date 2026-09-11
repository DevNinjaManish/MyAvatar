function summary(readiness){
  const caps=readiness?.capabilities||{};
  if(readiness?.overall==='preparing')return 'Preparing local engines…';
  if(!caps.chat)return 'Chat unavailable';
  if(caps.listen&&caps.speak)return 'Ready';
  if(caps.listen&&!caps.speak)return 'Chat ready · voice output unavailable';
  if(!caps.listen&&caps.speak)return 'Chat ready · microphone input unavailable';
  return 'Chat ready · voice unavailable';
}

export function mountReadinessUI(win=window,doc=document){
  let current=null;
  const $=id=>doc.getElementById(id);
  const apply=()=>{
    if(!current)return;
    const caps=current.capabilities||{};
    doc.body.dataset.runtimeReadiness=current.overall||'unknown';
    const text=summary(current);
    if($('status')&&$('status').textContent!==text)$('status').textContent=text;
    if($('widget-status')&&$('widget-status').textContent!==text)$('widget-status').textContent=text;
    const chatReady=!!caps.chat,listenReady=!!caps.listen;
    // Keep the hidden/full mic enabled when chat is available because existing
    // text submission still uses it as the general readiness gate. Voice clicks
    // are blocked below when STT is unavailable.
    if($('mic')&&$('mic').disabled===chatReady)$('mic').disabled=!chatReady;
    if($('widget-mic')){
      const disabled=!chatReady||!listenReady;
      if($('widget-mic').disabled!==disabled)$('widget-mic').disabled=disabled;
      const ariaDisabled=String(!listenReady);
      if($('widget-mic').getAttribute('aria-disabled')!==ariaDisabled)$('widget-mic').setAttribute('aria-disabled',ariaDisabled);
    }
  };
  const onReadiness=event=>{current=event.detail;apply();};
  const blockVoice=event=>{
    if(current?.capabilities?.listen!==false)return;
    if(event.target?.closest?.('#mic,#widget-mic')){
      event.preventDefault();event.stopImmediatePropagation();apply();
    }
  };
  win.addEventListener('myavatar:readiness',onReadiness);
  doc.addEventListener('click',blockVoice,true);
  const observer=new MutationObserver(apply);
  if($('status')?.parentElement)observer.observe($('status').parentElement,{subtree:true,childList:true,characterData:true});
  return {dispose(){win.removeEventListener('myavatar:readiness',onReadiness);doc.removeEventListener('click',blockVoice,true);observer.disconnect();}};
}
