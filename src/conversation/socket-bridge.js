export function installSocketBridge(win=window){
  if(win.__myAvatarSocketBridgeInstalled)return;
  const Native=win.WebSocket;
  const Base=win.EventTarget||EventTarget;
  const makeEvent=(type,source={})=>{
    const event=type==='message'
      ? new (win.MessageEvent||MessageEvent)('message',{data:source.data,origin:source.origin||'',lastEventId:source.lastEventId||''})
      : new (win.Event||Event)(type);
    for(const key of ['code','reason','wasClean']){
      if(source[key]!==undefined)Object.defineProperty(event,key,{value:source[key],enumerable:true});
    }
    return event;
  };
  class BridgedWebSocket extends Base{
    constructor(url,protocols){
      super();this.url=String(url);this.protocols=protocols;this.readyState=Native.CONNECTING;this.bufferedAmount=0;this.extensions='';this.protocol='';this.binaryType='blob';this._native=null;this._closed=false;this._attempt=0;this._timer=0;this._handlers={};win.__myAvatarSocket=this;this._connect();
    }
    _connect(){
      if(this._closed)return;
      clearTimeout(this._timer);this.readyState=Native.CONNECTING;
      let native;
      try{native=this.protocols===undefined?new Native(this.url):new Native(this.url,this.protocols);}catch(error){this._scheduleReconnect(error);return;}
      this._native=native;
      try{native.binaryType=this.binaryType;}catch{}
      native.addEventListener('open',event=>{if(this._native!==native||this._closed)return;this.readyState=Native.OPEN;this._attempt=0;this.extensions=native.extensions||'';this.protocol=native.protocol||'';this.dispatchEvent(makeEvent('open',event));});
      native.addEventListener('message',event=>{if(this._native===native&&!this._closed)this.dispatchEvent(makeEvent('message',event));});
      native.addEventListener('error',event=>{if(this._native===native&&!this._closed)this.dispatchEvent(makeEvent('error',event));});
      native.addEventListener('close',event=>{if(this._native!==native)return;this.readyState=Native.CLOSED;this.dispatchEvent(makeEvent('close',event));if(!this._closed)this._scheduleReconnect();});
    }
    _scheduleReconnect(error){
      if(this._closed)return;
      this.readyState=Native.CONNECTING;const delay=Math.min(5000,250*(2**Math.min(this._attempt,4)));this._attempt++;
      try{win.dispatchEvent?.(new CustomEvent('myavatar:socket-reconnecting',{detail:{attempt:this._attempt,delay,error:String(error?.message||'')}}));}catch{}
      this._timer=setTimeout(()=>this._connect(),delay);
    }
    send(data){if(this.readyState!==Native.OPEN||!this._native)throw new Error('Local service is reconnecting. Try again in a moment.');return this._native.send(data);}
    close(code,reason){this._closed=true;clearTimeout(this._timer);if(this._native&&this.readyState<Native.CLOSING){this.readyState=Native.CLOSING;this._native.close(code,reason);}else this.readyState=Native.CLOSED;}
    _setHandler(type,handler){const current=this._handlers[type];if(current)this.removeEventListener(type,current);if(typeof handler==='function'){this._handlers[type]=handler;this.addEventListener(type,handler);}else delete this._handlers[type];}
    _getHandler(type){return this._handlers[type]||null;}
    set onopen(value){this._setHandler('open',value);}get onopen(){return this._getHandler('open');}
    set onmessage(value){this._setHandler('message',value);}get onmessage(){return this._getHandler('message');}
    set onerror(value){this._setHandler('error',value);}get onerror(){return this._getHandler('error');}
    set onclose(value){this._setHandler('close',value);}get onclose(){return this._getHandler('close');}
  }
  for(const key of ['CONNECTING','OPEN','CLOSING','CLOSED'])Object.defineProperty(BridgedWebSocket,key,{value:Native[key]});
  win.WebSocket=BridgedWebSocket;win.__myAvatarSocketBridgeInstalled=true;
}
