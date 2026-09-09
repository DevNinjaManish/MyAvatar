import {turnPlayback} from '../audio/turn-playback.js';

export const RUNTIME_EVENT_VERSION=1;
const BOT_TRANSITION_TYPES=new Set(['config']);

export class RuntimeEventGate{
  constructor(){this.sessionId=null;this.sequence=0;this.botId=null;this.typed=false;}
  accept(event){
    if(!event||typeof event!=='object')return false;
    const typed=Number.isInteger(event.runtimeVersion)&&typeof event.sessionId==='string'&&Number.isInteger(event.sequence)&&typeof event.botId==='string';
    if(!typed)return !this.typed;
    if(event.runtimeVersion!==RUNTIME_EVENT_VERSION||event.sequence<=0||!event.sessionId||!event.botId)return false;
    this.typed=true;
    if(this.sessionId===null){
      if(event.type!=='config')return false;
      this.sessionId=event.sessionId;this.sequence=0;this.botId=event.botId;
    }
    if(event.sessionId!==this.sessionId||event.sequence<=this.sequence)return false;
    if(BOT_TRANSITION_TYPES.has(event.type))this.botId=event.botId;
    else if(this.botId!==null&&event.botId!==this.botId)return false;
    this.sequence=event.sequence;
    return true;
  }
}

function noteClientMessage(data){
  if(typeof data!=='string')return;
  try{
    const message=JSON.parse(data);
    if(message?.type==='turn')turnPlayback.beginTurn(message.turn);
    else if(message?.type==='stop')turnPlayback.cancelTurn();
  }catch{}
}

/** Install before main.js creates the socket. It filters obsolete runtime events
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
      socket.send=data=>{noteClientMessage(data);return nativeSend(data);};
      socket.addEventListener('message',event=>{
        let payload;
        try{payload=JSON.parse(event.data);}catch{return;}
        if(!gate.accept(payload)){event.stopImmediatePropagation();return;}
        turnPlayback.noteServerEvent(payload);
        if(payload.readiness&&typeof payload.readiness==='object'){
          win.dispatchEvent(new CustomEvent('myavatar:readiness',{detail:payload.readiness}));
        }
      },{capture:true});
      socket.addEventListener('close',()=>{
        turnPlayback.cancelTurn();
        win.dispatchEvent(new CustomEvent('myavatar:socket-close'));
      },{once:true});
      return socket;
    }
  });
}
