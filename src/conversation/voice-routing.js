const COMPLEX_REQUEST=/\b(?:compare|explain|analyse|analyze|research|investigate|plan|strategy|write|code|debug|design|architect|review|refactor|summari[sz]e|calculate|prove|reason|why|how does|what is|help me)\b/i;

/** Select 9B for work that benefits from additional reasoning; 4B handles chat. */
export function useComplexConversationModel(text){
  const value=String(text||'').trim();
  const words=value.split(/\s+/u).filter(Boolean);
  return COMPLEX_REQUEST.test(value)||words.length>60;
}

// Zipformer may make only harmless, latency-sensitive control decisions. All
// conversational text, including ordinary English, is verified by Whisper.
export function immediateVoiceCommand(text){
  const value=String(text||'').trim().toLowerCase().replace(/[.!?]+$/,'');
  return /^(?:stop|cancel|stop talking|be quiet|never mind|nevermind)$/.test(value)?'stop':null;
}
