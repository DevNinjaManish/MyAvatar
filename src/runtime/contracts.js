export const RUNTIME_EVENT_VERSION=1;

export const EVENT_TYPES=Object.freeze([
  'config','profile','readiness','health','greeting','recognizing','recognition','token','transcript','audio','speech_unavailable','done','error',
  'context','memory','capability','delegation','job','action_request','action_result'
]);

const EVENT_TYPE_SET=new Set(EVENT_TYPES);

export function createRuntimeEvent(type,detail={},identity={}){
  if(!EVENT_TYPE_SET.has(type))throw new Error(`Unknown runtime event type: ${type}`);
  if(!identity.sessionId||!identity.botId)throw new Error('Runtime event identity is required.');
  return Object.freeze({
    runtimeVersion:RUNTIME_EVENT_VERSION,
    sessionId:identity.sessionId,
    sequence:identity.sequence,
    botId:identity.botId,
    type,
    ...detail
  });
}

export function isRuntimeEvent(value){
  return Boolean(value&&typeof value==='object'&&value.runtimeVersion===RUNTIME_EVENT_VERSION&&
    typeof value.sessionId==='string'&&value.sessionId.length>0&&Number.isInteger(value.sequence)&&value.sequence>0&&
    typeof value.botId==='string'&&value.botId.length>0&&EVENT_TYPE_SET.has(value.type));
}

export function createDelegationEnvelope({requestingBot,specialistBot,goal,contextRefs=[],permissions=[],expectedOutput='result',deadline=null}){
  if(!requestingBot||!specialistBot||!goal)throw new Error('Delegation requires requesting bot, specialist bot, and goal.');
  if(requestingBot===specialistBot)throw new Error('A bot cannot delegate to itself.');
  return Object.freeze({requestingBot,specialistBot,goal,contextRefs:[...contextRefs],permissions:[...permissions],expectedOutput,deadline});
}
