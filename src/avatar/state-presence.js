const DURATIONS={IDLE:.30,LISTENING:.20,THINKING:.26,SPEAKING:.16,WORKING:.32,PAUSED:.40,SLEEPING:.65,ERROR:.12,RECOVERY:.55};

export function stateTransitionDuration(state,{reducedMotion=false}={}){
  if(reducedMotion)return .01;
  return DURATIONS[state]??.26;
}

export function motionScaleForState(state){
  if(state==='SLEEPING')return .04;
  if(state==='PAUSED')return .08;
  if(state==='ERROR')return .22;
  if(state==='RECOVERY')return .48;
  if(state==='WORKING')return .62;
  if(state==='SPEAKING')return 1;
  if(state==='LISTENING')return .92;
  if(state==='THINKING')return .86;
  return .72;
}
