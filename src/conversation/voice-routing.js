// Zipformer may make only harmless, latency-sensitive control decisions. All
// conversational text, including ordinary English, is verified by Whisper.
export function immediateVoiceCommand(text){
  const value=String(text||'').trim().toLowerCase().replace(/[.!?]+$/,'');
  return /^(?:stop|cancel|stop talking|be quiet|never mind|nevermind)$/.test(value)?'stop':null;
}
