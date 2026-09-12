import {turnPlayback} from '../audio/turn-playback.js';
import {suspendActiveLiveCapture} from '../audio/engine.js';

export const RUNTIME_EVENT_VERSION=1;
const BOT_TRANSITION_TYPES=new Set(['config']);
const APPROVAL_DECISIONS=new Set(['allow_once','deny']);

export class RuntimeEventGate{
  constructor(){this.sessionId=null;this.sequence=0;this.botId=null;this.typed=false;}
  accept(event){
    if(!event||typeof event!=='object')return false;
    const typed=Number.isInteger(event.runtimeVersion)&&typeof event.sessionId==='string'&&Number.isInteger(event.sequence)&&typeof event.botId==='string';
    if(!typed)return !this.typed;
    if(event.runtimeVersion!==RUNTIME_EVENT_VERSION||event.sequence<=0||!event.sessionId||!event.botId)return false;
    this.typed=true;
    if(this.sessionId===null){
      if(!['readiness','config'].includes(event.type))return false;
      this.sessionId=event.sessionId;this.sequence=0;this.botId=event.botId;
    }
    if(event.sessionId!==this.sessionId||event.sequence<=this.sequence)return false;
    if(BOT_TRANSITION_TYPES.has(event.type))this.botId=event.botId;
    else if(this.botId!==null&&event.botId!==this.botId)return false;
    this.sequence=event.sequence;
    return true;
  }
}

export function noteClientMessage(data,win){
  if(typeof data!=='string')return;
  try{
    const message=JSON.parse(data);
    if(['turn','voice'].includes(message?.type)){
      // Voice capture stays allocated in live mode, but its gate must close for
      // every outgoing turn, including typed turns. This prevents background
      // audio from starting a second turn while the first is still processing.
      suspendActiveLiveCapture();
      turnPlayback.beginTurn(message.turn);
    }else if(message?.type==='stop')turnPlayback.cancelTurn();
    win.dispatchEvent(new CustomEvent('myavatar:client-message',{detail:message}));
  }catch{}
}

export function validApprovalDecision(detail){
  return Boolean(detail&&typeof detail.requestId==='string'&&detail.requestId.length>0&&detail.requestId.length<=128&&APPROVAL_DECISIONS.has(detail.decision));
}

/** Install before the future conversation service creates the socket. It filters obsolete runtime events
 * and coordinates turn/audio freshness without deriving authority from prose.
 */
export function installRuntimeEventGuard(win=window){
  if(win.__myavatarRuntimeGuardInstalled)return;
  const NativeWebSocket=win.WebSocket;
  if(typeof NativeWebSocket!=='function')return;
  win.__myavatarRuntimeGuardInstalled=true;
  win.WebSocket=new Proxy(NativeWebSocket,{
    construct(Target,args,newTarget){
      const socket=Reflect.construct(Target,args,newTarget===win.WebSocket?Target:newTarget);
      const gate=new RuntimeEventGate();
      const nativeSend=socket.send.bind(socket);
      socket.send=data=>{noteClientMessage(data,win);return nativeSend(data);};
      const decide=event=>{
        if(socket.readyState!==NativeWebSocket.OPEN||!validApprovalDecision(event.detail))return;
        socket.send(JSON.stringify({type:'action_decision',requestId:event.detail.requestId,decision:event.detail.decision}));
      };
      win.addEventListener('myavatar:approval-decision',decide);
      socket.addEventListener('message',event=>{
        let payload;
        try{payload=JSON.parse(event.data);}catch{return;}
        if(!gate.accept(payload)){event.stopImmediatePropagation();return;}
        if(Number.isInteger(payload.turn)&&payload.turn!==turnPlayback.activeTurn){event.stopImmediatePropagation();return;}
        turnPlayback.noteServerEvent(payload);
        win.dispatchEvent(new CustomEvent('myavatar:runtime-event',{detail:payload}));
        if(payload.readiness&&typeof payload.readiness==='object'){
          win.dispatchEvent(new CustomEvent('myavatar:readiness',{detail:payload.readiness}));
        }
        if(payload.type==='action_request')event.stopImmediatePropagation();
      },{capture:true});
      socket.addEventListener('close',()=>{
        win.removeEventListener('myavatar:approval-decision',decide);
        turnPlayback.cancelTurn();
        win.dispatchEvent(new CustomEvent('myavatar:socket-close'));
      },{once:true});
      return socket;
    }
  });
}
