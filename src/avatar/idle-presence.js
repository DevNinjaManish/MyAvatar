const EMOJI={curious:'🤔',relaxed:'😌'};
const BOT_IDLE={nova:'curious',butler:'relaxed',pixel:'curious',luma:'relaxed',robot:'relaxed'};

export class IdlePresence{
  constructor({idleMs=30000,minimumGapMs=45000,visibleMs=1800}={}){
    this.idleMs=idleMs;this.minimumGapMs=minimumGapMs;this.visibleMs=visibleMs;
    this.lastActivity=0;this.lastReaction=-Infinity;this.botId='nova';this.state='IDLE';this.timer=null;
  }
  activity(now=performance.now()){this.lastActivity=now;}
  updateRuntime(event,now=performance.now()){
    if(event?.botId)this.botId=event.botId;
    if(event?.type==='state'&&typeof event.state==='string')this.state=event.state;
    if(['transcript','token','audio','greeting','config'].includes(event?.type))this.activity(now);
  }
  shouldReact(now=performance.now()){
    return this.state==='IDLE'&&now-this.lastActivity>=this.idleMs&&now-this.lastReaction>=this.minimumGapMs;
  }
  reaction(now=performance.now()){
    if(!this.shouldReact(now))return null;
    this.lastReaction=now;
    const emotion=BOT_IDLE[this.botId]||'relaxed';
    return {botId:this.botId,emotion,emoji:EMOJI[emotion],visibleMs:this.visibleMs};
  }
}

export function mountIdlePresence(win=window,doc=document,{clock=()=>performance.now(),setIntervalFn=setInterval,clearIntervalFn=clearInterval}={}){
  const presence=new IdlePresence();presence.activity(clock());
  const userActivity=()=>presence.activity(clock());
  for(const type of ['pointerdown','keydown','input'])doc.addEventListener(type,userActivity,{passive:true});
  const onRuntime=event=>presence.updateRuntime(event.detail,clock());win.addEventListener('myavatar:runtime-event',onRuntime);
  const interval=setIntervalFn(()=>{
    const result=presence.reaction(clock());if(!result)return;
    const emoji=doc.getElementById('widget-emoji');if(!emoji)return;
    const previous=emoji.textContent,previousTitle=emoji.title;
    emoji.textContent=result.emoji;emoji.title=`${result.botId} · ${result.emotion}`;
    win.dispatchEvent(new CustomEvent('myavatar:idle-presence',{detail:result}));
    setTimeout(()=>{if(emoji.textContent===result.emoji){emoji.textContent=previous;emoji.title=previousTitle;}},result.visibleMs);
  },1000);
  return {presence,dispose(){clearIntervalFn(interval);win.removeEventListener('myavatar:runtime-event',onRuntime);for(const type of ['pointerdown','keydown','input'])doc.removeEventListener(type,userActivity);}};
}
