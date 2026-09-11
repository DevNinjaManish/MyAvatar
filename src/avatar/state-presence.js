const DURATIONS={IDLE:.30,LISTENING:.20,THINKING:.26,SPEAKING:.16};

export function stateTransitionDuration(state,{reducedMotion=false}={}){
  if(reducedMotion)return .01;
  return DURATIONS[state]??.26;
}

export function motionScaleForState(state){
  if(state==='SPEAKING')return 1;
  if(state==='LISTENING')return .92;
  if(state==='THINKING')return .86;
  return .72;
}
