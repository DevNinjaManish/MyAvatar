const timeOfDay=hour=>hour<12?'morning':hour<17?'afternoon':hour<21?'evening':'night';
const cleanTopic=value=>String(value||'').replace(/\s+/g,' ').trim().replace(/[.?!]+$/,'').slice(0,88);

export function contextualGreeting({now=new Date(),recentTopic='',previousGreeting=''}={}){
  const period=timeOfDay(now.getHours());
  const topic=cleanTopic(recentTopic);
  const candidates=topic
    ? [`Good ${period}. Last time we were exploring ${topic}. Want to continue from there?`,`Good ${period}. We left off with ${topic}. Shall we pick that up, or begin somewhere new?`,`Welcome back this ${period}. ${topic} was on your mind last time—where would you like to take it?`]
    : [`Good ${period}. What would feel most useful to talk through?`,`Hello this ${period}. I’m here and listening—what’s on your mind?`,`Good ${period}. Where should we begin today?`];
  return candidates.find(candidate=>candidate!==previousGreeting)||candidates[0];
}
