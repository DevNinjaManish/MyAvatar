const COMPLEX_REQUEST=/\b(?:compare|explain|analyse|analyze|research|plan|write|code|debug|design|summari[sz]e|why|how does|what is|help me)\b/i;

/**
 * Short, social spoken turns benefit more from immediate acknowledgement than
 * a larger reasoning model. Keep requests that imply work on the configured
 * profile model so this is a latency optimisation, not a capability downgrade.
 */
export function useFastVoiceModel(text,{speaking=false}={}){
  if(!speaking)return false;
  const words=String(text||'').trim().split(/\s+/u).filter(Boolean);
  return words.length>0&&words.length<=14&&!COMPLEX_REQUEST.test(text);
}
