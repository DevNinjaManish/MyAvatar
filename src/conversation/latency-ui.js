const LABELS={
  speech_received_to_stt_ms:'STT',
  stt_to_first_token_ms:'First token',
  first_chunk_ready_ms:'First speech chunk',
  first_tts_ms:'First TTS synth',
  server_first_audio_ms:'Server first audio'
};

export function formatLatencyBreakdown(metrics={}){
  return Object.entries(LABELS)
    .filter(([key])=>Number.isFinite(metrics[key]))
    .map(([key,label])=>`${label}: ${(metrics[key]/1000).toFixed(2)}s`)
    .join(' · ');
}

export function mountLatencyUI(win=window,doc=document){
  let last='';
  const onRuntime=event=>{
    const payload=event.detail;
    if(payload?.type!=='metrics')return;
    const detail=formatLatencyBreakdown(payload.metrics||{});
    if(!detail)return;
    last=detail;
    queueMicrotask(()=>{
      const node=doc.getElementById('metrics');
      if(!node||!last)return;
      const current=node.textContent||'';
      if(!current.includes('First speech chunk'))node.textContent=current?`${current} · ${last}`:last;
      node.title='Local voice latency breakdown. Lower is faster.';
    });
  };
  win.addEventListener('myavatar:runtime-event',onRuntime);
  return {dispose(){win.removeEventListener('myavatar:runtime-event',onRuntime);}};
}
