export function installSocketBridge(win=window){
  if(win.__myAvatarSocketBridgeInstalled)return;
  const Native=win.WebSocket;
  class BridgedWebSocket extends Native{
    constructor(...args){
      super(...args);
      win.__myAvatarSocket=this;
    }
  }
  for(const key of ['CONNECTING','OPEN','CLOSING','CLOSED'])Object.defineProperty(BridgedWebSocket,key,{value:Native[key]});
  win.WebSocket=BridgedWebSocket;
  win.__myAvatarSocketBridgeInstalled=true;
}
