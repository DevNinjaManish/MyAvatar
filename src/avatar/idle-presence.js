const EMOJI={curious:'🤔',relaxed:'😌'};
const BOT_IDLE={
  nova:{emotion:'curious',idleMs:28000,minimumGapMs:52000,visibleMs:1900},
  butler:{emotion:'relaxed',idleMs:38000,minimumGapMs:65000,visibleMs:1500},
  pixel:{emotion:'curious',idleMs:24000,minimumGapMs:42000,visibleMs:1500},
  luma:{emotion:'relaxed',idleMs:34000,minimumGapMs:60000,visibleMs:1800},
  robot:{emotion:'relaxed',idleMs:30000,minimumGapMs:50000,visibleMs:1500},
};

export function idleTuning(botId='nova'){
  return BOT_IDLE[botId]||BOT_IDLE.nova;
}

export class IdlePresence{
  constructor({idleMs=null,minimumGapMs=null,visibleMs=null}={}){
    this.idleMs=idleMs;this.minimumGapMs=minimumGapMs;this.visibleMs=visibleMs;
    this.lastActivity=0;this.lastReaction=-Infinity;this.botId='nova';this.state='IDLE';this.timer=null;
  }
  activity(now=performance.now()){this.lastActivity=now;}
  updateRuntime(event,now=performance.now()){
    if(event?.botId)this.botId=event.botId;
    if(event?.type==='state'&&typeof event.state==='string')this.state=event.state;
    if(['transcript','token','audio','greeting','config'].includes(event?.type))this.activity(now);
  }
  profile(){
    const authored=idleTuning(this.botId);
    return {
      ...authored,
      idleMs:this.idleMs??authored.idleMs,
      minimumGapMs:this.minimumGapMs??authored.minimumGapMs,
      visibleMs:this.visibleMs??authored.visibleMs,
    };
  }
  shouldReact(now=performance.now()){
    const profile=this.profile();
    return this.state==='IDLE'&&now-this.lastActivity>=profile.idleMs&&now-this.lastReaction>=profile.minimumGapMs;
  }
  reaction(now=performance.now()){
    if(!this.shouldReact(now))return null;
    this.lastReaction=now;
    const profile=this.profile();
    return {botId:this.botId,emotion:profile.emotion,emoji:EMOJI[profile.emotion],visibleMs:profile.visibleMs};
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
