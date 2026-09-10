export function dualSpeakerLevels(level=0,time=0,{reducedMotion=false}={}){
  const amplitude=Number.isFinite(level)?Math.max(0,Math.min(1,level)):0;
  if(amplitude<=0)return {left:[0,0,0],right:[0,0,0]};
  const phase=Number.isFinite(time)?time:0;
  const motion=reducedMotion?0:1;
  const shape=(index,side)=>{
    const carrier=.56+.44*Math.abs(Math.sin(phase*(7.1+index*.5)+index*1.17+side*.83))*motion;
    const reduced=reducedMotion?.78:carrier;
    return Math.max(.12,Math.min(1,amplitude*(.45+reduced*.75)));
  };
  return {
    left:[0,1,2].map(index=>shape(index,0)),
    right:[0,1,2].map(index=>shape(index,1)),
  };
}

export function equalizerActive(state,level){
  return state==='SPEAKING'&&Number.isFinite(level)&&level>.015;
}
