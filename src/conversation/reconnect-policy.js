export const RECONNECT_DELAYS_MS=Object.freeze([500,1000,2000,4000,8000,15000]);

export function reconnectDelay(attempt){
  const index=Math.max(0,Math.min(RECONNECT_DELAYS_MS.length-1,Number.isFinite(attempt)?Math.floor(attempt):0));
  return RECONNECT_DELAYS_MS[index];
}
